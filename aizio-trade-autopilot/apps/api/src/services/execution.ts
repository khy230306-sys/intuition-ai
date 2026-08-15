import { prisma } from '../db/client.js';
import { newClientOrderId } from '../utils/id.js';
import type { BrokerAdapter, BrokerOrder } from '../brokers/types.js';
import { emitEvent } from './events.js';
import { env } from '../config/env.js';
import { assertLiveOrdersAllowed } from './liveOrders.js';

export class DuplicateOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateOrderError';
  }
}

const OPEN_STATUSES = ['PENDING', 'PARTIAL_FILLED', 'PENDING_CANCEL', 'PENDING_REPLACE'] as const;

function isTerminal(status: string): boolean {
  return ['FILLED', 'CANCELED', 'REJECTED'].includes(status);
}

function isOpenWorking(status: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status) || status === 'UNKNOWN';
}

/**
 * Poll broker until order reaches a terminal-ish state or timeout.
 * Prevents treating PENDING LIVE market orders as "no position".
 */
export async function syncOrderUntilSettled(
  broker: BrokerAdapter,
  order: BrokerOrder,
  opts?: { maxPolls?: number; intervalMs?: number },
): Promise<BrokerOrder> {
  if (broker.name !== 'toss') return order;
  if (isTerminal(String(order.status)) && Number(order.filledQuantity) > 0) return order;
  if (isTerminal(String(order.status)) && String(order.status) !== 'FILLED') return order;

  const maxPolls = opts?.maxPolls ?? env.LIVE_ORDER_POLL_MAX;
  const intervalMs = opts?.intervalMs ?? env.LIVE_ORDER_POLL_MS;
  let current = order;
  for (let i = 0; i < maxPolls; i++) {
    if (isTerminal(String(current.status)) && !(String(current.status) === 'FILLED' && !current.averageFilledPrice)) {
      break;
    }
    if (String(current.status) === 'FILLED' && current.averageFilledPrice != null) break;
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      current = await broker.getOrder(current.orderId);
    } catch {
      break;
    }
  }
  return current;
}

