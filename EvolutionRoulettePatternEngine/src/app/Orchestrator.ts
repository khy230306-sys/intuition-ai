import { randomUUID } from 'node:crypto';
import type { PatternRule } from '../core/patterns/PatternRule.js';
import { createSameColorReverseRule } from '../core/patterns/rules/SameColorReverseRule.js';
import { createSameColorChangeRule } from '../core/patterns/rules/SameColorChangeRule.js';
import { createAlternatingRule } from '../core/patterns/rules/AlternatingRule.js';
import { createRepeatingBlockRule } from '../core/patterns/rules/RepeatingBlockRule.js';
import { createCustomSequenceRule } from '../core/patterns/rules/CustomSequenceRule.js';
import { createSuppressSequenceRule } from '../core/patterns/rules/SuppressSequenceRule.js';
import { BettingEngine } from '../core/betting/BettingEngine.js';
import { parseResultSequence, resultFromNumber, createRoundId } from '../core/roulette/result.js';
import type {
  BetRequest,
  BetResult,
  CustomPatternDefinition,
  RouletteResult,
  RouletteSiteAdapter,
  TableInfo,
} from '../core/types.js';
import { Logger } from '../logging/Logger.js';
import type { ConfigStore } from '../storage/ConfigStore.js';
import type { SessionStore } from '../storage/SessionStore.js';
import { IdleActionSupervisor } from '../idle/IdleAction.js';

export function buildRulesFromConfig(store: ConfigStore): PatternRule[] {
  const c = store.get();
  const rules: PatternRule[] = [
    createSameColorReverseRule(c.sameColor),
    createSameColorChangeRule(c.sameColorChange),
    createAlternatingRule(c.alternating),
    createRepeatingBlockRule(c.repeatingBlock),
    ...c.customPatterns.map(createCustomSequenceRule),
    ...(c.suppressPatterns ?? []).map(createSuppressSequenceRule),
  ];
  return rules;
}

export class AppOrchestrator {
  readonly engine: BettingEngine;
  readonly logger: Logger;
  readonly idle: IdleActionSupervisor;
  private adapter: RouletteSiteAdapter | null = null;
  private table: TableInfo | null = null;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastSeenRoundId: string | null = null;

  constructor(
    private configStore: ConfigStore,
    private sessionStore: SessionStore,
    logDir: string,
  ) {
    this.logger = new Logger(logDir);
    const cfg = configStore.get().strategy;
    this.engine = new BettingEngine(cfg, buildRulesFromConfig(configStore), this.logger);
    this.idle = new IdleActionSupervisor(() => this.engine.getConfig().idleAction, this.logger);
  }

  reloadRules(): void {
    this.engine.patterns.setRules(buildRulesFromConfig(this.configStore));
    const strategy = this.configStore.get().strategy;
    this.engine.updateConfig(strategy);
    this.logger.info('RULES RELOADED');
  }

  setAdapter(adapter: RouletteSiteAdapter | null): void {
    this.adapter = adapter;
  }

  getAdapter(): RouletteSiteAdapter | null {
    return this.adapter;
  }

  getTable(): TableInfo | null {
    return this.table;
  }

  async connectAdapter(): Promise<TableInfo | null> {
    if (!this.adapter) return null;
    await this.adapter.connect();
    this.table = await this.adapter.detectTable();
    this.logger.info(`TABLE ${this.table.tableName} confirmed=${this.table.confirmed}`);
    return this.table;
  }

