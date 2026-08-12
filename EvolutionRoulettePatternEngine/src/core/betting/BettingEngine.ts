import type {
  BetColor,
  BetRequest,
  EngineState,
  LossAction,
  PatternDecision,
  PatternMatch,
  RouletteResult,
  RunMode,
  SessionRoundRecord,
  StrategyConfig,
  WinAction,
} from '../types.js';
import { PatternEngine } from '../patterns/PatternEngine.js';
import type { PatternRule } from '../patterns/PatternRule.js';
import { RouletteHistory } from '../roulette/history.js';
import { createRoundId } from '../roulette/result.js';
import { MartingaleEngine } from './MartingaleEngine.js';
import { RestEngine } from './RestEngine.js';
import { BettingStateMachine } from '../state/BettingStateMachine.js';
import type { Logger } from '../../logging/Logger.js';
import { RuleStatsTracker, SessionStats } from '../stats/Stats.js';

export interface BettingEngineSnapshot {
  state: EngineState;
  mode: RunMode;
  historyNumber: string;
  historyColor: string;
  decision: PatternDecision | null;
  martingaleStage: number;
  martingaleAmount: number;
  maxStage: number;
  restRemaining: number;
  sessionUnits: number;
  lastSignal: { color: BetColor; ruleId: string; amount: number } | null;
  conflicts: PatternMatch[];
  stoppedReason: string | null;
  lastBetRoundId: string | null;
}

export interface ProcessResultOutcome {
  record: SessionRoundRecord;
  snapshot: BettingEngineSnapshot;
}

/**
 * Orchestrates Pattern Engine + State Machine + Martingale + Rest.
 * Pattern decides WHEN/WHICH color; Martingale decides HOW MUCH — fully separated.
 */
export class BettingEngine {
  readonly history: RouletteHistory;
  readonly patterns: PatternEngine;
  readonly martingale: MartingaleEngine;
  readonly rest: RestEngine;
  readonly sm: BettingStateMachine;
  readonly ruleStats: RuleStatsTracker;
  readonly sessionStats: SessionStats;

  private mode: RunMode;
  private lastDecision: PatternDecision | null = null;
  private pendingBet: BetRequest | null = null;
  private lastBetRoundId: string | null = null;
  private betRounds = new Set<string>();
  private stoppedReason: string | null = null;
  private continueActive: {
    ruleId: string;
    color: BetColor;
    mode: 'SAME' | 'OPPOSITE';
  } | null = null;
  private sessionRecords: SessionRoundRecord[] = [];
  private lastBetAt = 0;

  constructor(
    private config: StrategyConfig,
    rules: PatternRule[],
    private logger: Logger,
  ) {
    this.history = new RouletteHistory(config.historyLimit);
    this.patterns = new PatternEngine(rules);
    this.martingale = new MartingaleEngine(config.martingale);
    this.rest = new RestEngine(config.defaultRestRounds);
    this.sm = new BettingStateMachine();
    this.ruleStats = new RuleStatsTracker();
    this.sessionStats = new SessionStats();
    this.mode = config.mode;
  }

  getConfig(): StrategyConfig {
    return this.config;
  }

