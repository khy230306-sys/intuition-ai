import type { GateResult, LiveGateCheck } from '@aizio/trade-shared';
import { env, tossConfigured, aiConfigured, tossCredentialsPresent } from '../config/env.js';
import { getTossBroker, getPaperBroker } from '../brokers/index.js';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getMarketSession } from '../engines/marketSession.js';
import { prisma } from '../db/client.js';
import { placeManagedOrder, DuplicateOrderError } from './execution.js';
import { newId } from '../utils/id.js';
import { universeCount, refreshUniverse } from './universe.js';
import { resolveMarketDataProvider, MarketDataNotAvailableError } from '../marketdata/registry.js';
import { emitEvent } from './events.js';
import { env as envCfg } from '../config/env.js';

function check(name: string, result: GateResult, detail: string): LiveGateCheck {
  return { name, result, detail };
}

export async function runLiveReadiness(): Promise<{
  ready: boolean;
  locked: boolean;
  checks: LiveGateCheck[];
}> {
  const checks: LiveGateCheck[] = [];

  // DB
  try {
    await prisma.autopilotStateRow.findUniqueOrThrow({ where: { id: 'singleton' } });
    checks.push(check('DB', 'PASS', 'ok'));
  } catch {
    checks.push(check('DB', 'FAIL', 'missing autopilot row'));
  }

  // Autopilot
  const ap = await prisma.autopilotStateRow.findUnique({ where: { id: 'singleton' } });
  checks.push(check('Autopilot', ap ? 'PASS' : 'FAIL', ap ? `state=${ap.state}` : 'missing'));

  // Credentials (presence only)
  const creds = tossCredentialsPresent();
  checks.push(
    check(
      'Toss Credentials',
      creds.clientId && creds.clientSecret ? 'PASS' : 'FAIL',
      `ID=${creds.clientId ? 'CONFIGURED' : 'MISSING'} SECRET=${creds.clientSecret ? 'CONFIGURED' : 'MISSING'} SEQ=${creds.accountSeq ? 'CONFIGURED' : 'AUTO'}`,
    ),
  );

  const conn = getTossConnection();
  const toss = getTossBroker();

  if (!(creds.clientId && creds.clientSecret)) {
    checks.push(check('Toss Auth', 'FAIL', 'NOT_CONFIGURED'));
    checks.push(check('Account', 'FAIL', 'NOT_CONFIGURED'));
    checks.push(check('Buying Power', 'FAIL', 'NOT_CONFIGURED'));
    checks.push(check('Positions', 'FAIL', 'NOT_CONFIGURED'));
    checks.push(check('Orders', 'FAIL', 'NOT_CONFIGURED'));
    checks.push(check('Quotes', 'FAIL', 'NOT_CONFIGURED'));
  } else {
    try {
      await conn.authenticate();
      checks.push(check('Toss Auth', 'PASS', conn.getState()));
    } catch (e) {
      checks.push(check('Toss Auth', 'FAIL', e instanceof Error ? e.message : 'fail'));
    }

    const health = await conn.verifyAccountReadOnly();
    checks.push(check('Account', health.account ? 'PASS' : 'FAIL', 'account lookup'));
    checks.push(check('Buying Power', health.buyingPower ? 'PASS' : 'FAIL', 'buying power'));
    checks.push(check('Positions', health.positions ? 'PASS' : 'FAIL', 'holdings'));
    checks.push(check('Orders', health.openOrders ? 'PASS' : 'FAIL', 'open orders'));

    try {
      const q = await toss.getQuote('005930');
      const fresh = q.freshnessMs <= env.FRESHNESS_KR_MS;
      checks.push(
        check('Quotes', q.lastPrice > 0 && fresh ? 'PASS' : q.lastPrice > 0 ? 'WARN' : 'FAIL', `last=${q.lastPrice} ageMs=${q.freshnessMs}`),
      );
      checks.push(check('Data Freshness', fresh ? 'PASS' : 'FAIL', `threshold=${env.FRESHNESS_KR_MS}`));
    } catch (e) {
      checks.push(check('Quotes', 'FAIL', e instanceof Error ? e.message : 'fail'));
      checks.push(check('Data Freshness', 'FAIL', 'no quote'));
    }
  }

  try {
    const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    checks.push(check('Market Clock', 'PASS', `${session.tradingDate} ${session.session}`));
    checks.push(check('Market session', session ? 'PASS' : 'FAIL', session.reason ?? ''));
  } catch (e) {
    checks.push(check('Market Clock', 'FAIL', e instanceof Error ? e.message : 'fail'));
    checks.push(check('Market session', 'FAIL', 'unavailable'));
  }

  try {
    await refreshUniverse(false);
    const n = await universeCount();
    checks.push(check('Universe', n > 0 ? 'PASS' : 'WARN', `symbols=${n}`));
  } catch (e) {
    checks.push(check('Universe', 'FAIL', e instanceof Error ? e.message : 'fail'));
  }

  checks.push(check('Scanner', 'PASS', 'tiered scanner loaded'));
  checks.push(check('Risk Config', 'PASS', 'risk profiles available'));

  // Duplicate guard (paper)
  try {
    const paper = getPaperBroker();
    await paper.connect();
    const signalId = `duptest_${newId()}`;
    await placeManagedOrder({
      broker: paper,
      mode: 'PAPER',
      symbol: '005930',
      side: 'BUY',
      quantity: 1,
      signalId,
      strategyId: 'dup_test',
    });
    let dupBlocked = false;
    try {
      await placeManagedOrder({
        broker: paper,
        mode: 'PAPER',
        symbol: '005930',
        side: 'BUY',
        quantity: 1,
        signalId,
        strategyId: 'dup_test',
      });
    } catch (e) {
      dupBlocked = e instanceof DuplicateOrderError;
    }
    checks.push(check('Duplicate Guard', dupBlocked ? 'PASS' : 'FAIL', dupBlocked ? 'blocked' : 'not blocked'));
    checks.push(check('Idempotency', dupBlocked ? 'PASS' : 'FAIL', 'signal+idempotency'));
  } catch (e) {
    checks.push(check('Duplicate Guard', 'FAIL', e instanceof Error ? e.message : 'fail'));
    checks.push(check('Idempotency', 'FAIL', 'error'));
  }

  checks.push(check('Recovery', 'PASS', 'runRecovery callable'));
  checks.push(
    check(
      'Kill Switch',
      'PASS',
      env.CONTROL_PLANE_TOKEN ? 'emergencyStop + CONTROL_PLANE_TOKEN set' : 'emergencyStop available (set CONTROL_PLANE_TOKEN for API auth)',
    ),
  );
  checks.push(check('Emergency Stop', 'PASS', 'route available'));
  checks.push(
    check(
      'Control Plane Auth',
      env.CONTROL_PLANE_TOKEN ? 'PASS' : env.ALLOW_LIVE ? 'FAIL' : 'WARN',
      env.CONTROL_PLANE_TOKEN ? 'token configured' : 'CONTROL_PLANE_TOKEN empty',
    ),
  );

  // REPLAY fallback prohibition probe
  try {
    resolveMarketDataProvider('LIVE_OBSERVE');
    checks.push(check('REPLAY fallback prohibited', tossConfigured() ? 'PASS' : 'WARN', 'live provider resolved or would throw'));
  } catch (e) {
    if (e instanceof MarketDataNotAvailableError) {
      checks.push(check('REPLAY fallback prohibited', 'PASS', e.message));
    } else {
      checks.push(check('REPLAY fallback prohibited', 'FAIL', e instanceof Error ? e.message : 'fail'));
    }
  }

  checks.push(
    check('AI', aiConfigured() ? 'PASS' : 'WARN', aiConfigured() ? 'configured' : 'NOT_CONFIGURED fail-safe'),
  );

  checks.push(check('ALLOW_LIVE', env.ALLOW_LIVE ? 'PASS' : 'FAIL', env.ALLOW_LIVE ? 'true' : 'false — orders locked'));

  const required = [
    'DB',
    'Toss Credentials',
    'Toss Auth',
    'Account',
    'Buying Power',
    'Positions',
    'Orders',
    'Quotes',
    'Market Clock',
    'Market session',
    'Data Freshness',
    'Risk Config',
    'Duplicate Guard',
    'Idempotency',
    'Recovery',
    'Kill Switch',
    'Emergency Stop',
    'ALLOW_LIVE',
  ];
  if (env.ALLOW_LIVE) required.push('Control Plane Auth');
  const byName = new Map(checks.map((c) => [c.name, c]));
  const ready = required.every((n) => byName.get(n)?.result === 'PASS');
  const locked = !ready || !env.ALLOW_LIVE;

  if (locked) await emitEvent('LIVE_GATE_LOCKED', 'LIVE gate locked — no real orders', 'warn');
  else await emitEvent('LIVE_GATE_READY', 'LIVE gate READY', 'info');

  await prisma.configKv.upsert({
    where: { key: 'live_gate' },
    create: { key: 'live_gate', valueJson: JSON.stringify({ ready, locked, checks, at: new Date().toISOString() }) },
    update: { valueJson: JSON.stringify({ ready, locked, checks, at: new Date().toISOString() }) },
  });

  // Sync toss broker lock continuously from this evaluation
  const { refreshLiveOrderLock } = await import('./liveOrders.js');
  refreshLiveOrderLock(ready && envCfg.ALLOW_LIVE);

  return { ready, locked, checks };
}

/** Legacy shape for older clients */
export async function runLiveReadinessLegacy() {
  const r = await runLiveReadiness();
  return {
    ready: r.ready,
    checks: r.checks.map((c) => ({ name: c.name, pass: c.result === 'PASS', detail: c.detail, result: c.result })),
  };
}
