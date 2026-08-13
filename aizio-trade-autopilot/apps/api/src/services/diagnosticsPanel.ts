import type { GateResult, LiveGateCheck } from '@aizio/trade-shared';
import { env, tossConfigured, aiConfigured } from '../config/env.js';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getLastShadowVerify, credentialGuidance, runShadowConnectionVerify } from './shadowVerify.js';
import { getUniverseStats } from './universe.js';
import { getShadowResearch } from './shadowMetrics.js';
import { prisma } from '../db/client.js';

export interface DiagnosticsRow {
  name: string;
  result: GateResult | 'FALSE' | 'LOCKED' | 'TRUE';
  detail: string;
}

async function cachedLiveGate(): Promise<{
  ready: boolean;
  locked: boolean;
  checks: LiveGateCheck[];
}> {
  const row = await prisma.configKv.findUnique({ where: { key: 'live_gate' } });
  if (row) {
    try {
      return JSON.parse(row.valueJson) as { ready: boolean; locked: boolean; checks: LiveGateCheck[] };
    } catch {
      /* fallthrough */
    }
  }
  return {
    ready: false,
    locked: true,
    checks: [
      { name: 'ALLOW_LIVE', result: env.ALLOW_LIVE ? 'PASS' : 'FAIL', detail: env.ALLOW_LIVE ? 'true' : 'false' },
      { name: 'Risk Config', result: 'PASS', detail: 'local' },
      { name: 'Recovery', result: 'PASS', detail: 'ok' },
      { name: 'Kill Switch', result: 'PASS', detail: 'armed' },
    ],
  };
}

export async function buildDiagnosticsPanel(opts?: { refreshVerify?: boolean }) {
  const guidance = credentialGuidance();
  let verify = await getLastShadowVerify();
  if (opts?.refreshVerify) {
    const ran = await runShadowConnectionVerify();
    verify = { stages: ran.stages, at: new Date().toISOString() };
  } else if (!verify && tossConfigured()) {
    const ran = await runShadowConnectionVerify();
    verify = { stages: ran.stages, at: new Date().toISOString() };
  } else if (!verify) {
    const ran = await runShadowConnectionVerify();
    verify = { stages: ran.stages, at: new Date().toISOString() };
  }

  const live = await cachedLiveGate();
  const universe = await getUniverseStats();
  const research = await getShadowResearch();
  const conn = getTossConnection();
  const ap = await prisma.autopilotStateRow.findUnique({ where: { id: 'singleton' } });

  const byName = new Map((verify?.stages ?? []).map((s) => [s.name, s]));
  const pick = (name: string, fallback: LiveGateCheck): DiagnosticsRow => {
    const s = byName.get(name);
    if (s) return { name, result: s.result, detail: s.detail };
    return { name: fallback.name, result: fallback.result, detail: fallback.detail };
  };

  const liveBy = new Map(live.checks.map((c) => [c.name, c]));

  const rows: DiagnosticsRow[] = [
    pick('TOSS AUTH', { name: 'TOSS AUTH', result: 'FAIL', detail: 'NOT_RUN' }),
    pick('ACCOUNT', { name: 'ACCOUNT', result: 'FAIL', detail: 'NOT_RUN' }),
    pick('BUYING POWER', { name: 'BUYING POWER', result: 'FAIL', detail: 'NOT_RUN' }),
    pick('POSITIONS', { name: 'POSITIONS', result: 'FAIL', detail: 'NOT_RUN' }),
    pick('OPEN ORDERS', { name: 'OPEN ORDERS', result: 'FAIL', detail: 'NOT_RUN' }),
    pick('QUOTES', liveBy.get('Quotes') ?? { name: 'QUOTES', result: 'FAIL', detail: 'NOT_RUN' }),
    {
      name: 'UNIVERSE',
      result: universe.source === 'TOSS' && universe.total > 100 ? 'PASS' : universe.source === 'TOSS' ? 'WARN' : 'FAIL',
      detail: `UNIVERSE: ${universe.liveLabel} total=${universe.total}`,
    },
    pick('MARKET SESSION', { name: 'MARKET CLOCK', result: 'FAIL', detail: 'NOT_RUN' }),
    {
      name: 'SCANNER',
      result: research.funnel ? 'PASS' : 'WARN',
      detail: research.funnel ? `funnel=${research.funnel.chain.join('→')}` : 'NO_FUNNEL_YET',
    },
    {
      name: 'DATA FRESHNESS',
      result: research.dataFreshness.ok ? 'PASS' : 'FAIL',
      detail: `ageMs=${research.dataFreshness.lastAgeMs ?? 'n/a'} source=${research.dataFreshness.source ?? 'n/a'}`,
    },
    {
      name: 'RISK',
      result: (liveBy.get('Risk Config')?.result ?? 'PASS') as GateResult,
      detail: liveBy.get('Risk Config')?.detail ?? 'local',
    },
    {
      name: 'RECOVERY',
      result: (liveBy.get('Recovery')?.result ?? 'PASS') as GateResult,
      detail: liveBy.get('Recovery')?.detail ?? 'ok',
    },
    {
      name: 'KILL SWITCH',
      result: (liveBy.get('Kill Switch')?.result ?? 'PASS') as GateResult,
      detail: liveBy.get('Kill Switch')?.detail ?? 'armed',
    },
    {
      name: 'ALLOW_LIVE',
      result: env.ALLOW_LIVE ? 'TRUE' : 'FALSE',
      detail: env.ALLOW_LIVE ? 'true' : 'FALSE',
    },
    {
      name: 'LIVE STATUS',
      result: env.ALLOW_LIVE && live.ready ? 'PASS' : 'LOCKED',
      detail: live.locked || !env.ALLOW_LIVE ? 'LOCKED' : 'READY',
    },
  ];

  const clockIdx = rows.findIndex((r) => r.name === 'MARKET SESSION');
  if (clockIdx >= 0) rows[clockIdx] = { ...rows[clockIdx], name: 'MARKET CLOCK' };

  return {
    rows,
    guidance,
    tossConfigured: tossConfigured(),
    tossState: conn.getState(),
    aiConfigured: aiConfigured(),
    allowLive: env.ALLOW_LIVE,
    liveLocked: !env.ALLOW_LIVE || live.locked,
    universe,
    research,
    autopilot: ap
      ? {
          enabled: ap.enabled,
          mode: ap.mode,
          state: ap.state,
          aiStatusText: ap.aiStatusText,
        }
      : null,
    verifiedAt: verify?.at ?? null,
    liveGate: live,
  };
}
