import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ensureAutopilotRow,
  startAutopilot,
  stopAutopilot,
  emergencyStop,
  getActiveRiskProfile,
} from '../services/autopilot.js';
import { recentActivity } from '../services/events.js';
import { getMarketSession } from '../engines/marketSession.js';
import { computePerformance } from '../engines/performance.js';
import { prisma } from '../db/client.js';
import { env, tossConfigured, aiConfigured } from '../config/env.js';
import { getPaperBroker, getTossBroker } from '../brokers/index.js';
import { getMarketDataProvider } from '../marketdata/index.js';
import { runLiveReadiness } from '../services/liveGate.js';
import { runRecovery } from '../services/recovery.js';
import type { AutopilotPublicState, HealthSnapshot, SystemReadiness } from '@aizio/trade-shared';

async function buildHealth(): Promise<HealthSnapshot> {
  const ap = await ensureAutopilotRow();
  const market = getMarketDataProvider();
  let brokerStatus: SystemReadiness = 'NOT_CONFIGURED';
  if (ap.mode === 'PAPER') {
    const h = await getPaperBroker().health();
    brokerStatus = (h.status as SystemReadiness) || 'PAPER_MODE';
  } else if (tossConfigured()) {
    const h = await getTossBroker().health();
    brokerStatus = h.ok ? (ap.state === 'RUNNING' ? 'LIVE_RUNNING' : 'LIVE_READY') : 'DEGRADED';
  }

  const ai: SystemReadiness = aiConfigured() ? 'LIVE_READY' : 'NOT_CONFIGURED';
  let readiness: SystemReadiness = 'NOT_CONFIGURED';
  if (ap.state === 'HALTED') readiness = 'HALTED';
  else if (ap.mode === 'PAPER' && ap.enabled) readiness = 'PAPER_MODE';
  else if (ap.mode === 'LIVE' && ap.enabled && ap.state === 'RUNNING') readiness = 'LIVE_RUNNING';
  else if (ap.mode === 'LIVE') readiness = tossConfigured() ? 'LIVE_READY' : 'NOT_CONFIGURED';
  else if (ap.mode === 'PAPER') readiness = 'PAPER_MODE';

  return {
    server: 'OK',
    broker: brokerStatus,
    marketData: market.status === 'REPLAY' ? 'REPLAY' : market.status,
    ai,
    readiness,
    lastHeartbeatAt: ap.lastHeartbeatAt?.toISOString() ?? null,
  };
}

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    const health = await buildHealth();
    return {
      ok: true,
      health,
      tossConfigured: tossConfigured(),
      aiConfigured: aiConfigured(),
      websocketStreaming: false,
      note: 'Toss Open API is REST-only per official docs',
    };
  });

  app.get('/api/status', async (): Promise<AutopilotPublicState> => {
    const ap = await ensureAutopilotRow();
    const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    const perf = await computePerformance();
    const openPositions = await prisma.positionRow.count({ where: { status: 'OPEN' } });
    const activity = await recentActivity(30);
    const today = new Date().toISOString().slice(0, 10);
    const day = await prisma.dailyPerformance.findUnique({ where: { date: today } });
    const health = await buildHealth();

    return {
      enabled: ap.enabled,
      state: ap.state as AutopilotPublicState['state'],
      mode: ap.mode as AutopilotPublicState['mode'],
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
      health,
      activity,
    };
  });

  app.post('/api/autopilot/start', async (req, reply) => {
    const body = z
      .object({
        capital: z.number().positive().default(env.DEFAULT_CAPITAL),
        riskLevel: z.enum(['STABLE', 'BALANCED', 'AGGRESSIVE']).default('BALANCED'),
        mode: z.enum(['PAPER', 'LIVE']).default('PAPER'),
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

  app.get('/api/performance', async () => {
    return computePerformance();
  });

  app.get('/api/activity', async () => {
    return { activity: await recentActivity(100) };
  });

  app.get('/api/risk', async () => {
    return { profile: await getActiveRiskProfile() };
  });

  app.get('/api/market/session', async () => {
    const kr = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    const us = await getMarketSession('US', { preferTossCalendar: tossConfigured() });
    return { kr, us };
  });

  app.get('/api/diagnostics/live', async () => {
    return runLiveReadiness();
  });

  app.post('/api/diagnostics/recovery', async () => {
    return runRecovery();
  });

  app.get('/api/config/public', async () => {
    return {
      tossConfigured: tossConfigured(),
      aiConfigured: aiConfigured(),
      allowLive: env.ALLOW_LIVE,
      marketDataProvider: env.MARKET_DATA_PROVIDER,
      defaultCapital: env.DEFAULT_CAPITAL,
      aiRequiredForEntry: env.AI_REQUIRED_FOR_ENTRY,
      tossStreaming: false,
    };
  });
}
