import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  AccountSummary,
  AutopilotPublicState,
  DataLane,
  HealthSnapshot,
  SystemReadiness,
  TradingMode,
} from '@aizio/trade-shared';
import {
  ensureAutopilotRow,
  startAutopilot,
  stopAutopilot,
  emergencyStop,
  getActiveRiskProfile,
} from '../services/autopilot.js';
import { recentActivity } from '../services/events.js';
import { getKrVenueSessionsAsync, getMarketSession } from '../engines/marketSession.js';
import { computePerformance } from '../engines/performance.js';
import { prisma } from '../db/client.js';
import { env, tossConfigured, aiConfigured } from '../config/env.js';
import { getPaperBroker, getTossBroker } from '../brokers/index.js';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getReplayProvider, getTossMarketDataProvider } from '../marketdata/index.js';
import { runLiveReadiness } from '../services/liveGate.js';
import { runRecovery } from '../services/recovery.js';
import { universeCount, getUniverseStats } from '../services/universe.js';
import { credentialGuidance, getLastShadowVerify, runShadowConnectionVerify } from '../services/shadowVerify.js';
import { buildDiagnosticsPanel } from '../services/diagnosticsPanel.js';
import { getShadowResearch } from '../services/shadowMetrics.js';

function laneFor(mode: string): DataLane {
  if (mode === 'LIVE' || mode === 'LIVE_OBSERVE') return 'LIVE';
  if (mode === 'SHADOW') return 'SHADOW';
  if (mode === 'PAPER_REPLAY') return 'REPLAY';
  return 'PAPER';
}

async function buildHealth(ap: Awaited<ReturnType<typeof ensureAutopilotRow>>): Promise<HealthSnapshot> {
  const conn = getTossConnection();
  const mode = ap.mode as TradingMode;
  let broker: HealthSnapshot['broker'] = 'NOT_CONFIGURED';
  if (mode === 'PAPER' || mode === 'PAPER_REPLAY' || mode === 'SHADOW') {
    const h = await getPaperBroker().health();
    broker = mode === 'SHADOW' ? (conn.getState() === 'CONNECTED' ? 'CONNECTED' : conn.getState()) : (h.status as SystemReadiness);
  } else if (tossConfigured()) {
    broker = conn.getState();
  }

  let marketData: HealthSnapshot['marketData'] = 'REPLAY';
  if (mode === 'SHADOW' || mode === 'LIVE_OBSERVE' || mode === 'LIVE') {
    marketData = tossConfigured() ? getTossMarketDataProvider().status : 'NOT_CONFIGURED';
  } else if (env.MARKET_DATA_PROVIDER === 'replay' || mode === 'PAPER_REPLAY') {
    marketData = 'REPLAY';
  } else {
    marketData = getReplayProvider().status;
  }

  const ai: SystemReadiness = aiConfigured() ? 'LIVE_READY' : 'NOT_CONFIGURED';
  let readiness: SystemReadiness = 'NOT_CONFIGURED';
  if (ap.state === 'HALTED') readiness = 'HALTED';
  else if (mode === 'SHADOW') readiness = 'SHADOW';
  else if (mode === 'LIVE_OBSERVE') readiness = 'LIVE_OBSERVE';
  else if ((mode === 'PAPER' || mode === 'PAPER_REPLAY') && ap.enabled) readiness = 'PAPER_MODE';
  else if (mode === 'LIVE' && ap.enabled && ap.state === 'RUNNING') readiness = 'LIVE_RUNNING';
  else if (mode === 'LIVE') readiness = tossConfigured() ? 'LIVE_READY' : 'NOT_CONFIGURED';
  else readiness = 'PAPER_MODE';

  const gateRow = await prisma.configKv.findUnique({ where: { key: 'live_gate' } });
  let liveGate: HealthSnapshot['liveGate'] = 'NOT_CONFIGURED';
  if (gateRow) {
    try {
      const g = JSON.parse(gateRow.valueJson) as { ready?: boolean; locked?: boolean };
      liveGate = g.ready && !g.locked ? 'READY' : 'LOCKED';
    } catch {
      liveGate = 'LOCKED';
    }
  } else if (!env.ALLOW_LIVE) liveGate = 'LOCKED';

  return {
    server: 'OK',
    broker,
    marketData,
    ai,
    readiness,
    liveGate,
    dataLane: laneFor(mode),
    lastHeartbeatAt: ap.lastHeartbeatAt?.toISOString() ?? null,
  };
}

