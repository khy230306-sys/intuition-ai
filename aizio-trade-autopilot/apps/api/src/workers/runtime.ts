import { RISK_PRESETS, type RiskLevel } from '@aizio/trade-shared';
import { env, tossConfigured, aiConfigured } from '../config/env.js';
import { prisma } from '../db/client.js';
import { getActiveBroker, getPaperBroker } from '../brokers/index.js';
import { getMarketDataProvider } from '../marketdata/index.js';
import { getMarketSession, isRegularSessionOpen } from '../engines/marketSession.js';
import { MarketScanner } from '../engines/scanner.js';
import { runDiscovery } from '../engines/discovery.js';
import { scoreCandidate } from '../engines/quant.js';
import { RuleRegimeEngine, positionSizeMultiplier } from '../engines/regime.js';
import { RiskEngine } from '../engines/risk.js';
import { runAiJudge } from '../ai/judge.js';
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

    // Market session worker
    let session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    if (
      ap.mode === 'PAPER' &&
      env.PAPER_SIMULATE_REGULAR_SESSION &&
      env.MARKET_DATA_PROVIDER === 'replay' &&
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
      if (ap.state !== 'MARKET_CLOSED') {
        await setState('MARKET_CLOSED', {
          aiStatusText: '휴장/세션 대기 — 다음 거래일 자동 재개',
        });
        await emitEvent('MARKET_CLOSED_WAIT', `시장 대기: ${session.reason ?? session.session}`, 'info');
      }
      // Still manage positions if needed on after-hours? V1: EOD close when regular ends
      if (session.isTradingDay && session.session !== 'REGULAR') {
        await this.managePositions(true);
      }
      return;
    }

    if (ap.state !== 'RUNNING' && ap.state !== 'STARTING') {
      await setState('RUNNING', { aiStatusText: '시장 탐색중', readiness: ap.mode === 'LIVE' ? 'LIVE_RUNNING' : 'PAPER_MODE' });
      await emitEvent('SESSION_OPEN', '정규장 진행 — Autopilot 재개', 'info');
    } else if (ap.state === 'STARTING') {
      await setState('RUNNING', { aiStatusText: '시장 탐색중' });
    }

    await this.managePositions(false);

    if (ap.stopMode === 'STOP_NEW_ENTRIES') {
      await setState('PAUSED', { aiStatusText: '신규매수 중지 — 보유종목 관리중' });
      return;
    }

    // Scanner → Discovery → Quant → AI → Risk → Execution
    const market = getMarketDataProvider();
    const scanner = new MarketScanner(market);
    await emitEvent('SCAN_START', '전체 종목 스캔 시작', 'info');
    const scan = await scanner.scan('KR');
    await emitEvent('SCAN_DONE', `${scan.scanned}개 분석 → ${scan.candidates.length}개 1차 후보`, 'info');

    const regimeEngine = new RuleRegimeEngine();
    const regimeResult = regimeEngine.evaluate(scan.candidates.map((c) => c.quote));
    const signals = runDiscovery(scan.candidates, regimeResult.regime);
    await emitEvent('DISCOVERY', `${signals.length}개 시그널`, 'info', { regime: regimeResult.regime });

    const quanted = scan.candidates
      .map((c) => ({
        candidate: c,
        quant: scoreCandidate(c, signals, regimeResult.regime),
        signals: signals.filter((s) => s.symbol === c.symbol),
      }))
      .filter((x) => x.quant.total >= 45)
      .sort((a, b) => b.quant.total - a.quant.total)
      .slice(0, 11);

    await emitEvent('QUANT', `${quanted.length}개 정밀분석`, 'info');

    const broker = getActiveBroker(ap.mode === 'LIVE' ? 'LIVE' : 'PAPER');
    try {
      await broker.connect();
    } catch {
      await setState('ERROR', { readiness: 'DEGRADED', haltReason: 'BROKER_DISCONNECTED', aiStatusText: 'Broker 장애' });
      await emitEvent('BROKER_DOWN', 'Broker 연결 불안정 — 신규매수 차단', 'error');
      return;
    }

    const riskProfile = await getActiveRiskProfile();
    const openPositions = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: ap.mode } });
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
        await prisma.signal.create({
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
        }).catch(() => undefined);
      }

      const judge = await runAiJudge({
        candidate: item.candidate,
        quant: item.quant,
        signals: item.signals,
        regime: regimeResult.regime,
      });

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
        `${item.candidate.symbol} ${judge.decision?.action ?? 'REJECT'}`,
        'info',
      );

      if (!judge.valid || !judge.decision || judge.decision.action !== 'BUY') {
        await writeJournal({
          symbol: item.candidate.symbol,
          strategyId: topSignal?.strategyId,
          rejectWhy: judge.decision?.reasons.join('; ') ?? judge.error ?? 'rejected',
          marketRegime: regimeResult.regime,
          quantScore: item.quant.total,
          aiAction: judge.decision?.action ?? 'REJECT',
          aiConfidence: judge.decision?.confidence,
          riskDecision: 'SKIPPED',
        });
        continue;
      }

      // Tier4-only guard: event_news alone cannot live-enter
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
        aiValid: judge.valid && judge.providerStatus !== 'MALFORMED' && judge.providerStatus !== 'TIMEOUT',
        circuitBreakerOn: ap.circuitBreakerOn,
        stopNewEntries: ap.stopMode === 'STOP_NEW_ENTRIES',
        proposedNotional: proposed,
      });

      if (!risk.allowed) {
        await emitEvent('RISK_REJECT', `${item.candidate.symbol} ${risk.reasons.join(',')}`, 'warn');
        await writeJournal({
          symbol: item.candidate.symbol,
          strategyId: topSignal?.strategyId,
          rejectWhy: risk.reasons.join(','),
          marketRegime: regimeResult.regime,
          quantScore: item.quant.total,
          aiAction: judge.decision.action,
          aiConfidence: judge.decision.confidence,
          riskDecision: 'REJECT',
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

      try {
        const order = await placeManagedOrder({
          broker,
          mode: ap.mode === 'LIVE' ? 'LIVE' : 'PAPER',
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
              mode: ap.mode,
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
            buyWhy: judge.decision.reasons.join('; '),
            marketRegime: regimeResult.regime,
            quantScore: item.quant.total,
            aiAction: judge.decision.action,
            aiConfidence: judge.decision.confidence,
            riskDecision: 'PASS',
            entryPrice: order.averageFilledPrice,
            quantity: order.filledQuantity,
            commission: order.commission,
            openedAt: new Date(),
          });
          await emitEvent('FILL_BUY', `${item.candidate.symbol} 체결 확인`, 'trade');
          await prisma.autopilotStateRow.update({
            where: { id: 'singleton' },
            data: { aiStatusText: `${item.candidate.symbol} 보유 관리중` },
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'order-error';
        await emitEvent('ORDER_ERROR', msg, 'error');
      }

      // one new entry per tick to reduce churn
      break;
    }

    // Performance worker snapshot
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

  private async managePositions(regularClosed: boolean) {
    const ap = await ensureAutopilotRow();
    const broker = getActiveBroker(ap.mode === 'LIVE' ? 'LIVE' : 'PAPER');
    await broker.connect();
    const opens = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: ap.mode } });
    for (const pos of opens) {
      const quote = await broker.getQuote(pos.symbol);
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

      await prisma.positionRow.update({ where: { id: pos.id }, data: { status: 'EXITING' } });
      try {
        const order = await placeManagedOrder({
          broker,
          mode: ap.mode === 'LIVE' ? 'LIVE' : 'PAPER',
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
    const opens = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: ap.mode } });
    if (!opens.length) {
      if (ap.stopMode === 'CLOSE_AND_STOP') {
        await prisma.autopilotStateRow.update({
          where: { id: 'singleton' },
          data: { stopMode: 'NONE' },
        });
      }
      return;
    }
    const broker = getActiveBroker(ap.mode === 'LIVE' ? 'LIVE' : 'PAPER');
    await broker.connect();

    // PAPER: ensure ledger mirrors DB open positions before forced exits
    if (ap.mode === 'PAPER') {
      const paper = getPaperBroker();
      for (const pos of opens) {
        paper.forcePosition(pos.symbol, pos.quantity, pos.entryPrice);
      }
    }

    for (const pos of opens) {
      try {
        const order = await placeManagedOrder({
          broker,
          mode: ap.mode === 'LIVE' ? 'LIVE' : 'PAPER',
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
          data: { status: 'CLOSED', exitReason: reason, closedAt: new Date(), realizedPnl: order.averageFilledPrice != null ? (order.averageFilledPrice - pos.entryPrice) * pos.quantity : undefined },
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
