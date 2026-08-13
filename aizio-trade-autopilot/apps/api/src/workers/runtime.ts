import type { DataLane, FinalTradeCandidate, TradingMode } from '@aizio/trade-shared';
import { env, tossConfigured } from '../config/env.js';
import { prisma } from '../db/client.js';
import { executionMode, getActiveBroker, getPaperBroker, getTossBroker, rebindPaperMarketData } from '../brokers/index.js';
import { MarketDataNotAvailableError, resolveMarketDataProvider } from '../marketdata/index.js';
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
import { placeManagedOrder } from '../services/execution.js';
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
      await emitEvent('WORKER_ERROR', msg, 'error');
      await setState('ERROR', { haltReason: msg, readiness: 'DEGRADED' });
    } finally {
      this.runningTick = false;
    }
  }

  async tick() {
    const ap = await ensureAutopilotRow();
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
        });
        await emitEvent('MARKET_CLOSED_WAIT', `시장 대기: ${session.reason ?? session.session}`, 'info');
      }
      if (session.isTradingDay && session.session !== 'REGULAR') {
        await this.managePositions(true);
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
    const scanUniverse = watch.length
      ? universe.filter((u) => watch.includes(u.symbol))
      : universe;
    const scanner = new MarketScanner(market);

    await emitEvent('SCAN_START', `전체 종목 스캔 시작 (${scanUniverse.length})`, 'info');
    const scan = await scanner.scan('KR', scanUniverse);
    setWatchlist(scan.candidates.slice(0, 40).map((c) => c.symbol));

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
    const equity = ap.capital + perf.netPnl;
    if (this.peakEquity == null) this.peakEquity = equity;
    this.peakEquity = Math.max(this.peakEquity, equity);
    const drawdownPct = this.peakEquity > 0 ? ((this.peakEquity - equity) / this.peakEquity) * 100 : 0;

    const today = kstParts().dateStr;
    const dayRow = await prisma.dailyPerformance.findUnique({ where: { date: today } });
    const dailyPnlPct = ap.capital > 0 ? ((dayRow?.netPnl ?? 0) / ap.capital) * 100 : 0;

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
        brokerOk: true,
        orderStateKnown: true,
        aiValid: shadowPaperPath
          ? true
          : judge.valid && judge.providerStatus !== 'MALFORMED' && judge.providerStatus !== 'TIMEOUT',
        circuitBreakerOn: ap.circuitBreakerOn,
        stopNewEntries: ap.stopMode === 'STOP_NEW_ENTRIES',
        proposedNotional: proposed,
        dataStaleMs: item.candidate.quote.freshnessMs,
        maxStaleMs: env.FRESHNESS_KR_MS,
      });

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

      if (mode === 'SHADOW') {
        await emitEvent(
          'WOULD_BUY',
          `${candidate.symbol} WOULD_BUY → paper fill on TOSS quote`,
          'trade',
          { candidate, QUANT_ELIGIBLE: true, AI_BLOCKED: aiBlocked },
        );
        if (topSignal) await recordStrategyOutcome(topSignal.strategyId, 'WOULD_BUY');
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

        if (order.status === 'FILLED' && order.averageFilledPrice) {
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
      const opens = await prisma.positionRow.findMany({ where: { status: 'OPEN' } });
      for (const pos of opens) {
        await emitEvent('WOULD_SELL', `${pos.symbol} WOULD_SELL (LIVE_OBSERVE — no order)`, 'trade');
        if (pos.strategyId) await recordStrategyOutcome(pos.strategyId, 'WOULD_SELL');
      }
      return;
    }

    const broker = getActiveBroker(mode);
    await broker.connect();
    const opens = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: executionMode(mode) } });

    for (const pos of opens) {
      const quote = await broker.getQuote(pos.symbol);
      if (mode === 'SHADOW' && quote.source !== 'TOSS') {
        await emitEvent('EXIT_SKIP', `${pos.symbol} non-TOSS quote — skip exit`, 'warn');
        continue;
      }
      if (quote.freshnessMs > env.FRESHNESS_KR_MS) {
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

      if (mode === 'SHADOW') {
        await emitEvent(
          'WOULD_SELL',
          `${pos.symbol} WOULD_SELL reason=${decision.reason}`,
          'trade',
        );
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
        });
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
            realizedPnl: net,
          },
        });

        if (net < 0) this.consecutiveLosses += 1;
        else this.consecutiveLosses = 0;

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
        await prisma.positionRow.update({ where: { id: pos.id }, data: { status: 'OPEN' } });
        await emitEvent('EXIT_ERROR', e instanceof Error ? e.message : 'exit-failed', 'error');
      }
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
        const order = await placeManagedOrder({
          broker: mode === 'LIVE' ? broker : getPaperBroker(),
          mode: executionMode(mode),
          symbol: pos.symbol,
          side: 'SELL',
          quantity: pos.quantity,
          strategyId: pos.strategyId,
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

// silence unused import warning path for MarketDataNotAvailableError in type-only catches
void MarketDataNotAvailableError;
