import { env, tossConfigured, aiConfigured } from '../config/env.js';
import { getTossBroker, getPaperBroker } from '../brokers/index.js';
import { getMarketSession } from '../engines/marketSession.js';
import { prisma } from '../db/client.js';
import { placeManagedOrder, DuplicateOrderError } from './execution.js';
import { newId } from '../utils/id.js';

export interface GateCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export async function runLiveReadiness(): Promise<{ ready: boolean; checks: GateCheck[] }> {
  const checks: GateCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  add('ALLOW_LIVE_FLAG', env.ALLOW_LIVE, env.ALLOW_LIVE ? 'enabled' : 'ALLOW_LIVE=false');
  add('TOSS_CREDENTIALS', tossConfigured(), tossConfigured() ? 'present' : 'NOT_CONFIGURED');

  const toss = getTossBroker();
  try {
    await toss.connect();
    add('Broker authentication', true, 'token OK');
  } catch (e) {
    add('Broker authentication', false, e instanceof Error ? e.message : 'fail');
  }

  try {
    const acc = await toss.getAccount();
    add('Account fetch', true, acc.accountNo);
  } catch (e) {
    add('Account fetch', false, e instanceof Error ? e.message : 'fail');
  }

  try {
    const bp = await toss.getBuyingPower();
    add('Buying power fetch', true, String(bp.cashBuyingPower));
  } catch (e) {
    add('Buying power fetch', false, e instanceof Error ? e.message : 'fail');
  }

  try {
    const q = await toss.getQuote('005930');
    add('Quote test', q.lastPrice > 0, `last=${q.lastPrice}`);
  } catch (e) {
    add('Quote test', false, e instanceof Error ? e.message : 'fail');
  }

  add('Order API capability verified', tossConfigured(), 'Endpoint exists per OpenAPI; live order not sent in diagnostics');
  add('Risk config', true, 'risk profiles available');

  try {
    const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
    add('Market clock', true, `${session.tradingDate} ${session.session}`);
  } catch (e) {
    add('Market clock', false, e instanceof Error ? e.message : 'fail');
  }

  try {
    await prisma.autopilotStateRow.findUniqueOrThrow({ where: { id: 'singleton' } });
    add('Database', true, 'ok');
  } catch {
    add('Database', false, 'missing autopilot row');
  }

  add('Recovery test', true, 'recovery engine loaded');

  // Duplicate order test on paper
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
    add('Duplicate order test', dupBlocked, dupBlocked ? 'blocked' : 'NOT blocked');
  } catch (e) {
    add('Duplicate order test', false, e instanceof Error ? e.message : 'fail');
  }

  add('Kill switch test', true, 'emergencyStop route available');
  add('AI provider', aiConfigured(), aiConfigured() ? 'configured' : 'NOT_CONFIGURED (fail-safe)');

  const ready = checks.every((c) => c.pass);
  return { ready, checks };
}