async function realAccountSummary(): Promise<AccountSummary | null> {
  if (!tossConfigured()) return null;
  try {
    const toss = getTossBroker();
    await toss.connect();
    const [acc, bp, positions, orders] = await Promise.all([
      toss.getAccount(),
      toss.getBuyingPower(),
      toss.getPositions(),
      toss.getOpenOrders(),
    ]);
    const unrealized = positions.reduce(
      (s, p) => s + (p.lastPrice - p.averagePurchasePrice) * p.quantity,
      0,
    );
    return {
      lane: 'LIVE',
      source: 'TOSS',
      cash: acc.cash,
      buyingPower: bp.cashBuyingPower,
      totalEquity: acc.cash + positions.reduce((s, p) => s + p.marketValue, 0),
      positionsCount: positions.length,
      openOrdersCount: orders.length,
      unrealizedPnl: unrealized,
      dayRealizedPnl: 0,
    };
  } catch {
    return null;
  }
}

async function shadowAccountSummary(mode: TradingMode): Promise<AccountSummary | null> {
  if (mode !== 'SHADOW' && mode !== 'PAPER' && mode !== 'PAPER_REPLAY') return null;
  try {
    const paper = getPaperBroker();
    await paper.connect();
    const acc = await paper.getAccount();
    const positions = await paper.getPositions();
    const unrealized = positions.reduce(
      (s, p) => s + (p.lastPrice - p.averagePurchasePrice) * p.quantity,
      0,
    );
    return {
      lane: mode === 'SHADOW' ? 'SHADOW' : mode === 'PAPER_REPLAY' ? 'REPLAY' : 'PAPER',
      source: mode === 'SHADOW' ? 'PAPER_ON_LIVE_QUOTES' : 'PAPER',
      cash: acc.cash,
      buyingPower: acc.cash,
      totalEquity: acc.cash + positions.reduce((s, p) => s + p.marketValue, 0),
      positionsCount: positions.length,
      openOrdersCount: (await paper.getOpenOrders()).length,
      unrealizedPnl: unrealized,
    };
  } catch {
    return null;
  }
}

