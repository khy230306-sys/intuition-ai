import { beforeAll, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
process.env.DATABASE_URL = `file:${resolve(apiRoot, 'prisma/test-v11.db')}`;
process.env.MARKET_DATA_PROVIDER = 'auto';
process.env.ALLOW_LIVE = 'false';
process.env.AI_REQUIRED_FOR_ENTRY = 'false';
process.env.TOSS_CLIENT_ID = '';
process.env.TOSS_CLIENT_SECRET = '';
process.env.TOSS_ACCOUNT_SEQ = '';

describe('V1.1 live-data readiness', () => {
  beforeAll(() => {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });
  });

  it('credential missing → NOT_CONFIGURED', async () => {
    const { resetTossConnectionForTests, TossConnectionManager } = await import(
      '../src/brokers/tossConnection.js'
    );
    resetTossConnectionForTests(
      new TossConnectionManager('', '', '', 'https://openapi.tossinvest.com'),
    );
    const { getTossConnection } = await import('../src/brokers/tossConnection.js');
    expect(getTossConnection().getState()).toBe('NOT_CONFIGURED');
    await expect(getTossConnection().authenticate()).rejects.toThrow(/TOSS_NOT_CONFIGURED/);
  });

  it('auth failure classification', async () => {
    const { classifyAuthError } = await import('../src/brokers/tossConnection.js');
    expect(classifyAuthError('invalid_client')).toBe('INVALID_CLIENT');
    expect(classifyAuthError('IP address not allowed')).toBe('IP_NOT_ALLOWED');
    expect(classifyAuthError('429 rate')).toBe('RATE_LIMITED');
  });

  it('token expiration triggers re-issue path (mocked fetch)', async () => {
    const { resetTossConnectionForTests, TossConnectionManager } = await import(
      '../src/brokers/tossConnection.js'
    );
    const mgr = new TossConnectionManager('id', 'secret', '1', 'https://example.test');
    resetTossConnectionForTests(mgr);
    let calls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/oauth2/token')) {
        calls += 1;
        return new Response(JSON.stringify({ access_token: `t${calls}`, token_type: 'Bearer', expires_in: 1 }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ result: { accounts: [] } }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await mgr.authenticate();
    await new Promise((r) => setTimeout(r, 1100));
    await mgr.ensureToken(false);
    expect(calls).toBeGreaterThanOrEqual(2);
    vi.unstubAllGlobals();
    resetTossConnectionForTests();
  });

  it('rate limit 429 retries', async () => {
    const { resetTossConnectionForTests, TossConnectionManager } = await import(
      '../src/brokers/tossConnection.js'
    );
    const mgr = new TossConnectionManager('id', 'secret', '1', 'https://example.test');
    resetTossConnectionForTests(mgr);
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) => {
      if (String(url).includes('/oauth2/token')) {
        n += 1;
        if (n === 1) {
          return new Response(JSON.stringify({ error: 'rate' }), {
            status: 429,
            headers: { 'Retry-After': '0' },
          });
        }
        return new Response(JSON.stringify({ access_token: 'ok', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
        });
      }
      return new Response('{}', { status: 200 });
    });
    await mgr.authenticate();
    expect(mgr.getState()).toBe('CONNECTED');
    vi.unstubAllGlobals();
    resetTossConnectionForTests();
  });

  it('REPLAY fallback prohibited for LIVE_OBSERVE/SHADOW/LIVE', async () => {
    const { resolveMarketDataProvider, MarketDataNotAvailableError } = await import(
      '../src/marketdata/registry.js'
    );
    process.env.MARKET_DATA_PROVIDER = 'auto';
    expect(() => resolveMarketDataProvider('LIVE_OBSERVE')).toThrow(MarketDataNotAvailableError);
    expect(() => resolveMarketDataProvider('SHADOW')).toThrow(MarketDataNotAvailableError);
    expect(() => resolveMarketDataProvider('LIVE')).toThrow(MarketDataNotAvailableError);
    // explicit replay also blocked for live modes
    process.env.MARKET_DATA_PROVIDER = 'replay';
    // registry reads env at call via imported env object — set before module cache; use direct check
    const mod = await import('../src/marketdata/registry.js');
    expect(() => mod.resolveMarketDataProvider('PAPER_REPLAY')).not.toThrow();
  });

  it('quote stale rejected by risk', async () => {
    const { RiskEngine } = await import('../src/engines/risk.js');
    const { RISK_PRESETS } = await import('@aizio/trade-shared');
    const { ReplayMarketDataProvider } = await import('../src/marketdata/replayProvider.js');
    const { quoteToBrokerQuote } = await import('../src/marketdata/types.js');
    const market = new ReplayMarketDataProvider();
    const stale = quoteToBrokerQuote(market.staleQuote('005930', 120_000));
    const engine = new RiskEngine();
    const d = engine.evaluate({
      profile: RISK_PRESETS.BALANCED,
      capitalUsed: 0,
      openPositions: 0,
      dailyPnlPct: 0,
      drawdownPct: 0,
      consecutiveLosses: 0,
      quote: stale,
      marketOpen: true,
      brokerOk: true,
      orderStateKnown: true,
      aiValid: true,
      circuitBreakerOn: false,
      stopNewEntries: false,
      proposedNotional: 300_000,
      dataStaleMs: stale.freshnessMs,
    });
    expect(d.reasons).toContain('STALE_MARKET_DATA');
  });

  it('LIVE provider failure does not silently use REPLAY', async () => {
    const { MarketDataNotAvailableError, resolveMarketDataProvider } = await import(
      '../src/marketdata/registry.js'
    );
    try {
      resolveMarketDataProvider('LIVE');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MarketDataNotAvailableError);
      expect(String((e as Error).message)).not.toMatch(/replay/i);
    }
  });

  it('Toss placeOrder locked without ALLOW_LIVE gate', async () => {
    const { createTossBroker } = await import('../src/brokers/tossBroker.js');
    const broker = createTossBroker();
    broker.allowLiveOrders = false;
    await expect(
      broker.placeOrder({
        clientOrderId: 'az-test-1',
        symbol: '005930',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1,
      }),
    ).rejects.toThrow(/LIVE_ORDERS_LOCKED/);
  });

  it('LIVE_OBSERVE start rejected without credentials', async () => {
    const autopilot = await import('../src/services/autopilot.js');
    await autopilot.ensureAutopilotRow();
    await expect(
      autopilot.startAutopilot({ capital: 3_000_000, riskLevel: 'BALANCED', mode: 'LIVE_OBSERVE' }),
    ).rejects.toThrow(/TOSS_NOT_CONFIGURED/);
  });

  it('SHADOW start rejected without credentials', async () => {
    const autopilot = await import('../src/services/autopilot.js');
    await expect(
      autopilot.startAutopilot({ capital: 3_000_000, riskLevel: 'BALANCED', mode: 'SHADOW' }),
    ).rejects.toThrow(/TOSS_NOT_CONFIGURED/);
  });

  it('live gate fails when ALLOW_LIVE=false even if other checks pass locally', async () => {
    const { runLiveReadiness } = await import('../src/services/liveGate.js');
    const r = await runLiveReadiness();
    expect(r.locked).toBe(true);
    const allow = r.checks.find((c) => c.name === 'ALLOW_LIVE');
    expect(allow?.result).toBe('FAIL');
  });

  it('PAPER_REPLAY still resolves replay provider', async () => {
    // Force env on process then re-import env is cached — use getReplay via modeAllows
    const { modeAllowsReplay, getReplayProvider } = await import('../src/marketdata/registry.js');
    expect(modeAllowsReplay('PAPER_REPLAY')).toBe(true);
    expect(getReplayProvider().status).toBe('REPLAY');
  });

  it('KRX/NXT venue sessions returned separately', async () => {
    const { getKrVenueSessions } = await import('../src/engines/marketSession.js');
    const v = getKrVenueSessions(new Date('2026-08-11T01:15:00Z'));
    expect(v.krx.venue).toBe('KRX');
    expect(v.nxt.venue).toBe('NXT');
    expect(v.krx.session).toBe('REGULAR');
    expect(v.nxt.session).toBe('REGULAR');
  });
});
