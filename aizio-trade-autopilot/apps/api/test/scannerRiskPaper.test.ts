import { describe, expect, it, beforeAll } from 'vitest';
import { ReplayMarketDataProvider } from '../src/marketdata/replayProvider.js';
import { MarketScanner } from '../src/engines/scanner.js';
import { RiskEngine } from '../src/engines/risk.js';
import { RISK_PRESETS } from '@aizio/trade-shared';
import { PaperBrokerAdapter } from '../src/brokers/paperBroker.js';
import { defaultStops, evaluateExit } from '../src/engines/positionManager.js';

describe('Scanner', () => {
  const market = new ReplayMarketDataProvider();
  const scanner = new MarketScanner(market);

  it('excludes halted, managed, and low liquidity names', async () => {
    const res = await scanner.scan('KR');
    const rejected = new Map(res.rejected.map((r) => [r.symbol, r.reason]));
    expect(rejected.get('900002')).toBe('HALTED');
    expect(rejected.get('900003')).toBe('MANAGED');
    expect(rejected.get('900001')).toMatch(/LOW_|WIDE_|PRICE/);
    expect(res.candidates.find((c) => c.symbol === '005930')).toBeTruthy();
  });
});

describe('RiskEngine', () => {
  const engine = new RiskEngine();
  const market = new ReplayMarketDataProvider();

  it('rejects daily loss, drawdown, max positions, stale data, abnormal spread', async () => {
    const quote = await market.getQuote('005930');
    const base = {
      profile: RISK_PRESETS.BALANCED,
      capitalUsed: 0,
      openPositions: 0,
      dailyPnlPct: 0,
      drawdownPct: 0,
      consecutiveLosses: 0,
      quote,
      marketOpen: true,
      brokerOk: true,
      orderStateKnown: true,
      aiValid: true,
      circuitBreakerOn: false,
      stopNewEntries: false,
      proposedNotional: 300_000,
    };
    expect(engine.evaluate(base).allowed).toBe(true);
    expect(engine.evaluate({ ...base, dailyPnlPct: -3 }).allowed).toBe(false);
    expect(engine.evaluate({ ...base, drawdownPct: 20 }).allowed).toBe(false);
    expect(engine.evaluate({ ...base, openPositions: 99 }).allowed).toBe(false);
    expect(engine.evaluate({ ...base, dataStaleMs: 120_000 }).reasons).toContain('STALE_MARKET_DATA');
    const wide = { ...quote, bid: quote.lastPrice * 0.9, ask: quote.lastPrice * 1.1 };
    expect(engine.evaluate({ ...base, quote: wide }).reasons).toContain('ABNORMAL_SPREAD');
  });
});

describe('PaperBroker', () => {
  const market = new ReplayMarketDataProvider();
  let broker: PaperBrokerAdapter;

  beforeAll(async () => {
    broker = new PaperBrokerAdapter(market, 3_000_000);
    await broker.connect();
  });

  it('buys and sells with fee/slippage and supports stops conceptually', async () => {
    const buy = await broker.placeOrder({
      clientOrderId: 'test-buy-001',
      symbol: '005930',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 10,
    });
    expect(buy.status).toBe('FILLED');
    expect(buy.averageFilledPrice).toBeGreaterThan(0);
    expect(buy.commission).toBeGreaterThan(0);

    const stops = defaultStops(buy.averageFilledPrice!);
    const quote = await broker.getQuote('005930');
    const pos = {
      id: '1',
      symbol: '005930',
      entryPrice: buy.averageFilledPrice!,
      quantity: 10,
      stopLoss: stops.stopLoss,
      takeProfit: stops.takeProfit,
      trailingStop: stops.trailingStop,
      strategyId: 't',
      openedAt: new Date(Date.now() - 1000),
      highestPrice: buy.averageFilledPrice!,
      lowestPrice: buy.averageFilledPrice!,
      status: 'OPEN' as const,
    };
    // force stop by low quote
    const low = { ...quote, lastPrice: stops.stopLoss! - 100 };
    expect(evaluateExit(pos, low).reason).toBe('STOP_LOSS');

    const sell = await broker.placeOrder({
      clientOrderId: 'test-sell-001',
      symbol: '005930',
      side: 'SELL',
      orderType: 'MARKET',
      quantity: 10,
    });
    expect(sell.status).toBe('FILLED');
    expect((sell.tax ?? 0) >= 0).toBe(true);
  });

  it('is idempotent on clientOrderId', async () => {
    const a = await broker.placeOrder({
      clientOrderId: 'idem-1',
      symbol: '000660',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 1,
    });
    const b = await broker.placeOrder({
      clientOrderId: 'idem-1',
      symbol: '000660',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 1,
    });
    expect(a.orderId).toBe(b.orderId);
  });
});