  start(): void {
    this.engine.start();
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.engine.stop();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  resetSession(): void {
    this.engine.resetSession();
    this.lastSeenRoundId = null;
  }

  setMode(mode: 'DRY_RUN' | 'REAL'): void {
    if (mode === 'REAL') {
      this.logger.warn('REAL MODE ENABLED — live bets only when all safety checks pass');
    }
    this.engine.setMode(mode);
    this.configStore.update({ strategy: { ...this.configStore.get().strategy, mode } });
  }

  /** Manual / replay injection of a single result. */
  injectResult(result: RouletteResult) {
    return this.engine.processResult(result);
  }

  injectNumber(n: number) {
    return this.injectResult(resultFromNumber(n, { source: 'manual' }));
  }

  /**
   * Replay simulation: step through results one by one.
   * Bet signal for round n uses only results 1..n-1 (via processResult flow:
   * previous pending settled against n; new signal from history including n for next).
   */
  replaySequence(input: string) {
    this.resetSession();
    this.start();
    const results = parseResultSequence(input);
    const lines: string[] = [];
    for (const r of results) {
      const { record } = this.engine.processResult(r);
      const signal = record.bet
        ? `SIGNAL → ${record.bet.color === 'R' ? 'RED' : 'BLACK'}`
        : record.noBetReason
          ? `NO_BET ${record.noBetReason}`
          : 'WAIT';
      const outcome =
        record.betOutcome && record.betOutcome !== 'NONE' ? ` ${record.betOutcome}` : '';
      const match = record.decision.match ? ' PATTERN_MATCH' : '';
      lines.push(
        `ROUND ${record.index} ${r.color}${match} ${signal}${outcome} state=${record.stateAfter}`,
      );
    }
    return { lines, records: this.engine.getSessionRecords(), snapshot: this.engine.snapshot() };
  }

  saveCurrentSession(label = 'session'): string {
    const id = randomUUID();
    this.sessionStore.save({
      id,
      createdAt: new Date().toISOString(),
      label,
      records: this.engine.getSessionRecords(),
    });
    return id;
  }

  /** Safety-gated bet placement through adapter. */
  async maybePlaceLiveBet(request: BetRequest): Promise<BetResult> {
    const checks = await this.safetyChecks(request);
    if (!checks.ok) {
      this.logger.info(`NO_BET ${checks.reason}`);
      return {
        ok: false,
        dryRun: true,
        placed: false,
        message: checks.reason,
        request: { ...request, dryRun: true },
      };
    }

    if (this.engine.getMode() === 'DRY_RUN' || request.dryRun) {
      this.logger.info(
        `DRY_RUN BET ${request.color} amount=${request.amount} stage=${request.martingaleStage} rule=${request.ruleId}`,
      );
      return {
        ok: true,
        dryRun: true,
        placed: false,
        message: 'Dry run — no chips clicked',
        request: { ...request, dryRun: true },
      };
    }

    if (!this.adapter?.placeBet) {
      return {
        ok: false,
        dryRun: false,
        placed: false,
        message: 'Adapter does not support placeBet',
        request,
      };
    }

    return this.adapter.placeBet(request);
  }

  private async safetyChecks(
    request: BetRequest,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.engine.getMode() === 'DRY_RUN') {
      // dry run still "ok" for recording
      return { ok: true };
    }
    if (!this.table?.confirmed) return { ok: false, reason: 'TABLE_NOT_CONFIRMED' };
    if (this.engine.rest.isResting()) return { ok: false, reason: 'RESTING' };
    if (this.engine.sm.getState() === 'STOPPED') return { ok: false, reason: 'STOPPED' };
    if (!request.color || request.amount <= 0) return { ok: false, reason: 'INVALID_AMOUNT' };
    if (!request.ruleId) return { ok: false, reason: 'INVALID_SIGNAL' };

    if (this.adapter?.isBettingOpen) {
      const open = await this.adapter.isBettingOpen();
      if (!open) return { ok: false, reason: 'BETTING_CLOSED' };
    }
    if (this.adapter?.getBalance) {
      const bal = await this.adapter.getBalance();
      if (bal === null) return { ok: false, reason: 'BALANCE_UNVERIFIED' };
      if (bal < request.amount) return { ok: false, reason: 'BALANCE_UNVERIFIED' };
    }
    return { ok: true };
  }

  startPolling(intervalMs = 1500): void {
    if (!this.adapter) throw new Error('No adapter attached');
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.running = true;
    this.engine.start();
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, intervalMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.running || !this.adapter) return;
    try {
      const latest = await this.adapter.readLatestResult();
      if (!latest) return;
      if (this.lastSeenRoundId === latest.roundId) return;
      this.lastSeenRoundId = latest.roundId;

      const { record } = this.engine.processResult(latest);
      if (record.bet) {
        await this.maybePlaceLiveBet(record.bet);
      }

      // Idle action (strategy-separated)
      const idle = this.idle.evaluate(this.engine.msSinceLastBet());
      if (idle.shouldWarn) {
        this.logger.warn(idle.message);
      }
    } catch (err) {
      this.logger.error(`POLL ERROR ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  upsertCustomPattern(pattern: CustomPatternDefinition): void {
    this.configStore.upsertCustomPattern(pattern);
    this.reloadRules();
  }

  deleteCustomPattern(id: string): void {
    this.configStore.deleteCustomPattern(id);
    this.reloadRules();
  }

  dashboard() {
    const snap = this.engine.snapshot();
    const cfg = this.configStore.get();
    return {
      table: this.table ?? {
        tableId: 'sim',
        tableName: 'Evolution Roulette (Simulation)',
        gameType: 'european-roulette',
        confirmed: false,
      },
      status: snap.state,
      mode: snap.mode,
      latest: snap.historyNumber,
      latestColors: snap.historyColor,
      pattern: snap.decision?.match
        ? {
            rule: snap.decision.match.ruleName,
            ruleId: snap.decision.match.ruleId,
            sequence: snap.decision.match.matchedSequence,
            confidence: snap.decision.match.confidence,
            metadata: snap.decision.match.metadata,
          }
        : null,
      signal: snap.lastSignal
        ? `${snap.lastSignal.color === 'R' ? 'RED' : 'BLACK'}`
        : 'NO BET',
      signalDetail: snap.lastSignal,
      martingale: {
        stage: snap.martingaleStage,
        max: snap.maxStage,
        amount: snap.martingaleAmount,
        ladder: this.engine.martingale.ladder(),
      },
      rest: snap.restRemaining,
      session: snap.sessionUnits,
      conflicts: snap.conflicts,
      stoppedReason: snap.stoppedReason,
      stats: this.engine.sessionStats.snapshot(),
      ruleStats: this.engine.ruleStats.all(),
      zeroHandling: cfg.strategy.zeroHandling,
      idleAction: cfg.strategy.idleAction,
      rules: this.engine.patterns.getRules().map((r) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        priority: r.priority,
        onWin: r.onWin,
        onLoss: r.onLoss,
        restRoundsAfterLoss: r.restRoundsAfterLoss,
      })),
      customPatterns: cfg.customPatterns,
      config: cfg,
    };
  }
}

export { createRoundId };
