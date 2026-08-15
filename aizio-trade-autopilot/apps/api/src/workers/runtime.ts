import type { DataLane, FinalTradeCandidate, TradingMode } from '@aizio/trade-shared';
import { env, tossConfigured } from '../config/env.js';
import { prisma } from '../db/client.js';
import { executionMode, getActiveBroker, getPaperBroker, getTossBroker, rebindPaperMarketData } from '../brokers/index.js';
import { resolveMarketDataProvider } from '../marketdata/index.js';
import { getMarketSession, isRegularSessionOpen } from '../engines/marketSession.js';
import { refreshUniverse, getUniverse, setWatchlist, getWatchlist } from '../services/universe.js';
import { MarketScanner } from '../engines/scanner.js';
import { runDiscovery } from '../engines/discovery.js';
import { scoreCandidate } from '../engines/quant.js';
import { RuleRegimeEngine, positionSizeMultiplier, STRATEGY_REGIME_WEIGHTS } from '../engines/regime.js';
import { RiskEngine } from '../engines/risk.js';
import { deterministicJudge, runAiJudge } from '../ai/judge.js';
import { defaultStops, evaluateExit } from '../engines/positionManager.js';
import { writeJournal } from '../engines/journal.js';
import {
  placeManagedOrder,
  hasOpenExitOrder,
  DuplicateOrderError,
  syncOrderUntilSettled,
} from '../services/execution.js';
import { assertLiveOrdersAllowed, refreshLiveOrderLock } from '../services/liveOrders.js';
import type { BrokerAdapter } from '../brokers/types.js';
import {
  ensureAutopilotRow,
  getActiveRiskProfile,
  heartbeat,
  setState,
} from '../services/autopilot.js';
import { emitEvent } from '../services/events.js';
import { computePerformance } from '../engines/performance.js';
import { kstParts } from '../utils/time.js';
import {
  recordFunnel,
  recordRegime,
  recordStrategySignal,
  recordStrategyOutcome,
  recordQuantEligible,
  recordFreshness,
  setMarketWaiting,
} from '../services/shadowMetrics.js';

function requiresTossQuotes(mode: TradingMode): boolean {
  return mode === 'SHADOW' || mode === 'LIVE_OBSERVE' || mode === 'LIVE';
}

export class AutopilotRuntime {
  private timer: NodeJS.Timeout | null = null;
  private runningTick = false;
  private consecutiveLosses = 0;
  private peakEquity: number | null = null;
  private lastBroadScanAt = 0;
  private riskStateLoaded = false;

  private async loadPersistedRiskState(ap: Awaited<ReturnType<typeof ensureAutopilotRow>>) {
    if (this.riskStateLoaded) return;
    this.consecutiveLosses = Number((ap as { consecutiveLosses?: number }).consecutiveLosses ?? 0);
    const peak = (ap as { peakEquity?: number | null }).peakEquity;
    this.peakEquity = peak == null ? null : Number(peak);
    this.riskStateLoaded = true;
  }

  private async persistRiskState() {
    await prisma.autopilotStateRow.update({
      where: { id: 'singleton' },
      data: {
        consecutiveLosses: this.consecutiveLosses,
        peakEquity: this.peakEquity ?? undefined,
      },
    });
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.safeTick();
    }, env.WORKER_TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async safeTick() {
    if (this.runningTick) return;
    this.runningTick = true;
    try {
      await this.tick();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'tick-error';
      const ap = await ensureAutopilotRow().catch(() => null);
      if (ap?.enabled && ap.state === 'MARKET_CLOSED') {
        await emitEvent('WORKER_WARN', `closed-wait tick warn: ${msg}`, 'warn');
      } else {
        await emitEvent('WORKER_ERROR', msg, 'error');
        await setState('ERROR', { haltReason: msg, readiness: 'DEGRADED' });
      }
    } finally {
      this.runningTick = false;
    }
  }