async function accountSummary(mode: TradingMode): Promise<AccountSummary | null> {
  if (mode === 'LIVE' || mode === 'LIVE_OBSERVE') return realAccountSummary();
  return shadowAccountSummary(mode);
}

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    const health = await buildHealth(await ensureAutopilotRow());
    return {
      ok: true,
      health,
      tossConfigured: tossConfigured(),
      aiConfigured: aiConfigured(),
      tossState: getTossConnection().getState(),
      websocketStreaming: false,
      openApiVersion: '1.2.14',
      note: 'Toss Open API is REST-only per official docs',
    };
  });

  app.get('/api/status', async (): Promise<AutopilotPublicState> => {
    const ap = await ensureAutopilotRow();
    const mode = ap.mode as TradingMode;
    const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    const venues = await getKrVenueSessionsAsync({ preferTossCalendar: tossConfigured() });
    const perf = await computePerformance();
    const openPositions = await prisma.positionRow.count({ where: { status: 'OPEN' } });
    const activity = await recentActivity(30);
    const today = new Date().toISOString().slice(0, 10);
    const day = await prisma.dailyPerformance.findUnique({ where: { date: today } });
    const health = await buildHealth(ap);
    const brokerHealth = getTossConnection().getLastHealth();
    const gateRow = await prisma.configKv.findUnique({ where: { key: 'live_gate' } });
    let liveGateChecks = undefined;
    if (gateRow) {
      try {
        liveGateChecks = (JSON.parse(gateRow.valueJson) as { checks?: AutopilotPublicState['liveGateChecks'] }).checks;
      } catch {
        /* */
      }
    }
    const universeStats = await getUniverseStats();
    const research = await getShadowResearch();
    const panel = await buildDiagnosticsPanel({ refreshVerify: false });
    const guidance = credentialGuidance();
    const real = await realAccountSummary();
    const shadow = await shadowAccountSummary(mode === 'LIVE' || mode === 'LIVE_OBSERVE' ? 'SHADOW' : mode);
    // For LIVE_OBSERVE still expose paper/shadow lane separately when paper ledger exists
    const shadowAlways =
      mode === 'SHADOW'
        ? shadow
        : mode === 'PAPER' || mode === 'PAPER_REPLAY'
          ? shadow
          : await shadowAccountSummary('SHADOW');

    return {
      enabled: ap.enabled,
      state: ap.state as AutopilotPublicState['state'],
      mode: mode,
      stopMode: ap.stopMode as AutopilotPublicState['stopMode'],
      startedAt: ap.startedAt?.toISOString() ?? null,
      stoppedAt: ap.stoppedAt?.toISOString() ?? null,
      lastHeartbeatAt: ap.lastHeartbeatAt?.toISOString() ?? null,
      lastMarketCheckAt: ap.lastMarketCheckAt?.toISOString() ?? null,
      haltReason: ap.haltReason,
      capital: ap.capital,
      riskLevel: ap.riskLevel as AutopilotPublicState['riskLevel'],
      todayPnl: day?.netPnl ?? 0,
      cumulativePnl: perf.netPnl,
      openPositions,
      aiStatusText: ap.aiStatusText,
      marketSession: session,
      venueSessions: venues,
      health,
      brokerHealth,
      accountSummary: await accountSummary(mode),
      realAccount: real,
      shadowAccount: mode === 'SHADOW' ? shadow : shadowAlways,
      activity,
      universeCount: await universeCount(),
      universeStats,
      universeLabel: universeStats.liveLabel,
      liveGateChecks,
      diagnosticsPanel: panel.rows,
      credentialGuidance: guidance.needed ? guidance.message : null,
      marketWaiting: research.marketWaiting,
      shadowResearch: {
        funnelChain: research.funnel?.chain,
        regime: research.regime,
        quantEligible: research.quantEligibleTotal,
        aiBlocked: research.aiBlockedTotal,
        shadowTrades: research.shadowTrades,
        shadowPnl: research.shadowPnl,
      },
    };
  });

  app.post('/api/autopilot/start', async (req, reply) => {
    const body = z
      .object({
        capital: z.number().positive().default(env.DEFAULT_CAPITAL),
        riskLevel: z.enum(['STABLE', 'BALANCED', 'AGGRESSIVE']).default('BALANCED'),
        mode: z.enum(['PAPER', 'PAPER_REPLAY', 'SHADOW', 'LIVE_OBSERVE', 'LIVE']).default('PAPER'),
      })
      .parse(req.body ?? {});
    try {
      const row = await startAutopilot(body);
      return { ok: true, state: row.state, enabled: row.enabled, mode: row.mode };
    } catch (e) {
      return reply.code(400).send({ ok: false, error: e instanceof Error ? e.message : 'start-failed' });
    }
  });

  app.post('/api/autopilot/stop', async (req) => {
    const body = z
      .object({
        stopMode: z.enum(['STOP_NEW_ENTRIES', 'CLOSE_AND_STOP']).default('STOP_NEW_ENTRIES'),
      })
      .parse(req.body ?? {});
    const row = await stopAutopilot(body.stopMode);
    return { ok: true, state: row.state, enabled: row.enabled, stopMode: row.stopMode };
  });

  app.post('/api/autopilot/emergency-stop', async () => {
    const row = await emergencyStop();
    return { ok: true, state: row.state };
  });

  app.get('/api/positions', async () => {
    const rows = await prisma.positionRow.findMany({ orderBy: { openedAt: 'desc' }, take: 100 });
    return { positions: rows };
  });

  app.get('/api/orders', async () => {
    const rows = await prisma.orderRow.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return { orders: rows };
  });

  app.get('/api/journal', async () => {
    const rows = await prisma.tradeJournal.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return { journal: rows };
  });

  app.get('/api/performance', async () => computePerformance());
  app.get('/api/activity', async () => ({ activity: await recentActivity(100) }));
  app.get('/api/risk', async () => ({ profile: await getActiveRiskProfile() }));

  app.get('/api/market/session', async () => {
    const kr = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    const us = await getMarketSession('US', { preferTossCalendar: tossConfigured() });
    const venues = await getKrVenueSessionsAsync({ preferTossCalendar: tossConfigured() });
    return { kr, us, venues };
  });

  app.get('/api/account', async () => {
    const ap = await ensureAutopilotRow();
    return { account: await accountSummary(ap.mode as TradingMode) };
  });

  app.get('/api/diagnostics/live', async () => runLiveReadiness());
  app.post('/api/diagnostics/recovery', async () => runRecovery());
  app.get('/api/diagnostics/panel', async () => buildDiagnosticsPanel({ refreshVerify: false }));
  app.post('/api/diagnostics/shadow-verify', async () => runShadowConnectionVerify());
  app.get('/api/diagnostics/shadow-verify', async () => getLastShadowVerify());
  app.get('/api/diagnostics/shadow-research', async () => getShadowResearch());
  app.get('/api/diagnostics/v12-report', async () => {
    const { buildV12ShadowReport, formatV12ReportText } = await import('../services/v12Report.js');
    const report = await buildV12ShadowReport();
    return { ...report, text: formatV12ReportText(report) };
  });
  app.get('/api/universe/stats', async () => getUniverseStats());
  app.get('/api/credentials/guidance', async () => credentialGuidance());

  app.get('/api/config/public', async () => ({
    tossConfigured: tossConfigured(),
    aiConfigured: aiConfigured(),
    allowLive: env.ALLOW_LIVE,
    marketDataProvider: env.MARKET_DATA_PROVIDER,
    defaultCapital: env.DEFAULT_CAPITAL,
    aiRequiredForEntry: env.AI_REQUIRED_FOR_ENTRY,
    tossStreaming: false,
    openApiVersion: '1.2.14',
    modes: ['PAPER', 'PAPER_REPLAY', 'SHADOW', 'LIVE_OBSERVE', 'LIVE'],
    credentialGuidance: credentialGuidance(),
  }));
}
