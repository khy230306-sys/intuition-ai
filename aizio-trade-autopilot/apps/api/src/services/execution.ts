import { prisma } from '../db/client.js';
import { newClientOrderId } from '../utils/id.js';
import type { BrokerAdapter } from '../brokers/types.js';
import { emitEvent } from './events.js';

export class DuplicateOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateOrderError';
  }
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
}) {
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

  const clientOrderId = newClientOrderId('az');
  const idempotencyKey = `${opts.signalId ?? 'nosig'}:${opts.side}:${opts.symbol}:${opts.strategyId ?? 'na'}`;
  const existingKey = await prisma.orderRow.findUnique({ where: { idempotencyKey } });
  if (existingKey && opts.side === 'BUY') {
    throw new DuplicateOrderError(`duplicate idempotency ${idempotencyKey}`);
  }

  await prisma.orderRow.create({
    data: {
      clientOrderId,
      idempotencyKey: opts.side === 'SELL' ? `${idempotencyKey}:${clientOrderId}` : idempotencyKey,
      signalId: opts.signalId,
      strategyId: opts.strategyId,
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
    const brokerOrder = await opts.broker.placeOrder({
      clientOrderId,
      symbol: opts.symbol,
      side: opts.side,
      orderType: opts.orderType ?? 'MARKET',
      quantity: opts.quantity,
      price: opts.price,
    });

    await prisma.orderRow.update({
      where: { clientOrderId },
      data: {
        brokerOrderId: brokerOrder.orderId,
        status: String(brokerOrder.status),
        filledQuantity: brokerOrder.filledQuantity,
        avgFillPrice: brokerOrder.averageFilledPrice ?? undefined,
        commission: brokerOrder.commission ?? 0,
        tax: brokerOrder.tax ?? 0,
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
      { clientOrderId, brokerOrderId: brokerOrder.orderId },
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