  async tick() {
    const ap = await ensureAutopilotRow();
    await this.loadPersistedRiskState(ap);
    await heartbeat(ap.aiStatusText);

    if (ap.stopMode === 'CLOSE_AND_STOP' || ap.circuitBreakerOn) {
      await this.closeAll(ap.haltReason === 'EMERGENCY_STOP' ? 'KILL_CLOSE' : 'KILL_CLOSE');
      if (!ap.enabled || ap.state === 'HALTED') return;
    }

    if (!ap.enabled) {
      if (ap.state !== 'OFF' && ap.state !== 'HALTED' && ap.state !== 'PAUSED') {
        await setState('OFF');
      }
      return;
    }

    if (ap.state === 'HALTED') {
      return;
    }

    let session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    const mode = ap.mode as TradingMode;
    // Continuous LIVE lock — never trust a sticky in-memory unlock after ALLOW_LIVE flips off
    if (mode === 'LIVE' || mode === 'LIVE_OBSERVE') {
      if (!env.ALLOW_LIVE) refreshLiveOrderLock(false);
    }
    if (
      (mode === 'PAPER' || mode === 'PAPER_REPLAY') &&
      env.PAPER_SIMULATE_REGULAR_SESSION &&
      (env.MARKET_DATA_PROVIDER === 'replay' || env.MARKET_DATA_PROVIDER === 'auto') &&
      (!session.isTradingDay || session.session !== 'REGULAR')
    ) {
      session = {
        ...session,
        isTradingDay: true,
        isOpen: true,
        session: 'REGULAR',
        reason: 'PAPER_SIMULATE_REGULAR_SESSION',
      };
    }
    await prisma.autopilotStateRow.update({
      where: { id: 'singleton' },
      data: { lastMarketCheckAt: new Date() },
    });

    const tradingActive = session.isTradingDay && session.session === 'REGULAR';
    if (!tradingActive) {
      await setMarketWaiting(true);
      if (mode === 'SHADOW') {
        if (ap.state !== 'MARKET_CLOSED' || !String(ap.aiStatusText).includes('SHADOW WAITING')) {
          await setState('MARKET_CLOSED', {
            aiStatusText: 'MARKET CLOSED · SHADOW WAITING',
            haltReason: null,
            readiness: 'SHADOW',
          });
          await emitEvent(
            'SHADOW_WAITING',
            `MARKET CLOSED — SHADOW WAITING (${session.reason ?? session.session})`,
            'info',
          );
        }
      } else if (ap.state !== 'MARKET_CLOSED') {
        await setState('MARKET_CLOSED', {
          aiStatusText: '휴장/세션 대기 — 다음 거래일 자동 재개',
          haltReason: null,
        });
        await emitEvent('MARKET_CLOSED_WAIT', `시장 대기: ${session.reason ?? session.session}`, 'info');
      }
      try {
        if (session.isTradingDay && session.session !== 'REGULAR') {
          await this.managePositions(true);
        }
      } catch (e) {
        await emitEvent(
          'EXIT_SKIP',
          `closed-session position mgmt: ${e instanceof Error ? e.message : 'err'}`,
          'warn',
        );
      }
      return;
    }

    await setMarketWaiting(false);

    if (ap.state !== 'RUNNING' && ap.state !== 'STARTING') {
      await setState('RUNNING', {
        aiStatusText: mode === 'SHADOW' ? 'SHADOW scanning' : '시장 탐색중',
        readiness: ap.mode === 'LIVE' ? 'LIVE_RUNNING' : mode === 'SHADOW' ? 'SHADOW' : 'PAPER_MODE',
      });
      await emitEvent('SESSION_OPEN', '정규장 진행 — Autopilot 재개', 'info');
    } else if (ap.state === 'STARTING') {
      await setState('RUNNING', { aiStatusText: mode === 'SHADOW' ? 'SHADOW scanning' : '시장 탐색중' });
    }

    await this.managePositions(false);

    if (ap.stopMode === 'STOP_NEW_ENTRIES') {
      await setState('PAUSED', { aiStatusText: '신규매수 중지 — 보유종목 관리중' });
      return;
    }

    if (mode === 'LIVE_OBSERVE') {
      await this.liveObserveTick();
      return;
    }

    let market;
    try {
      market = resolveMarketDataProvider(mode);
      if (mode === 'SHADOW' || mode === 'PAPER' || mode === 'PAPER_REPLAY') {
        rebindPaperMarketData(mode === 'SHADOW' ? 'SHADOW' : 'PAPER_REPLAY');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'market-data-unavailable';
      await setState('ERROR', { readiness: 'DEGRADED', haltReason: msg, aiStatusText: '시세 DEGRADED' });
      await emitEvent('MARKET_DATA_STALE', msg, 'error');
      return;
    }

    await refreshUniverse(false);
    const universe = await getUniverse();
    const watch = getWatchlist();
    const now = Date.now();
    const broadDue = now - this.lastBroadScanAt >= env.SCANNER_BROAD_INTERVAL_MS;
    let scanUniverse = watch.length
      ? universe.filter((u) => watch.includes(u.symbol))
      : universe;

    // SHADOW/LIVE: prefer rankings-liquid subset for broad scans to avoid orderbook DoS
    if ((mode === 'SHADOW' || mode === 'LIVE') && !watch.length && broadDue) {
      try {
        const { getTossMarketDataProvider } = await import('../marketdata/index.js');
        const liquid = await getTossMarketDataProvider().listLiquidSymbols(200);
        const set = new Set(liquid);
        const filtered = universe.filter((u) => set.has(u.symbol));
        if (filtered.length) scanUniverse = filtered;
      } catch {
        /* full universe fallback */
      }
      this.lastBroadScanAt = now;
    } else if (watch.length && now - this.lastBroadScanAt < env.SCANNER_WATCH_INTERVAL_MS) {
      // Watchlist cadence — skip heavy work until interval
      await this.managePositions(false);
      return;
    }

    const scanner = new MarketScanner(market);

    await emitEvent('SCAN_START', `전체 종목 스캔 시작 (${scanUniverse.length})`, 'info');
    const scan = await scanner.scan('KR', scanUniverse);
    setWatchlist(scan.candidates.slice(0, 40).map((c) => c.symbol));
    if (broadDue) this.lastBroadScanAt = now;

    // Enforce TOSS-only quotes for SHADOW
    let candidates = scan.candidates;
    if (requiresTossQuotes(mode)) {
      const before = candidates.length;
      candidates = candidates.filter((c) => c.quote.source === 'TOSS');
      if (candidates.length < before) {
        await emitEvent(
          'QUOTE_SOURCE_FILTER',
          `Rejected ${before - candidates.length} non-TOSS quotes`,
          'warn',
        );
      }
    }

    for (const c of candidates.slice(0, 5)) {
      await recordFreshness(c.quote.freshnessMs, c.quote.source, c.quote.freshnessMs <= env.FRESHNESS_KR_MS);
      await emitEvent(
        'QUOTE_TICK',
        `${c.symbol} px=${c.quote.lastPrice} bid=${c.quote.bid} ask=${c.quote.ask} ageMs=${c.quote.freshnessMs} source=${c.quote.source}`,
        'info',
        {
          symbol: c.symbol,
          price: c.quote.lastPrice,
          bid: c.quote.bid,
          ask: c.quote.ask,
          volume: c.quote.volume,
          tradingValue: c.quote.value,
          marketTimestamp: c.quote.timestamp.toISOString(),
          receivedAt: new Date().toISOString(),
          ageMs: c.quote.freshnessMs,
          source: c.quote.source,
        },
      );
    }

    await emitEvent(
      'SCAN_DONE',
      `${scan.funnel.chain.join(' → ')} (scanner funnel)`,
      'info',
      { funnel: scan.funnel },
    );

    const regimeEngine = new RuleRegimeEngine();
    const regimeResult = regimeEngine.evaluate(candidates.map((c) => c.quote));
    const weights = STRATEGY_REGIME_WEIGHTS[regimeResult.regime];
    await recordRegime(regimeResult.regime, Boolean(weights));
    await emitEvent(
      'MARKET_REGIME',
      `regime=${regimeResult.regime} weightsApplied=${Boolean(weights)} sizeMul=${positionSizeMultiplier(regimeResult.regime)}`,
      'info',
      { regime: regimeResult.regime, weights },
    );

    const signals = runDiscovery(candidates, regimeResult.regime);
    for (const s of signals) {
      await recordStrategySignal(s.strategyId);
    }
    await emitEvent('DISCOVERY', `${signals.length}개 시그널`, 'info', { regime: regimeResult.regime });

    const quanted = candidates
      .map((c) => ({
        candidate: c,
        quant: scoreCandidate(c, signals, regimeResult.regime),
        signals: signals.filter((s) => s.symbol === c.symbol),
      }))
      .filter((x) => x.quant.total >= 45)
      .sort((a, b) => b.quant.total - a.quant.total)
      .slice(0, 11);

    await recordFunnel(scan.funnel, signals.length, quanted.length);
    await emitEvent('QUANT', `${quanted.length}개 정밀분석`, 'info');

    const broker = getActiveBroker(mode);
    const execMode = executionMode(mode);
    const lane: DataLane = mode === 'LIVE' ? 'LIVE' : mode === 'SHADOW' ? 'SHADOW' : 'PAPER';
    try {
      await broker.connect();
    } catch {
      await setState('ERROR', { readiness: 'DEGRADED', haltReason: 'BROKER_DISCONNECTED', aiStatusText: 'Broker 장애' });
      await emitEvent('BROKER_DOWN', 'Broker 연결 불안정 — 신규매수 차단', 'error');
      return;
    }

    const riskProfile = await getActiveRiskProfile();
    const openPositions = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: execMode } });
    const perf = await computePerformance();

    // Mark-to-market unrealized for daily loss / equity (closed PnL alone understates risk)
    let unrealized = 0;
    for (const p of openPositions) {
      try {
        const q = await broker.getQuote(p.symbol);
        unrealized += (q.lastPrice - p.entryPrice) * p.quantity;
      } catch {
        /* ignore single quote miss */
      }
    }
    const equity = ap.capital + perf.netPnl + unrealized;
    if (this.peakEquity == null) this.peakEquity = equity;
    this.peakEquity = Math.max(this.peakEquity, equity);
    const drawdownPct = this.peakEquity > 0 ? ((this.peakEquity - equity) / this.peakEquity) * 100 : 0;
    await this.persistRiskState();

    const today = kstParts().dateStr;
    const dayRow = await prisma.dailyPerformance.findUnique({ where: { date: today } });
    const realizedToday = dayRow?.netPnl ?? 0;
    const dailyPnlPct = ap.capital > 0 ? ((realizedToday + unrealized) / ap.capital) * 100 : 0;

    // Honest broker / order-state probes
    let brokerOk = true;
    let orderStateKnown = true;
    let buyingPowerCash = Number.POSITIVE_INFINITY;
    try {
      const health = await broker.health();
      brokerOk = Boolean(health.ok);
      const bp = await broker.getBuyingPower();
      buyingPowerCash = bp.cashBuyingPower;
      const oo = await broker.getOpenOrders();
      orderStateKnown = oo.every((o) => String(o.status) !== 'UNKNOWN');
    } catch {
      brokerOk = false;
      orderStateKnown = false;
    }

    const riskEngine = new RiskEngine();
    const sizeMul = positionSizeMultiplier(regimeResult.regime);

    for (const item of quanted) {
      const topSignal = item.signals[0];
      if (topSignal) {
        await prisma.signal
          .create({
            data: {
              symbol: topSignal.symbol,
              strategyId: topSignal.strategyId,
              score: topSignal.score,
              confidence: topSignal.confidence,
              evidenceJson: JSON.stringify(topSignal.evidence),
              invalidationJson: JSON.stringify(topSignal.invalidation ?? []),
              quantScore: item.quant.total,
              regime: regimeResult.regime,
              status: 'NEW',
              detectedAt: new Date(topSignal.detectedAt),
            },
          })
          .catch(() => undefined);
      }

      // Freshness hard reject
      if (item.candidate.quote.freshnessMs > env.FRESHNESS_KR_MS) {
        await recordFreshness(item.candidate.quote.freshnessMs, item.candidate.quote.source, false);
        await emitEvent('STALE_REJECT', `${item.candidate.symbol} ageMs=${item.candidate.quote.freshnessMs}`, 'warn');
        if (topSignal) await recordStrategyOutcome(topSignal.strategyId, 'REJECT');
        continue;
      }
      if (requiresTossQuotes(mode) && item.candidate.quote.source !== 'TOSS') {
        await emitEvent('NON_TOSS_REJECT', `${item.candidate.symbol} source=${item.candidate.quote.source}`, 'warn');
        if (topSignal) await recordStrategyOutcome(topSignal.strategyId, 'REJECT');
        continue;
      }

      const det = deterministicJudge({
        candidate: item.candidate,
        quant: item.quant,
        signals: item.signals,
        regime: regimeResult.regime,
      });
      const quantWouldBuy = det.decision?.action === 'BUY';
      if (quantWouldBuy) {
        await emitEvent('QUANT_ELIGIBLE', `${item.candidate.symbol} quant=${item.quant.total}`, 'info');
      }

      const judge = await runAiJudge({
        candidate: item.candidate,
        quant: item.quant,
        signals: item.signals,
        regime: regimeResult.regime,
      });

      const aiBlocked = judge.providerStatus === 'NOT_CONFIGURED';
      if (quantWouldBuy) {
        await recordQuantEligible(topSignal?.strategyId, aiBlocked);
        if (aiBlocked) {
          await emitEvent('AI_BLOCKED', `${item.candidate.symbol} AI NOT_CONFIGURED (LIVE gate would block)`, 'warn');
        }
      }

      await prisma.aiDecision.create({
        data: {
          symbol: item.candidate.symbol,
          signalId: topSignal ? `${topSignal.strategyId}:${topSignal.detectedAt}` : undefined,
          action: judge.decision?.action ?? 'REJECT',
          confidence: judge.decision?.confidence ?? 0,
          bullScore: judge.decision?.bullScore ?? 0,
          bearScore: judge.decision?.bearScore ?? 0,
          dataQuality: judge.decision?.dataQuality ?? 0,
          reasonsJson: JSON.stringify(judge.decision?.reasons ?? []),
          risksJson: JSON.stringify(judge.decision?.risks ?? []),
          rawJson: JSON.stringify(judge),
          valid: judge.valid,
          generatedAt: new Date(),
        },
      });

      await emitEvent(
        'AI_DECISION',
        `${item.candidate.symbol} ${judge.decision?.action ?? 'REJECT'} provider=${judge.providerStatus}`,
        'info',
      );

      // SHADOW research: paper-trade on quant eligibility even when AI provider missing.
      // LIVE still uses fail-safe (AI_REQUIRED → no entry). Never pretends AI succeeded.
      const shadowPaperPath = mode === 'SHADOW' && quantWouldBuy && aiBlocked;
      const liveAiBuy = judge.valid && judge.decision && judge.decision.action === 'BUY' && !aiBlocked;

      if (!shadowPaperPath && !liveAiBuy) {
        const action = judge.decision?.action ?? 'REJECT';
        if (topSignal) {
          await recordStrategyOutcome(topSignal.strategyId, action === 'WATCH' ? 'WATCH' : 'REJECT');
        }
        await writeJournal({
          symbol: item.candidate.symbol,
          strategyId: topSignal?.strategyId,
          rejectWhy: judge.decision?.reasons.join('; ') ?? judge.error ?? 'rejected',
          marketRegime: regimeResult.regime,
          quantScore: item.quant.total,
          aiAction: judge.decision?.action ?? 'REJECT',
          aiConfidence: judge.decision?.confidence,
          riskDecision: quantWouldBuy && aiBlocked ? 'AI_BLOCKED' : 'SKIPPED',
          meta: {
            QUANT_ELIGIBLE: quantWouldBuy,
            AI_BLOCKED: aiBlocked,
            providerStatus: judge.providerStatus,
          },
        });
        continue;
      }

      if (item.signals.length === 1 && item.signals[0].strategyId === 'event_news') {
        continue;
      }

      const already = openPositions.find((p) => p.symbol === item.candidate.symbol);
      if (already) continue;

      const proposed = riskProfile.maxCapital * (riskProfile.maxPositionPct / 100) * sizeMul;
      const risk = riskEngine.evaluate({
        profile: riskProfile,
        capitalUsed: openPositions.reduce((s, p) => s + p.entryPrice * p.quantity, 0),
        openPositions: openPositions.length,
        dailyPnlPct,
        drawdownPct,
        consecutiveLosses: this.consecutiveLosses,
        quote: item.candidate.quote,
        marketOpen: isRegularSessionOpen(session),
        brokerOk,
        orderStateKnown,
        aiValid: shadowPaperPath
          ? true
          : judge.valid && judge.providerStatus !== 'MALFORMED' && judge.providerStatus !== 'TIMEOUT',
        circuitBreakerOn: ap.circuitBreakerOn,
        stopNewEntries: ap.stopMode === 'STOP_NEW_ENTRIES',
        proposedNotional: proposed,
        dataStaleMs: item.candidate.quote.freshnessMs,
        maxStaleMs: env.FRESHNESS_KR_MS,
      });

      if (risk.allowed && Number.isFinite(buyingPowerCash)) {
        const need = (item.candidate.quote.ask || item.candidate.quote.lastPrice) * risk.positionSize;
        if (need > buyingPowerCash) {
          risk.allowed = false;
          risk.reasons.push('INSUFFICIENT_BUYING_POWER');
          risk.positionSize = 0;
        }
      }

      if (!risk.allowed) {
        await emitEvent('RISK_REJECT', `${item.candidate.symbol} ${risk.reasons.join(',')}`, 'warn');
        if (topSignal) await recordStrategyOutcome(topSignal.strategyId, 'REJECT');
        await writeJournal({
          symbol: item.candidate.symbol,
          strategyId: topSignal?.strategyId,
          rejectWhy: risk.reasons.join(','),
          marketRegime: regimeResult.regime,
          quantScore: item.quant.total,
          aiAction: judge.decision?.action ?? (shadowPaperPath ? 'WATCH' : 'REJECT'),
          aiConfidence: judge.decision?.confidence,
          riskDecision: 'REJECT',
          meta: { QUANT_ELIGIBLE: quantWouldBuy, AI_BLOCKED: aiBlocked },
        });
        if (risk.reasons.includes('MAX_DAILY_LOSS')) {
          await setState('HALTED', {
            circuitBreakerOn: true,
            haltReason: 'MAX_DAILY_LOSS',
            stopMode: 'STOP_NEW_ENTRIES',
            readiness: 'HALTED',
          });
          await emitEvent('DAILY_LOSS_LIMIT', '일일 손실한도 도달', 'error');
        }
        continue;
      }

      await emitEvent('RISK_PASS', `${item.candidate.symbol} Risk PASS qty=${risk.positionSize}`, 'info');

      const signalId = topSignal
        ? `${topSignal.symbol}:${topSignal.strategyId}:${topSignal.detectedAt}`
        : `${item.candidate.symbol}:quant:${item.quant.total}`;

      const candidate: FinalTradeCandidate = {
        symbol: item.candidate.symbol,
        quantScore: item.quant.total,
        aiConfidence: judge.decision?.confidence ?? det.decision?.confidence ?? 0,
        riskScore: risk.allowed ? 100 : 0,
        dataQuality: judge.decision?.dataQuality ?? det.decision?.dataQuality ?? 0,
        marketRegime: regimeResult.regime,
        action: mode === 'SHADOW' ? 'WOULD_BUY' : 'BUY',
        entryPlan: {
          price: item.candidate.quote.lastPrice,
          maxPrice: item.candidate.quote.ask,
          quantity: risk.positionSize,
        },
        stopLoss: defaultStops(item.candidate.quote.lastPrice).stopLoss,
        takeProfit: defaultStops(item.candidate.quote.lastPrice).takeProfit,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        lane,
      };

      if (mode === 'LIVE' && (!env.ALLOW_LIVE || !getTossBroker().allowLiveOrders)) {
        await emitEvent('WOULD_BUY', `${candidate.symbol} WOULD_BUY qty=${risk.positionSize}`, 'trade', { candidate });
        if (topSignal) await recordStrategyOutcome(topSignal.strategyId, 'WOULD_BUY');
        await writeJournal({
          symbol: candidate.symbol,
          strategyId: topSignal?.strategyId,
          signalId,
          discoveryWhy: topSignal?.evidence.map((e) => e.reason).join('; '),
          buyWhy: `WOULD_BUY: LIVE locked`,
          marketRegime: regimeResult.regime,
          quantScore: item.quant.total,
          aiAction: 'WOULD_BUY',
          aiConfidence: candidate.aiConfidence,
          riskDecision: 'PASS_OBSERVE',
          entryPrice: item.candidate.quote.lastPrice,
          quantity: risk.positionSize,
          meta: { lane, observe: true, candidate },
        });
        break;
      }

      if (mode === 'LIVE') {
        try {
          assertLiveOrdersAllowed();
        } catch (e) {
          await emitEvent('LIVE_ORDERS_LOCKED', e instanceof Error ? e.message : 'locked', 'warn');
          break;
        }
      }

      if (mode === 'SHADOW') {
        await emitEvent(
          'WOULD_BUY',
          `${candidate.symbol} WOULD_BUY candidate qty=${risk.positionSize}`,
          'trade',
          { candidate, QUANT_ELIGIBLE: true, AI_BLOCKED: aiBlocked },
        );
      }

      try {
        const order = await placeManagedOrder({
          broker: mode === 'LIVE' ? broker : getPaperBroker(),
          mode: execMode,
          symbol: item.candidate.symbol,
          side: 'BUY',
          quantity: risk.positionSize,
          signalId,
          strategyId: topSignal?.strategyId ?? 'quant',
        });

        if (String(order.status) === 'PENDING' || String(order.status) === 'PARTIAL_FILLED') {
          await emitEvent(
            'ORDER_PENDING',
            `${item.candidate.symbol} LIVE order ${order.status} — waiting fill before position open`,
            'warn',
            { orderId: order.orderId },
          );
          // Do not invent a position; next ticks / recovery must reconcile broker truth
          break;
        }

        if (order.status === 'FILLED' && order.averageFilledPrice) {
          if (mode === 'SHADOW' && topSignal) {
            await recordStrategyOutcome(topSignal.strategyId, 'WOULD_BUY');
          }
          const stops = defaultStops(order.averageFilledPrice);
          await prisma.positionRow.create({
            data: {
              symbol: item.candidate.symbol,
              entryPrice: order.averageFilledPrice,
              quantity: order.filledQuantity,
              stopLoss: stops.stopLoss,
              takeProfit: stops.takeProfit,
              trailingStop: stops.trailingStop,
              strategyId: topSignal?.strategyId ?? 'quant',
              signalId,
              openedAt: new Date(),
              highestPrice: order.averageFilledPrice,
              lowestPrice: order.averageFilledPrice,
              status: 'OPEN',
              mode: execMode,
            },
          });
          openPositions.push({
            id: 'tmp',
            symbol: item.candidate.symbol,
            entryPrice: order.averageFilledPrice,
            quantity: order.filledQuantity,
          } as (typeof openPositions)[number]);

          await writeJournal({
            symbol: item.candidate.symbol,
            strategyId: topSignal?.strategyId,
            signalId,
            discoveryWhy: topSignal?.evidence.map((e) => e.reason).join('; '),
            buyWhy: shadowPaperPath
              ? `SHADOW paper: QUANT_ELIGIBLE; AI_BLOCKED`
              : (judge.decision?.reasons.join('; ') ?? 'buy'),
            marketRegime: regimeResult.regime,
            quantScore: item.quant.total,
            aiAction: shadowPaperPath ? 'WOULD_BUY' : judge.decision?.action,
            aiConfidence: candidate.aiConfidence,
            riskDecision: 'PASS',
            entryPrice: order.averageFilledPrice,
            quantity: order.filledQuantity,
            commission: order.commission,
            openedAt: new Date(),
            meta: {
              QUANT_ELIGIBLE: quantWouldBuy,
              AI_BLOCKED: aiBlocked,
              quoteSource: item.candidate.quote.source,
              ageMs: item.candidate.quote.freshnessMs,
            },
          });
          await emitEvent(
            mode === 'SHADOW' ? 'SHADOW_FILL_BUY' : 'FILL_BUY',
            `${item.candidate.symbol} ${mode === 'SHADOW' ? 'SHADOW' : ''} 체결 확인`.trim(),
            'trade',
          );
          await prisma.autopilotStateRow.update({
            where: { id: 'singleton' },
            data: { aiStatusText: `${item.candidate.symbol} 보유 관리중` },
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'order-error';
        await emitEvent('ORDER_ERROR', msg, 'error');
      }

      break;
    }

    const snap = await computePerformance();
    await prisma.dailyPerformance.upsert({
      where: { date: today },
      create: {
        date: today,
        trades: snap.totalTrades,
        wins: Math.round(snap.winRate * snap.totalTrades),
        netPnl: snap.daily.find((d) => d.date === today)?.netPnl ?? 0,
        grossPnl: snap.grossPnl,
      },
      update: {
        trades: snap.totalTrades,
        wins: Math.round(snap.winRate * snap.totalTrades),
        netPnl: snap.daily.find((d) => d.date === today)?.netPnl ?? snap.netPnl,
        grossPnl: snap.grossPnl,
        maxDrawdown: snap.maxDrawdown,
      },
    });
  }

  /** LIVE_OBSERVE: read real account/quotes/session — never placeOrder */
  private async liveObserveTick() {
    const toss = getTossBroker();
    await toss.connect();
    const [acc, bp, positions, orders, session] = await Promise.all([
      toss.getAccount(),
      toss.getBuyingPower(),
      toss.getPositions(),
      toss.getOpenOrders(),
      getMarketSession('KR', { preferTossCalendar: true }),
    ]);
    let quoteAge: number | null = null;
    try {
      const q = await toss.getQuote(positions[0]?.symbol ?? '005930');
      quoteAge = q.freshnessMs;
      await recordFreshness(q.freshnessMs, q.source, q.freshnessMs <= env.FRESHNESS_KR_MS && q.source === 'TOSS');
    } catch {
      /* quote optional */
    }
    await emitEvent(
      'LIVE_OBSERVE',
      `account cash=${acc.cash} bp=${bp.cashBuyingPower} pos=${positions.length} oo=${orders.length} session=${session.session} ageMs=${quoteAge ?? 'n/a'}`,
      'info',
    );
    // Explicit: no placeOrder in observe path
  }

  private async managePositions(regularClosed: boolean) {
    const ap = await ensureAutopilotRow();
    const mode = ap.mode as TradingMode;
    if (mode === 'LIVE_OBSERVE') {
      // Observe-only: evaluate exits as WOULD_SELL, never order
      const opens = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: 'LIVE' } });
      for (const pos of opens) {
        await emitEvent('WOULD_SELL', `${pos.symbol} WOULD_SELL (LIVE_OBSERVE — no order)`, 'trade');
        if (pos.strategyId) await recordStrategyOutcome(pos.strategyId, 'WOULD_SELL');
      }
      return;
    }

    const broker = getActiveBroker(mode);
    try {
      await broker.connect();
    } catch (e) {
      await emitEvent('EXIT_SKIP', `broker connect: ${e instanceof Error ? e.message : 'err'}`, 'warn');
      return;
    }
    await this.reconcileExitingPositions(mode, broker);

    const opens = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: executionMode(mode) } });

    for (const pos of opens) {
      let quote;
      try {
        quote = await broker.getQuote(pos.symbol);
      } catch (e) {
        await emitEvent('EXIT_SKIP', `${pos.symbol} quote fail: ${e instanceof Error ? e.message : 'err'}`, 'warn');
        continue;
      }
      if (mode === 'SHADOW' && quote.source !== 'TOSS') {
        await emitEvent('EXIT_SKIP', `${pos.symbol} non-TOSS quote — skip exit`, 'warn');
        continue;
      }
      if (quote.freshnessMs > env.FRESHNESS_KR_MS && !regularClosed) {
        await emitEvent('EXIT_SKIP', `${pos.symbol} stale quote ageMs=${quote.freshnessMs}`, 'warn');
        continue;
      }

      const decision = evaluateExit(
        {
          id: pos.id,
          symbol: pos.symbol,
          entryPrice: pos.entryPrice,
          quantity: pos.quantity,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          trailingStop: pos.trailingStop,
          strategyId: pos.strategyId,
          signalId: pos.signalId,
          openedAt: pos.openedAt,
          highestPrice: pos.highestPrice,
          lowestPrice: pos.lowestPrice,
          status: pos.status as 'OPEN',
        },
        quote,
        undefined,
        { marketRegularClosed: regularClosed },
      );

      await prisma.positionRow.update({
        where: { id: pos.id },
        data: { highestPrice: decision.highest, lowestPrice: decision.lowest },
      });

      if (!decision.shouldExit) continue;

      if (await hasOpenExitOrder(pos.id)) {
        await emitEvent('EXIT_SKIP', `${pos.symbol} exit already working`, 'warn');
        continue;
      }

      if (mode === 'SHADOW') {
        await emitEvent(
          'WOULD_SELL',
          `${pos.symbol} WOULD_SELL reason=${decision.reason}`,
          'trade',
        );
      }

      // Ensure paper ledger has the position before sell
      if (mode !== 'LIVE') {
        getPaperBroker().forcePosition(pos.symbol, pos.quantity, pos.entryPrice);
      }

      if (mode === 'LIVE') {
        try {
          assertLiveOrdersAllowed();
        } catch (e) {
          await emitEvent('LIVE_ORDERS_LOCKED', e instanceof Error ? e.message : 'locked', 'warn');
          continue;
        }
      }

      await prisma.positionRow.update({ where: { id: pos.id }, data: { status: 'EXITING' } });
      try {
        const order = await placeManagedOrder({
          broker: mode === 'LIVE' ? broker : getPaperBroker(),
          mode: executionMode(mode),
          symbol: pos.symbol,
          side: 'SELL',
          quantity: pos.quantity,
          strategyId: pos.strategyId,
          signalId: pos.signalId ? `${pos.signalId}:exit` : undefined,
          positionId: pos.id,
        });
        if (String(order.status) === 'PENDING' || String(order.status) === 'PARTIAL_FILLED') {
          await prisma.positionRow.update({
            where: { id: pos.id },
            data: { status: 'EXITING', exitOrderId: order.orderId },
          });
          await emitEvent('EXIT_PENDING', `${pos.symbol} exit ${order.status}`, 'warn');
          continue;
        }
        if (String(order.status) !== 'FILLED' && Number(order.filledQuantity) <= 0) {
          await prisma.positionRow.update({ where: { id: pos.id }, data: { status: 'OPEN', exitOrderId: null } });
          await emitEvent('EXIT_REJECT', `${pos.symbol} exit rejected: ${order.status}`, 'warn');
          continue;
        }
        const exitPrice = order.averageFilledPrice ?? quote.lastPrice;
        const gross = (exitPrice - pos.entryPrice) * pos.quantity;
        const net = gross - (order.commission ?? 0) - (order.tax ?? 0);
        const holdMs = Date.now() - pos.openedAt.getTime();
        const maxFavorable = ((decision.highest - pos.entryPrice) / pos.entryPrice) * 100;
        const maxAdverse = ((decision.lowest - pos.entryPrice) / pos.entryPrice) * 100;

        await prisma.positionRow.update({
          where: { id: pos.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            exitReason: decision.reason,
            exitOrderId: order.orderId,
            realizedPnl: net,
          },
        });

        if (net < 0) this.consecutiveLosses += 1;
        else this.consecutiveLosses = 0;
        await this.persistRiskState();

        if (pos.strategyId) await recordStrategyOutcome(pos.strategyId, 'WOULD_SELL', net);

        await writeJournal({
          symbol: pos.symbol,
          strategyId: pos.strategyId,
          signalId: pos.signalId ?? undefined,
          buyWhy: `exit:${decision.reason}`,
          entryPrice: pos.entryPrice,
          exitPrice,
          quantity: pos.quantity,
          commission: order.commission,
          tax: order.tax,
          grossPnl: gross,
          netPnl: net,
          maxFavorable,
          maxAdverse,
          holdMs,
          openedAt: pos.openedAt,
          closedAt: new Date(),
          riskDecision: 'EXIT',
          meta: { WOULD_SELL: mode === 'SHADOW', quoteSource: quote.source },
        });

        const pct = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;
        await emitEvent(
          decision.reason,
          `${pos.symbol} 매도 ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% (${decision.reason})`,
          'trade',
        );
      } catch (e) {
        if (e instanceof DuplicateOrderError) {
          await emitEvent('EXIT_SKIP', e.message, 'warn');
          continue;
        }
        await prisma.positionRow.update({ where: { id: pos.id }, data: { status: 'OPEN' } });
        await emitEvent('EXIT_ERROR', e instanceof Error ? e.message : 'exit-failed', 'error');
      }
    }
  }

  private async reconcileExitingPositions(mode: TradingMode, broker: BrokerAdapter) {
    // Orphan OPEN with a FILLED exit order — close without re-selling
    const opens = await prisma.positionRow.findMany({
      where: { status: 'OPEN', mode: executionMode(mode) },
    });
    for (const pos of opens) {
      const filledExit = await prisma.orderRow.findFirst({
        where: { positionId: pos.id, side: 'SELL', status: 'FILLED' },
      });
      if (!filledExit) continue;
      const exitPrice = filledExit.avgFillPrice != null ? Number(filledExit.avgFillPrice) : pos.entryPrice;
      const net =
        (exitPrice - pos.entryPrice) * pos.quantity -
        Number(filledExit.commission ?? 0) -
        Number(filledExit.tax ?? 0);
      await prisma.positionRow.update({
        where: { id: pos.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          exitReason: 'RECONCILE_ORPHAN_FILLED_EXIT',
          exitOrderId: filledExit.brokerOrderId,
          realizedPnl: net,
        },
      });
      if (net < 0) this.consecutiveLosses += 1;
      else this.consecutiveLosses = 0;
      await this.persistRiskState();
      await emitEvent('EXIT_FILLED', `${pos.symbol} orphan OPEN+FILLED exit closed`, 'trade');
    }

    const exiting = await prisma.positionRow.findMany({
      where: { status: 'EXITING', mode: executionMode(mode) },
    });
    for (const pos of exiting) {
      const exitOrder = await prisma.orderRow.findFirst({
        where: { positionId: pos.id, side: 'SELL' },
        orderBy: { createdAt: 'desc' },
      });
      if (!exitOrder) {
        await prisma.positionRow.update({
          where: { id: pos.id },
          data: { status: 'OPEN', exitOrderId: null },
        });
        await emitEvent('EXIT_REOPEN', `${pos.symbol} EXITING without order — reopen`, 'warn');
        continue;
      }

      let status = String(exitOrder.status);
      let filledQty = Number(exitOrder.filledQuantity);
      let avg = exitOrder.avgFillPrice != null ? Number(exitOrder.avgFillPrice) : null;
      let commission = Number(exitOrder.commission ?? 0);
      let tax = Number(exitOrder.tax ?? 0);
      let brokerOrderId = exitOrder.brokerOrderId ?? undefined;

      if (exitOrder.brokerOrderId && mode === 'LIVE') {
        try {
          let bo = await broker.getOrder(exitOrder.brokerOrderId);
          bo = await syncOrderUntilSettled(broker, bo);
          status = String(bo.status);
          filledQty = Number(bo.filledQuantity);
          avg = bo.averageFilledPrice != null ? Number(bo.averageFilledPrice) : avg;
          commission = Number(bo.commission ?? commission);
          tax = Number(bo.tax ?? tax);
          brokerOrderId = bo.orderId;
          await prisma.orderRow.update({
            where: { clientOrderId: exitOrder.clientOrderId },
            data: {
              status,
              filledQuantity: filledQty,
              avgFillPrice: avg ?? undefined,
              commission,
              tax,
              brokerOrderId,
              rawJson: JSON.stringify(bo),
            },
          });
        } catch (e) {
          await emitEvent(
            'EXIT_RECONCILE_WARN',
            `${pos.symbol} getOrder fail: ${e instanceof Error ? e.message : 'err'}`,
            'warn',
          );
          continue;
        }
      }

      if (status === 'FILLED' || filledQty > 0) {
        const exitPrice = avg ?? pos.entryPrice;
        const gross = (exitPrice - pos.entryPrice) * pos.quantity;
        const net = gross - commission - tax;
        await prisma.positionRow.update({
          where: { id: pos.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            exitReason: pos.exitReason ?? 'EXIT_FILLED',
            exitOrderId: brokerOrderId ?? exitOrder.brokerOrderId,
            realizedPnl: net,
          },
        });
        if (net < 0) this.consecutiveLosses += 1;
        else this.consecutiveLosses = 0;
        await this.persistRiskState();
        await emitEvent('EXIT_FILLED', `${pos.symbol} exit reconciled FILLED`, 'trade');
        continue;
      }

      if (status === 'REJECTED' || status === 'CANCELED') {
        await prisma.orderRow
          .delete({ where: { idempotencyKey: `exit:${pos.id}` } })
          .catch(() => undefined);
        await prisma.positionRow.update({
          where: { id: pos.id },
          data: { status: 'OPEN', exitOrderId: null },
        });
        await emitEvent('EXIT_REOPEN', `${pos.symbol} exit ${status} — reopen for retry`, 'warn');
        continue;
      }

      await emitEvent('EXIT_PENDING', `${pos.symbol} still ${status}`, 'warn');
    }
  }

  private async closeAll(reason: string) {
    const ap = await ensureAutopilotRow();
    const opens = await prisma.positionRow.findMany({
      where: { status: 'OPEN', mode: executionMode(ap.mode as TradingMode) },
    });
    if (!opens.length) {
      if (ap.stopMode === 'CLOSE_AND_STOP') {
        await prisma.autopilotStateRow.update({
          where: { id: 'singleton' },
          data: { stopMode: 'NONE' },
        });
      }
      return;
    }
    const mode = ap.mode as TradingMode;
    if (mode === 'LIVE_OBSERVE') {
      for (const pos of opens) {
        await emitEvent('WOULD_SELL', `${pos.symbol} WOULD_SELL close-all observe`, 'trade');
      }
      return;
    }
    const broker = getActiveBroker(mode);
    await broker.connect();

    if (mode !== 'LIVE') {
      const paper = getPaperBroker();
      for (const pos of opens) {
        paper.forcePosition(pos.symbol, pos.quantity, pos.entryPrice);
      }
    }

    for (const pos of opens) {
      try {
        if (await hasOpenExitOrder(pos.id)) {
          await emitEvent('CLOSE_SKIP', `${pos.symbol} exit already working`, 'warn');
          continue;
        }
        const order = await placeManagedOrder({
          broker: mode === 'LIVE' ? broker : getPaperBroker(),
          mode: executionMode(mode),
          symbol: pos.symbol,
          side: 'SELL',
          quantity: pos.quantity,
          strategyId: pos.strategyId,
          positionId: pos.id,
        });
        if (String(order.status) !== 'FILLED' && Number(order.filledQuantity) <= 0) {
          await emitEvent('CLOSE_REJECT', `${pos.symbol} close rejected: ${order.status}`, 'error');
          continue;
        }
        await prisma.positionRow.update({
          where: { id: pos.id },
          data: {
            status: 'CLOSED',
            exitReason: reason,
            exitOrderId: order.orderId,
            closedAt: new Date(),
            realizedPnl:
              order.averageFilledPrice != null
                ? (order.averageFilledPrice - pos.entryPrice) * pos.quantity
                : undefined,
          },
        });
      } catch (e) {
        await emitEvent('CLOSE_ERROR', e instanceof Error ? e.message : 'close-failed', 'error');
      }
    }
    const openOrders = await broker.getOpenOrders();
    for (const o of openOrders) {
      try {
        await broker.cancelOrder(o.orderId);
      } catch {
        /* ignore */
      }
    }
  }
}

export const runtime = new AutopilotRuntime();