export async function placeManagedOrder(opts: {
  broker: BrokerAdapter;
  mode: 'PAPER' | 'LIVE';
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType?: 'MARKET' | 'LIMIT';
  price?: number;
  signalId?: string;
  strategyId?: string;
  /** Required for SELL idempotency — prevents double-exit */
  positionId?: string;
}) {
  if (opts.mode === 'LIVE') {
    assertLiveOrdersAllowed();
  }

  if (opts.signalId && opts.side === 'BUY') {
    const dup = await prisma.orderRow.findFirst({
      where: {
        signalId: opts.signalId,
        side: 'BUY',
        status: { in: ['PENDING', 'PARTIAL_FILLED', 'FILLED'] },
      },
    });
    if (dup) throw new DuplicateOrderError(`duplicate signal order ${opts.signalId}`);
  }

  // SELL: stable key by position — never append random clientOrderId
  if (opts.side === 'SELL') {
    if (!opts.positionId) {
      throw new Error('EXIT_POSITION_ID_REQUIRED');
    }
    const exitKey = `exit:${opts.positionId}`;
    const existingExit = await prisma.orderRow.findUnique({ where: { idempotencyKey: exitKey } });
    if (existingExit) {
      const st = String(existingExit.status);
      if (st === 'FILLED' || isOpenWorking(st)) {
        throw new DuplicateOrderError(`duplicate exit order ${exitKey} status=${st}`);
      }
      if (st === 'REJECTED' || st === 'CANCELED') {
        await prisma.orderRow.delete({ where: { idempotencyKey: exitKey } }).catch(() => undefined);
      }
    }
    // Also block any other open SELL for this positionId
    const openSell = await prisma.orderRow.findFirst({
      where: {
        positionId: opts.positionId,
        side: 'SELL',
        status: { in: ['PENDING', 'PARTIAL_FILLED', 'UNKNOWN'] },
      },
    });
    if (openSell) {
      throw new DuplicateOrderError(`open exit already working ${openSell.clientOrderId}`);
    }
  }

  const clientOrderId = newClientOrderId('az');
  const buyKey = `${opts.signalId ?? 'nosig'}:BUY:${opts.symbol}:${opts.strategyId ?? 'na'}`;
  const idempotencyKey = opts.side === 'SELL' ? `exit:${opts.positionId}` : buyKey;

  if (opts.side === 'BUY') {
    const existingKey = await prisma.orderRow.findUnique({ where: { idempotencyKey } });
    if (existingKey) {
      const st = String(existingKey.status);
      if (st === 'REJECTED' || st === 'CANCELED') {
        await prisma.orderRow.delete({ where: { idempotencyKey } }).catch(() => undefined);
      } else {
        throw new DuplicateOrderError(`duplicate idempotency ${idempotencyKey}`);
      }
    }
  }

  await prisma.orderRow.create({
    data: {
      clientOrderId,
      idempotencyKey,
      signalId: opts.signalId,
      strategyId: opts.strategyId,
      positionId: opts.positionId,
      symbol: opts.symbol,
      side: opts.side,
      orderType: opts.orderType ?? 'MARKET',
      quantity: opts.quantity,
      price: opts.price,
      status: 'PENDING',
      mode: opts.mode,
    },
  });

  try {
    let brokerOrder = await opts.broker.placeOrder({
      clientOrderId,
      symbol: opts.symbol,
      side: opts.side,
      orderType: opts.orderType ?? 'MARKET',
      quantity: opts.quantity,
      price: opts.price,
    });

    if (opts.mode === 'LIVE') {
      brokerOrder = await syncOrderUntilSettled(opts.broker, brokerOrder);
    }

    await prisma.orderRow.update({
      where: { clientOrderId },
      data: {
        brokerOrderId: brokerOrder.orderId,
        status: String(brokerOrder.status),
        filledQuantity: brokerOrder.filledQuantity,
        avgFillPrice: brokerOrder.averageFilledPrice ?? undefined,
        commission: brokerOrder.commission ?? 0,
        tax: brokerOrder.tax ?? 0,
        rejectReason:
          String(brokerOrder.status) === 'REJECTED'
            ? String((brokerOrder as { rejectReason?: string }).rejectReason ?? 'rejected')
            : undefined,
        rawJson: JSON.stringify(brokerOrder),
      },
    });

    if (brokerOrder.filledQuantity > 0 && brokerOrder.averageFilledPrice != null) {
      await prisma.executionRow.create({
        data: {
          orderId: brokerOrder.orderId,
          symbol: opts.symbol,
          side: opts.side,
          quantity: brokerOrder.filledQuantity,
          price: brokerOrder.averageFilledPrice,
          commission: brokerOrder.commission ?? 0,
          tax: brokerOrder.tax ?? 0,
          executedAt: new Date(),
          mode: opts.mode,
        },
      });
    }

    await emitEvent(
      opts.side === 'BUY' ? 'ORDER_BUY' : 'ORDER_SELL',
      `${opts.symbol} ${opts.side} ${brokerOrder.status} qty=${opts.quantity}`,
      'trade',
      { clientOrderId, brokerOrderId: brokerOrder.orderId, positionId: opts.positionId },
    );

    return brokerOrder;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'order-failed';
    await prisma.orderRow.update({
      where: { clientOrderId },
      data: { status: 'REJECTED', rejectReason: msg },
    });
    throw e;
  }
}

/** True while an exit is still working (not terminal). FILLED exits are finalized by reconcile. */
export async function hasOpenExitOrder(positionId: string): Promise<boolean> {
  const row = await prisma.orderRow.findFirst({
    where: {
      positionId,
      side: 'SELL',
      status: { in: ['PENDING', 'PARTIAL_FILLED', 'UNKNOWN', 'PENDING_CANCEL', 'PENDING_REPLACE'] },
    },
  });
  return Boolean(row);
}