  updateConfig(partial: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...partial, martingale: { ...this.config.martingale, ...(partial.martingale ?? {}) }, idleAction: { ...this.config.idleAction, ...(partial.idleAction ?? {}) } };
    this.martingale.updateConfig(this.config.martingale);
    this.rest.setDefaultRounds(this.config.defaultRestRounds);
    if (partial.mode) this.mode = partial.mode;
  }

  setMode(mode: RunMode): void {
    this.mode = mode;
    this.config.mode = mode;
    this.logger.info(`MODE ${mode}`);
  }

  getMode(): RunMode {
    return this.mode;
  }

  start(): void {
    this.sm.force('WAIT_PATTERN');
    this.stoppedReason = null;
    this.logger.info('ENGINE START → WAIT_PATTERN');
  }

  stop(): void {
    this.sm.force('STOPPED');
    this.pendingBet = null;
    this.logger.info('ENGINE STOPPED');
  }

  resetSession(): void {
    this.history.clear();
    this.martingale.reset();
    this.rest.clear();
    this.sm.reset();
    this.lastDecision = null;
    this.pendingBet = null;
    this.lastBetRoundId = null;
    this.betRounds.clear();
    this.stoppedReason = null;
    this.continueActive = null;
    this.sessionRecords = [];
    this.ruleStats.reset();
    this.sessionStats.reset();
    this.lastBetAt = 0;
    this.logger.info('SESSION RESET');
  }

  getSessionRecords(): SessionRoundRecord[] {
    return [...this.sessionRecords];
  }

  snapshot(): BettingEngineSnapshot {
    return {
      state: this.sm.getState(),
      mode: this.mode,
      historyNumber: this.history.formatNumberMode(),
      historyColor: this.history.formatColorMode(),
      decision: this.lastDecision,
      martingaleStage: this.martingale.getStage(),
      martingaleAmount: this.martingale.currentAmount(),
      maxStage: this.martingale.getConfig().maxStage,
      restRemaining: this.rest.getRemaining(),
      sessionUnits: this.sessionStats.netUnits,
      lastSignal: this.pendingBet
        ? {
            color: this.pendingBet.color,
            ruleId: this.pendingBet.ruleId,
            amount: this.pendingBet.amount,
          }
        : null,
      conflicts: this.lastDecision?.conflicts ?? [],
      stoppedReason: this.stoppedReason,
      lastBetRoundId: this.lastBetRoundId,
    };
  }

  /**
   * Ingest a new result. Uses ONLY history before this result for betting decision
   * on this round (no look-ahead). Settlement uses this result against pending bet.
   */
  processResult(result: RouletteResult): ProcessResultOutcome {
    if (this.history.hasRound(result.roundId)) {
      this.logger.warn(`NO_BET DUPLICATE_ROUND ${result.roundId}`);
      throw new Error(`Duplicate round: ${result.roundId}`);
    }

    const stateBefore = this.sm.getState();
    let betOutcome: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
    let noBetReason: string | undefined;
    let bet: BetRequest | undefined;
    let decision: PatternDecision = {
      match: null,
      betColor: null,
      conflicts: [],
      reason: 'PATTERN_NOT_READY',
    };

    this.logger.info(`RESULT ${result.number} ${result.color === 'R' ? 'RED' : result.color === 'B' ? 'BLACK' : 'ZERO'}`);

    if (result.color === 'Z') {
      this.sessionStats.recordZero();
    }

    // 1) Settle pending bet against THIS result (bet was decided from prior history)
    let restStartedThisRound = false;
    if (this.pendingBet && (stateBefore === 'WAIT_RESULT' || stateBefore === 'BETTING')) {
      bet = this.pendingBet;
      const won = this.evaluateWin(this.pendingBet.color, result);
      betOutcome = won ? 'WIN' : 'LOSS';
      const restingBefore = this.rest.isResting();
      this.settle(won, this.pendingBet, result);
      this.pendingBet = null;
      restStartedThisRound = !restingBefore && this.rest.isResting();
    }

    // 2) Push result into history AFTER settlement decision context was already fixed
    this.history.push(result);
    this.logger.info(`HISTORY ${this.history.formatColorMode(12)}`);

    // 3) Rest tick (analysis continues, no signals)
    // Do not consume a rest round on the same result that triggered REST.
    if (this.rest.isResting()) {
      if (!restStartedThisRound) {
        const finished = this.rest.tick();
        this.logger.info(`RESTING remaining=${this.rest.getRemaining()}`);
        if (finished) {
          this.logger.info('REST COMPLETE → WAIT_PATTERN');
          this.sm.force('WAIT_PATTERN');
          // fall through to pattern eval for next signal after rest ends
        } else {
          this.sm.force('REST');
          decision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
          this.lastDecision = decision;
          noBetReason = 'RESTING';
          return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
        }
      } else {
        this.logger.info(`REST START remaining=${this.rest.getRemaining()}`);
        this.sm.force('REST');
        decision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
        this.lastDecision = decision;
        noBetReason = 'RESTING';
        return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
      }
    }

    if (this.sm.getState() === 'STOPPED') {
      decision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
      this.lastDecision = decision;
      noBetReason = 'STOPPED';
      this.logger.info('NO_BET STOPPED');
      return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
    }

    // Ensure we're in a pattern-wait flow after settle
    if (['WIN', 'LOSS', 'IDLE'].includes(this.sm.getState())) {
      this.sm.force(this.rest.isResting() ? 'REST' : 'WAIT_PATTERN');
    }

    // 4) Continue-same-pattern path (e.g. alternating until loss)
    if (this.continueActive && !this.rest.isResting() && this.sm.getState() !== 'STOPPED') {
      const color = this.continueActive.color;
      decision = {
        match: {
          ruleId: this.continueActive.ruleId,
          ruleName: `continue:${this.continueActive.ruleId}`,
          confidence: 0.9,
          priority: 10_000,
          matchedSequence: [],
          startIndex: 0,
          endIndex: this.history.length - 1,
          nextExpectedColor: color,
          metadata: { continue: true },
        },
        betColor: color,
        conflicts: [],
      };
      this.lastDecision = decision;
      const placed = this.tryPlaceSignal(decision, result.roundId);
      if (!placed.ok) noBetReason = placed.reason;
      else bet = placed.bet;
      return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
    }

    // 5) Pattern evaluation — uses history INCLUDING current result to decide NEXT bet
    //    (signal applies to the upcoming round, not the one just observed)
    decision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
    this.lastDecision = decision;

    if (decision.conflicts.length > 0) {
      this.logger.warn(
        `PATTERN CONFLICT winner=${decision.match?.ruleId} others=${decision.conflicts.map((c) => c.ruleId).join(',')}`,
      );
    }

    if (!decision.betColor || !decision.match) {
      noBetReason = String(decision.reason ?? 'PATTERN_NOT_READY');
      this.logger.info(`NO_BET ${noBetReason}`);
      if (this.sm.getState() !== 'WAIT_PATTERN' && this.sm.getState() !== 'STOPPED') {
        this.sm.force('WAIT_PATTERN');
      }
      return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
    }

    this.logger.info(`RULE ${decision.match.ruleId} MATCHED`);
    this.logger.info(`SIGNAL ${decision.betColor === 'R' ? 'RED' : 'BLACK'}`);

    const placed = this.tryPlaceSignal(decision, result.roundId);
    if (!placed.ok) {
      noBetReason = placed.reason;
      this.logger.info(`NO_BET ${noBetReason}`);
    } else {
      bet = placed.bet;
    }

    return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
  }

  /**
   * Simulation helper: decide bet using ONLY history[0..n-1] for round n,
   * then apply result n for settlement. Used by replay tests to prove no look-ahead.
   */
  processResultNoLookahead(result: RouletteResult): ProcessResultOutcome {
    // Decide from current history (past only)
    const stateBefore = this.sm.getState();
    let decision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
    this.lastDecision = decision;

    let bet: BetRequest | undefined;
    let noBetReason: string | undefined;
    let betOutcome: 'WIN' | 'LOSS' | 'NONE' = 'NONE';

    if (this.history.hasRound(result.roundId)) {
      throw new Error(`Duplicate round: ${result.roundId}`);
    }

    this.logger.info(`RESULT ${result.number} ${colorName(result.color)}`);

    // Settle previous pending against this result first
    if (this.pendingBet) {
      bet = this.pendingBet;
      const won = this.evaluateWin(this.pendingBet.color, result);
      betOutcome = won ? 'WIN' : 'LOSS';
      this.settle(won, this.pendingBet, result);
      this.pendingBet = null;
    }

    if (result.color === 'Z') this.sessionStats.recordZero();

    // Rest handling
    if (this.rest.isResting()) {
      this.rest.tick();
      noBetReason = 'RESTING';
      this.history.push(result);
      if (!this.rest.isResting()) this.sm.force('WAIT_PATTERN');
      else this.sm.force('REST');
      decision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
      this.lastDecision = decision;
      return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
    }

    if (this.sm.getState() === 'STOPPED') {
      this.history.push(result);
      noBetReason = 'STOPPED';
      return this.finishRound(stateBefore, result, decision, bet, betOutcome, noBetReason);
    }

    // Signal for THIS round was based on history BEFORE push — already computed above
    // But wait: for no-lookahead test, bet on round n uses 1..n-1 only.
    // So we place signal BEFORE pushing, using pre-push decision.
    if (this.continueActive) {
      decision = {
        match: {
          ruleId: this.continueActive.ruleId,
          ruleName: `continue:${this.continueActive.ruleId}`,
          confidence: 0.9,
          priority: 10_000,
          matchedSequence: [],
          startIndex: 0,
          endIndex: Math.max(0, this.history.length - 1),
          nextExpectedColor: this.continueActive.color,
        },
        betColor: this.continueActive.color,
        conflicts: [],
      };
    }

    // If we didn't have a pending bet settled above, we may place a bet that applies to THIS result
    // only when using explicit "bet on current round" simulation mode.
    // Standard engine places bet for NEXT round. For strict no-lookahead verification of signals:
    // signal_n = f(history[0..n-1]).

    const signalDecision = decision;
    this.lastDecision = signalDecision;

    // Push after decision for next-iteration patterns
    this.history.push(result);

    // Evaluate win for a bet placed ON this round from prior signal
    // In standard flow, pending bet was from previous iteration.
    // Here we also open a new pending for the NEXT round based on updated history.
    if (['WIN', 'LOSS', 'IDLE'].includes(this.sm.getState())) {
      this.sm.force('WAIT_PATTERN');
    }

    const nextDecision = this.patterns.evaluate([...this.history.all], this.config.zeroHandling);
    this.lastDecision = nextDecision;

    if (nextDecision.betColor && nextDecision.match && !this.rest.isResting()) {
      const placed = this.tryPlaceSignal(nextDecision, createRoundId('pending'));
      if (placed.ok) {
        // pending bet awaits next result
      } else {
        noBetReason = placed.reason;
      }
    } else {
      noBetReason = String(nextDecision.reason ?? 'PATTERN_NOT_READY');
    }

    return this.finishRound(stateBefore, result, nextDecision, bet, betOutcome, noBetReason);
  }

  private tryPlaceSignal(
    decision: PatternDecision,
    tieRoundId: string,
  ): { ok: true; bet: BetRequest } | { ok: false; reason: string } {
    if (!decision.betColor || !decision.match) {
      return { ok: false, reason: 'PATTERN_NOT_READY' };
    }
    if (this.sm.getState() === 'STOPPED') return { ok: false, reason: 'STOPPED' };
    if (this.rest.isResting()) return { ok: false, reason: 'RESTING' };

    const amount = this.martingale.currentAmount();
    if (amount <= 0) return { ok: false, reason: 'INVALID_AMOUNT' };

    // Prevent duplicate bet for same decision round key
    const betKey = `${tieRoundId}:${decision.match.ruleId}:${decision.betColor}`;
    if (this.betRounds.has(betKey)) {
      return { ok: false, reason: 'DUPLICATE_ROUND' };
    }

    this.sm.force('SIGNAL_READY');
    this.sm.force('BETTING');

    const request: BetRequest = {
      roundId: createRoundId('bet'),
      color: decision.betColor,
      amount,
      martingaleStage: this.martingale.getStage(),
      ruleId: decision.match.ruleId,
      dryRun: this.mode === 'DRY_RUN',
    };

    this.betRounds.add(betKey);
    this.lastBetRoundId = request.roundId;
    this.pendingBet = request;
    this.lastBetAt = Date.now();
    this.sm.force('WAIT_RESULT');

    this.logger.info(
      `${request.dryRun ? 'DRY_RUN' : 'BET'} ${request.color === 'R' ? 'RED' : 'BLACK'} ${request.amount} stage=${request.martingaleStage} rule=${request.ruleId}`,
    );

    this.ruleStats.recordSignal(request.ruleId, decision.match.ruleName);
    return { ok: true, bet: request };
  }

  private evaluateWin(betColor: BetColor, result: RouletteResult): boolean {
    // ZERO while betting R/B = LOSS
    if (result.color === 'Z') return false;
    return result.color === betColor;
  }

  private settle(won: boolean, bet: BetRequest, result: RouletteResult): void {
    const units = won ? bet.amount : -bet.amount;
    this.sessionStats.recordBet(won, bet.amount, this.martingale.getStage());
    this.ruleStats.recordOutcome(bet.ruleId, won, bet.amount, this.martingale.getStage());

    if (won) {
      this.sm.force('WIN');
      this.logger.info('WIN');
      this.martingale.onWin();
      this.logger.info('MARTINGALE RESET');
      this.applyWinAction(bet.ruleId, bet.color);
    } else {
      this.sm.force('LOSS');
      this.logger.info(`LOSS (result=${result.number}${result.color})`);
      const mg = this.martingale.onLoss();
      if (mg.stopped) {
        this.stoppedReason = `Max martingale stage ${this.martingale.getConfig().maxStage} exceeded`;
        this.logger.warn(`MARTINGALE STOP: ${this.stoppedReason}`);
        this.continueActive = null;
        this.sm.force('STOPPED');
        return;
      }
      this.logger.info(`MARTINGALE STAGE ${mg.stage}`);
      this.applyLossAction(bet.ruleId);
    }
  }

  private applyWinAction(ruleId: string, betColor: BetColor): void {
    const rule = this.patterns.getRule(ruleId);
    const action: WinAction = rule?.onWin ?? 'WAIT_NEW_PATTERN';

    switch (action) {
      case 'CONTINUE_SAME_PATTERN':
        // Photo condition #3: 승리 시 같은 색 연속 배팅
        this.continueActive = { ruleId, color: betColor, mode: 'SAME' };
        this.sm.force('SIGNAL_READY');
        break;
      case 'CONTINUE':
      case 'CONTINUE_OPPOSITE':
        // Alternating / 승리시 반대색: next bet is opposite of the color we just won on
        this.continueActive = {
          ruleId,
          color: betColor === 'R' ? 'B' : 'R',
          mode: 'OPPOSITE',
        };
        this.sm.force('SIGNAL_READY');
        break;
      case 'REST':
        this.continueActive = null;
        this.rest.startRest(rule?.restRoundsAfterLoss ?? this.config.defaultRestRounds);
        this.sm.force('REST');
        break;
      case 'WAIT_PATTERN':
      case 'WAIT_NEW_PATTERN':
      default:
        this.continueActive = null;
        this.sm.force('WAIT_PATTERN');
        break;
    }
  }

  private applyLossAction(ruleId: string): void {
    this.continueActive = null;
    const rule = this.patterns.getRule(ruleId);
    const action: LossAction = rule?.onLoss ?? 'REST';
    const rounds = rule?.restRoundsAfterLoss ?? this.config.defaultRestRounds;

    switch (action) {
      case 'CONTINUE':
        this.sm.force('WAIT_PATTERN');
        break;
      case 'WAIT_PATTERN':
      case 'WAIT_NEW_PATTERN':
        this.sm.force('WAIT_PATTERN');
        break;
      case 'REST':
      default:
        this.rest.startRest(rounds);
        this.logger.info(`REST START ${rounds}`);
        this.sm.force('REST');
        break;
    }
  }

  private finishRound(
    stateBefore: EngineState,
    result: RouletteResult,
    decision: PatternDecision,
    bet: BetRequest | undefined,
    betOutcome: 'WIN' | 'LOSS' | 'NONE',
    noBetReason?: string,
  ): ProcessResultOutcome {
    const record: SessionRoundRecord = {
      index: this.sessionRecords.length + 1,
      result,
      stateBefore,
      stateAfter: this.sm.getState(),
      decision,
      bet,
      betOutcome,
      martingaleStage: this.martingale.getStage(),
      restRemaining: this.rest.getRemaining(),
      noBetReason,
      conflicts: decision.conflicts,
    };
    this.sessionRecords.push(record);
    return { record, snapshot: this.snapshot() };
  }

  getLastBetAt(): number {
    return this.lastBetAt;
  }

  msSinceLastBet(): number {
    if (!this.lastBetAt) return Number.POSITIVE_INFINITY;
    return Date.now() - this.lastBetAt;
  }
}

function colorName(c: string): string {
  if (c === 'R') return 'RED';
  if (c === 'B') return 'BLACK';
  return 'ZERO';
}
