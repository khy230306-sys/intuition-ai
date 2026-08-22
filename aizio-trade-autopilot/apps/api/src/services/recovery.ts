import { prisma } from '../db/client.js';
import { getActiveBroker, getPaperBroker, getTossBroker } from '../brokers/index.js';
import { emitEvent } from './events.js';
import { ensureAutopilotRow, setState } from './autopilot.js';
import { getMarketSession, isRegularSessionOpen } from '../engines/marketSession.js';
import { tossConfigured } from '../config/env.js';

export async function runRecovery(): Promise<{ resumed: boolean; details: string[] }> {
  const details: string[] = [];
  const ap = await ensureAutopilotRow();
  details.push(`autopilot.enabled=${ap.enabled} state=${ap.state}`);

  if (!ap.enabled) {
    details.push('skip resume: enabled=false');
    return { resumed: false, details };
  }

  const mode = ap.mode === 'LIVE' ? 'LIVE' : 'PAPER';
  const broker = getActiveBroker(mode);

  try {
    await broker.connect();
    details.push(`broker.connect ${broker.name} OK`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'broker-connect-failed';
    details.push(`broker.connect FAIL ${msg}`);
    await setState('HALTED', {
      haltReason: `RECOVERY_BROKER:${msg}`,
      readiness: 'HALTED',
    });
    await emitEvent('RECOVERY_HALT', '복구 중 브로커 연결 실패', 'error', { msg });
    return { resumed: false, details };
  }

  const account = await broker.getAccount();
  details.push(`account ${account.accountNo}`);
  const positions = await broker.getPositions();
  details.push(`broker positions=${positions.length}`);
  const openOrders = await broker.getOpenOrders();
  details.push(`openOrders=${openOrders.length}`);

  // Reconcile: broker is source of truth
  const dbOpen = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode } });
  const brokerSymbols = new Set(positions.map((p) => p.symbol));

  for (const dbp of dbOpen) {
    if (!brokerSymbols.has(dbp.symbol)) {
      await prisma.positionRow.update({
        where: { id: dbp.id },
        data: { status: 'CLOSED', exitReason: 'RECONCILE_MISSING_AT_BROKER', closedAt: new Date() },
      });
      details.push(`closed DB position missing at broker: ${dbp.symbol}`);
    }
  }

  for (const bp of positions) {
    const existing = dbOpen.find((d) => d.symbol === bp.symbol);
    if (!existing) {
      await prisma.positionRow.create({
        data: {
          symbol: bp.symbol,
          entryPrice: bp.averagePurchasePrice,
          quantity: bp.quantity,
          strategyId: 'reconcile',
          openedAt: new Date(),
          highestPrice: bp.lastPrice,
          lowestPrice: bp.lastPrice,
          status: 'OPEN',
          mode,
        },
      });
      details.push(`imported broker position: ${bp.symbol}`);
    } else if (existing.quantity !== bp.quantity) {
      await prisma.positionRow.update({
        where: { id: existing.id },
        data: { quantity: bp.quantity, entryPrice: bp.averagePurchasePrice },
      });
      details.push(`qty reconciled ${bp.symbol}`);
    }
  }

  for (const oo of openOrders) {
    details.push(`open order ${oo.orderId} ${oo.symbol} ${oo.status}`);
    if (String(oo.status) === 'UNKNOWN') {
      await setState('HALTED', { haltReason: 'UNKNOWN_ORDER_STATE', readiness: 'HALTED' });
      await emitEvent('RECOVERY_HALT', '알 수 없는 주문 상태', 'error');
      return { resumed: false, details };
    }
  }

  const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
  await prisma.autopilotStateRow.update({
    where: { id: 'singleton' },
    data: { lastMarketCheckAt: new Date() },
  });

  if (!session.isTradingDay || session.session === 'CLOSED') {
    await setState('MARKET_CLOSED', {
      aiStatusText: '휴장 대기 — 다음 거래일 자동 재개',
      readiness: mode === 'PAPER' ? 'PAPER_MODE' : 'LIVE_READY',
    });
    await emitEvent('MARKET_CLOSED_WAIT', '휴장 — Autopilot ON 대기', 'info', { session });
    details.push('resumed in MARKET_CLOSED');
    return { resumed: true, details };
  }

  if (isRegularSessionOpen(session) || session.isOpen) {
    await setState('RUNNING', {
      aiStatusText: '시장 탐색중',
      readiness: mode === 'LIVE' ? 'LIVE_RUNNING' : 'PAPER_MODE',
      haltReason: null,
    });
    await emitEvent('AUTOPILOT_RESUME', '서버 재시작 후 Autopilot 복원', 'info');
    details.push('resumed RUNNING');
    return { resumed: true, details };
  }

  await setState('MARKET_CLOSED', { aiStatusText: '세션 대기' });
  details.push('resumed MARKET_CLOSED session wait');
  return { resumed: true, details };
}

export async function bootstrapBrokers() {
  const paper = getPaperBroker();
  await paper.connect();
  if (tossConfigured()) {
    try {
      await getTossBroker().connect();
    } catch {
      // stay NOT_CONFIGURED/ERROR without crashing boot
    }
  }
}
