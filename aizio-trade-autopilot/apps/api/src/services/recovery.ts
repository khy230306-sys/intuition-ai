import type { TradingMode } from '@aizio/trade-shared';
import { prisma } from '../db/client.js';
import { getActiveBroker, getPaperBroker, getTossBroker, executionMode, rebindPaperMarketData } from '../brokers/index.js';
import { emitEvent } from './events.js';
import { ensureAutopilotRow, setState } from './autopilot.js';
import { getMarketSession } from '../engines/marketSession.js';
import { tossConfigured } from '../config/env.js';

export async function runRecovery(): Promise<{ resumed: boolean; details: string[] }> {
  const details: string[] = [];
  const ap = await ensureAutopilotRow();
  details.push(`autopilot.enabled=${ap.enabled} state=${ap.state} mode=${ap.mode}`);

  if (!ap.enabled) {
    details.push('skip resume: enabled=false');
    return { resumed: false, details };
  }

  const mode = ap.mode as TradingMode;
  if (mode === 'SHADOW') {
    try {
      rebindPaperMarketData('SHADOW');
    } catch (e) {
      details.push(`SHADOW market rebound FAIL ${e instanceof Error ? e.message : 'err'}`);
    }
  }

  const broker = getActiveBroker(mode);
  const execMode = executionMode(mode);

  try {
    await broker.connect();
    details.push(`broker.connect ${broker.name} OK`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'broker-connect-failed';
    details.push(`broker.connect FAIL ${msg}`);
    // SHADOW/PAPER: do not hard-halt on Toss IP issues if paper can still wait
    if (mode === 'SHADOW' || mode === 'LIVE' || mode === 'LIVE_OBSERVE') {
      await setState('MARKET_CLOSED', {
        haltReason: null,
        readiness: mode === 'SHADOW' ? 'SHADOW' : 'DEGRADED',
        aiStatusText:
          mode === 'SHADOW'
            ? 'MARKET CLOSED · SHADOW WAITING (broker reconnect pending)'
            : `복구 대기: ${msg.slice(0, 80)}`,
      });
      await emitEvent('RECOVERY_DEGRADED', `broker connect failed — waiting: ${msg}`, 'warn');
      return { resumed: true, details };
    }
    await setState('HALTED', {
      haltReason: `RECOVERY_BROKER:${msg}`,
      readiness: 'HALTED',
    });
    await emitEvent('RECOVERY_HALT', '복구 중 브로커 연결 실패', 'error', { msg });
    return { resumed: false, details };
  }

  try {
    const account = await broker.getAccount();
    details.push(`account ${account.accountNo}`);
  } catch (e) {
    details.push(`account FAIL ${e instanceof Error ? e.message : 'err'}`);
  }

  let positions: Awaited<ReturnType<typeof broker.getPositions>> = [];
  try {
    positions = await broker.getPositions();
    details.push(`broker positions=${positions.length}`);
  } catch (e) {
    details.push(`positions FAIL ${e instanceof Error ? e.message : 'err'}`);
  }

  let openOrders: Awaited<ReturnType<typeof broker.getOpenOrders>> = [];
  try {
    openOrders = await broker.getOpenOrders();
    details.push(`openOrders=${openOrders.length}`);
  } catch (e) {
    details.push(`openOrders FAIL ${e instanceof Error ? e.message : 'err'}`);
  }

  // Reconcile DB ↔ broker
  const dbOpen = await prisma.positionRow.findMany({ where: { status: 'OPEN', mode: execMode } });
  const brokerSymbols = new Set(positions.map((p) => p.symbol));

  if (mode === 'LIVE' || mode === 'LIVE_OBSERVE') {
    // Live broker is source of truth
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
            mode: execMode,
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
  } else {
    // PAPER / SHADOW: DB open positions are source of truth — restore paper ledger
    const paper = getPaperBroker();
    for (const dbp of dbOpen) {
      paper.forcePosition(dbp.symbol, dbp.quantity, dbp.entryPrice);
      details.push(`restored paper ledger ${dbp.symbol} qty=${dbp.quantity}`);
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

  const tradingActive = session.isTradingDay && session.session === 'REGULAR';
  const waitText =
    mode === 'SHADOW'
      ? 'MARKET CLOSED · SHADOW WAITING'
      : '휴장/세션 대기 — 다음 거래일 자동 재개';

  if (!tradingActive) {
    await setState('MARKET_CLOSED', {
      aiStatusText: waitText,
      readiness: mode === 'SHADOW' ? 'SHADOW' : mode === 'LIVE' ? 'LIVE_READY' : 'PAPER_MODE',
      haltReason: null,
    });
    await emitEvent(
      mode === 'SHADOW' ? 'SHADOW_WAITING' : 'MARKET_CLOSED_WAIT',
      `${waitText} (${session.reason ?? session.session})`,
      'info',
      { session },
    );
    details.push('resumed in MARKET_CLOSED (REGULAR not active)');
    return { resumed: true, details };
  }

  await setState('RUNNING', {
    aiStatusText: mode === 'SHADOW' ? 'SHADOW scanning' : '시장 탐색중',
    readiness:
      mode === 'LIVE' ? 'LIVE_RUNNING' : mode === 'SHADOW' ? 'SHADOW' : mode === 'LIVE_OBSERVE' ? 'LIVE_OBSERVE' : 'PAPER_MODE',
    haltReason: null,
  });
  await emitEvent('AUTOPILOT_RESUME', '서버 재시작 후 Autopilot 복원', 'info');
  details.push('resumed RUNNING');
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
