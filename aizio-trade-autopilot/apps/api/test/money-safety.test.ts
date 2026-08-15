import { beforeAll, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import type { BrokerAdapter, BrokerOrder } from '../src/brokers/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
process.env.DATABASE_URL = `file:${resolve(apiRoot, 'prisma/test-money-safety.db')}`;
process.env.AI_REQUIRED_FOR_ENTRY = 'false';
process.env.ALLOW_LIVE = 'false';
process.env.CONTROL_PLANE_TOKEN = 'test-control-token-ms';

describe('Money-safety hardening', () => {
  beforeAll(() => {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });
  });

  it('blocks duplicate SELL by positionId (exit idempotency)', async () => {
    const { prisma } = await import('../src/db/client.js');
    await prisma.orderRow.deleteMany();
    await prisma.positionRow.deleteMany();
    const { getPaperBroker } = await import('../src/brokers/index.js');
    const { placeManagedOrder, DuplicateOrderError } = await import('../src/services/execution.js');
    const broker = getPaperBroker(5_000_000);
    await broker.connect();
    broker.forcePosition('005930', 2, 70000);

    const pos = await prisma.positionRow.create({
      data: {
        symbol: '005930',
        entryPrice: 70000,
        quantity: 2,
        strategyId: 'ms',
        openedAt: new Date(),
        highestPrice: 70000,
        lowestPrice: 70000,
        status: 'OPEN',
        mode: 'PAPER',
      },
    });

    const first = await placeManagedOrder({
      broker,
      mode: 'PAPER',
      symbol: '005930',
      side: 'SELL',
      quantity: 2,
      positionId: pos.id,
      strategyId: 'ms',
    });
    expect(first.status).toBe('FILLED');

    await expect(
      placeManagedOrder({
        broker,
        mode: 'PAPER',
        symbol: '005930',
        side: 'SELL',
        quantity: 2,
        positionId: pos.id,
        strategyId: 'ms',
      }),
    ).rejects.toBeInstanceOf(DuplicateOrderError);

    const sells = await prisma.orderRow.findMany({ where: { positionId: pos.id, side: 'SELL' } });
    expect(sells).toHaveLength(1);
    expect(sells[0].idempotencyKey).toBe(`exit:${pos.id}`);
  });

  it('requires positionId for SELL', async () => {
    const { getPaperBroker } = await import('../src/brokers/index.js');
    const { placeManagedOrder } = await import('../src/services/execution.js');
    const broker = getPaperBroker(5_000_000);
    await broker.connect();
    await expect(
      placeManagedOrder({
        broker,
        mode: 'PAPER',
        symbol: '005930',
        side: 'SELL',
        quantity: 1,
      }),
    ).rejects.toThrow('EXIT_POSITION_ID_REQUIRED');
  });

  it('assertLiveOrdersAllowed throws while ALLOW_LIVE=false', async () => {
    const { assertLiveOrdersAllowed, refreshLiveOrderLock } = await import('../src/services/liveOrders.js');
    const { getTossBroker } = await import('../src/brokers/index.js');
    // Even if someone flips in-memory unlock, ALLOW_LIVE=false must block
    getTossBroker().allowLiveOrders = true;
    expect(() => assertLiveOrdersAllowed()).toThrow(/LIVE_ORDERS_LOCKED/);
    refreshLiveOrderLock(true);
    expect(getTossBroker().allowLiveOrders).toBe(false);
  });

  it('LIVE placeManagedOrder never reaches broker when locked', async () => {
    const { placeManagedOrder } = await import('../src/services/execution.js');
    let placeCalled = false;
    const stub: BrokerAdapter = {
      name: 'toss',
      async connect() {},
      async disconnect() {},
      async health() {
        return { ok: true, status: 'ok' };
      },
      async getAccount() {
        return { accountNo: 'x', accountSeq: '1', accountType: 'M', currency: 'KRW', cash: 0 };
      },
      async getBuyingPower() {
        return { currency: 'KRW', cashBuyingPower: 0 };
      },
      async getPositions() {
        return [];
      },
      async getOpenOrders() {
        return [];
      },
      async getQuote() {
        throw new Error('unused');
      },
      async placeOrder() {
        placeCalled = true;
        throw new Error('should-not-place');
      },
      async cancelOrder() {
        throw new Error('unused');
      },
      async getOrder() {
        throw new Error('unused');
      },
      async getExecutions() {
        return [];
      },
    };
    await expect(
      placeManagedOrder({
        broker: stub,
        mode: 'LIVE',
        symbol: '005930',
        side: 'BUY',
        quantity: 1,
        signalId: `live-lock-${Date.now()}`,
      }),
    ).rejects.toThrow(/LIVE_ORDERS_LOCKED/);
    expect(placeCalled).toBe(false);
  });

  it('PENDING LIVE buy does not invent a fill (poll leaves PENDING)', async () => {
    const { prisma } = await import('../src/db/client.js');
    await prisma.orderRow.deleteMany({ where: { symbol: '000660' } });
    const { syncOrderUntilSettled } = await import('../src/services/execution.js');

    const pending: BrokerOrder = {
      orderId: 'ord-pending-1',
      clientOrderId: 'c1',
      symbol: '000660',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 1,
      status: 'PENDING',
      filledQuantity: 0,
      averageFilledPrice: null,
    };
    const stub = {
      name: 'toss' as const,
      async getOrder() {
        return { ...pending };
      },
    };
    const settled = await syncOrderUntilSettled(stub as unknown as BrokerAdapter, pending, {
      maxPolls: 2,
      intervalMs: 1,
    });
    expect(settled.status).toBe('PENDING');
    expect(settled.filledQuantity).toBe(0);
  });

  it('control-plane auth rejects mutating routes without Bearer token', async () => {
    process.env.CONTROL_PLANE_TOKEN = 'test-control-token-ms';
    vi.resetModules();
    const { registerControlPlaneAuth } = await import('../src/services/controlPlaneAuth.js');
    const app = Fastify();
    registerControlPlaneAuth(app);
    app.post('/api/autopilot/start', async () => ({ ok: true }));
    app.get('/api/health', async () => ({ ok: true }));
    await app.ready();

    const denied = await app.inject({ method: 'POST', url: '/api/autopilot/start' });
    expect(denied.statusCode).toBe(401);
    expect(denied.json().error).toBe('CONTROL_PLANE_UNAUTHORIZED');

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/autopilot/start',
      headers: { authorization: 'Bearer test-control-token-ms' },
    });
    expect(allowed.statusCode).toBe(200);

    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);

    await app.close();
  });
});
