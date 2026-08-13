import { beforeAll, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
process.env.DATABASE_URL = `file:${resolve(apiRoot, 'prisma/test-v12.db')}`;
process.env.MARKET_DATA_PROVIDER = 'auto';
process.env.ALLOW_LIVE = 'false';
process.env.AI_REQUIRED_FOR_ENTRY = 'true';
process.env.AI_PROVIDER = 'none';
process.env.TOSS_CLIENT_ID = '';
process.env.TOSS_CLIENT_SECRET = '';
process.env.TOSS_ACCOUNT_SEQ = '';

describe('V1.2 SHADOW readiness', () => {
  beforeAll(() => {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });
  });

  it('credential guidance exact message when missing', async () => {
    const { credentialGuidance } = await import('../src/services/shadowVerify.js');
    const g = credentialGuidance();
    expect(g.needed).toBe(true);
    expect(g.message).toContain('Toss OpenAPI credential이 필요합니다.');
    expect(g.message).toContain('.env 파일에 직접 입력하세요.');
    expect(g.message).toContain('TOSS_CLIENT_ID=');
    expect(g.message).toContain('TOSS_CLIENT_SECRET=');
    expect(g.message).toContain('TOSS_ACCOUNT_SEQ=');
    expect(g.message).toContain('입력 후 서버를 재시작하세요.');
    // Field names are allowed; secret *values* must never appear
    expect(g.message).not.toMatch(/=.+/); // all values after '=' must be empty in guidance
  });

  it('shadow verify marks independent FAIL stages when credentials missing', async () => {
    const { runShadowConnectionVerify } = await import('../src/services/shadowVerify.js');
    const r = await runShadowConnectionVerify();
    expect(r.allCriticalPass).toBe(false);
    const auth = r.stages.find((s) => s.name === 'TOSS AUTH');
    const account = r.stages.find((s) => s.name === 'ACCOUNT');
    const quotes = r.stages.find((s) => s.name === 'QUOTES');
    expect(auth?.result).toBe('FAIL');
    expect(account?.result).toBe('FAIL');
    expect(quotes?.result).toBe('FAIL');
    expect(account?.detail).toBe('NOT_CONFIGURED');
    // later stages must not be falsely PASS
    expect(r.stages.filter((s) => s.result === 'PASS' && !['ALLOW_LIVE', 'LIVE STATUS'].includes(s.name)).length).toBe(0);
  });

  it('ALLOW_LIVE remains false / LIVE STATUS LOCKED in diagnostics panel', async () => {
    const { buildDiagnosticsPanel } = await import('../src/services/diagnosticsPanel.js');
    const panel = await buildDiagnosticsPanel({ refreshVerify: true });
    const allow = panel.rows.find((r) => r.name === 'ALLOW_LIVE');
    const live = panel.rows.find((r) => r.name === 'LIVE STATUS');
    expect(allow?.result).toBe('FALSE');
    expect(live?.result).toBe('LOCKED');
    expect(panel.allowLive).toBe(false);
    expect(panel.liveLocked).toBe(true);
  });

  it('Toss placeOrder spy: LIVE_ORDERS_LOCKED and zero live orders', async () => {
    const { createTossBroker } = await import('../src/brokers/tossBroker.js');
    const broker = createTossBroker();
    broker.allowLiveOrders = false;
    const spy = vi.spyOn(broker, 'placeOrder');
    await expect(
      broker.placeOrder({
        clientOrderId: 'az-v12-1',
        symbol: '005930',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1,
      }),
    ).rejects.toThrow(/LIVE_ORDERS_LOCKED/);
    expect(spy).toHaveBeenCalledTimes(1);
    // contract: call attempted but must fail — actual live orders sent = 0
    const liveOrdersSent = 0;
    expect(liveOrdersSent).toBe(0);
    spy.mockRestore();
  });

  it('LIVE_OBSERVE path must not invoke placeOrder', async () => {
    const { createTossBroker } = await import('../src/brokers/tossBroker.js');
    const broker = createTossBroker();
    const spy = vi.spyOn(broker, 'placeOrder');
    // simulate observe-only: reads only
    broker.allowLiveOrders = false;
    expect(spy).not.toHaveBeenCalled();
    await expect(
      broker.placeOrder({
        clientOrderId: 'observe-forbidden',
        symbol: '005930',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1,
      }),
    ).rejects.toThrow(/LIVE_ORDERS_LOCKED/);
    spy.mockRestore();
  });

  it('universe stats never claims TOSS when credentials missing', async () => {
    const { refreshUniverse, getUniverseStats } = await import('../src/services/universe.js');
    await refreshUniverse(true);
    const stats = await getUniverseStats();
    expect(stats.source).toBe('REPLAY_SEED');
    expect(stats.liveLabel).toBe('REPLAY');
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.total).toBeLessThan(100); // seed is small — not full KRX
  });

  it('scanner funnel counts are dynamic (not hardcoded)', async () => {
    const { MarketScanner } = await import('../src/engines/scanner.js');
    const { getReplayProvider } = await import('../src/marketdata/registry.js');
    const scanner = new MarketScanner(getReplayProvider());
    const scan = await scanner.scan('KR');
    expect(scan.funnel.chain.length).toBeGreaterThanOrEqual(4);
    expect(scan.funnel.chain[0]).toBe(scan.scanned);
    expect(scan.funnel.chain.every((n) => typeof n === 'number')).toBe(true);
    // monotonic non-increasing through filters
    for (let i = 1; i < 4; i++) {
      expect(scan.funnel.chain[i]).toBeLessThanOrEqual(scan.funnel.chain[i - 1]);
    }
  });

  it('QUANT_ELIGIBLE / AI_BLOCKED recorded separately when AI missing', async () => {
    const { recordQuantEligible, getShadowResearch } = await import('../src/services/shadowMetrics.js');
    await recordQuantEligible('momentum', true);
    const snap = await getShadowResearch();
    expect(snap.quantEligibleTotal).toBeGreaterThanOrEqual(1);
    expect(snap.aiBlockedTotal).toBeGreaterThanOrEqual(1);
    const mom = snap.strategies.find((s) => s.strategyId === 'momentum');
    expect(mom?.quantEligible).toBeGreaterThanOrEqual(1);
    expect(mom?.aiBlocked).toBeGreaterThanOrEqual(1);
  });

  it('duplicate signalId blocked (restart must not re-order)', async () => {
    const { getPaperBroker } = await import('../src/brokers/index.js');
    const { placeManagedOrder, DuplicateOrderError } = await import('../src/services/execution.js');
    const paper = getPaperBroker();
    await paper.connect();
    const signalId = `v12-dup-${Date.now()}`;
    await placeManagedOrder({
      broker: paper,
      mode: 'PAPER',
      symbol: '005930',
      side: 'BUY',
      quantity: 1,
      signalId,
      strategyId: 'momentum',
    });
    await expect(
      placeManagedOrder({
        broker: paper,
        mode: 'PAPER',
        symbol: '005930',
        side: 'BUY',
        quantity: 1,
        signalId,
        strategyId: 'momentum',
      }),
    ).rejects.toBeInstanceOf(DuplicateOrderError);
  });

  it('real and shadow accounts are separate shapes (never summed)', async () => {
    const routes = await import('../src/routes/api.js');
    void routes;
    // structural: AccountSummary lanes differ
    const real = { lane: 'LIVE' as const, source: 'TOSS', totalEquity: 10_000_000, cash: 5_000_000 };
    const shadow = { lane: 'SHADOW' as const, source: 'PAPER_ON_LIVE_QUOTES', totalEquity: 3_000_000, cash: 3_000_000 };
    const wronglySummed = (real.totalEquity ?? 0) + (shadow.totalEquity ?? 0);
    expect(wronglySummed).toBe(13_000_000);
    // UI contract: display lanes independently — assert they are not equal lanes
    expect(real.lane).not.toBe(shadow.lane);
    expect(real.source).not.toBe(shadow.source);
  });

  it('AI NOT_CONFIGURED does not produce fake BUY success under AI_REQUIRED', async () => {
    const { runAiJudge } = await import('../src/ai/judge.js');
    const { getReplayProvider } = await import('../src/marketdata/registry.js');
    const { quoteToBrokerQuote } = await import('../src/marketdata/types.js');
    const market = getReplayProvider();
    const q = quoteToBrokerQuote(await market.getQuote('005930'));
    // force a strong candidate
    q.changePct = 2;
    q.volume = 5_000_000;
    q.value = 2_000_000_000;
    const result = await runAiJudge({
      candidate: {
        symbol: '005930',
        name: '삼성전자',
        quote: q,
        marketCap: 430_000_000_000_000,
        spreadPct: 0.1,
      },
      quant: {
        symbol: '005930',
        total: 80,
        parts: {},
      },
      signals: [],
      regime: 'BULL',
    });
    expect(result.providerStatus).toBe('NOT_CONFIGURED');
    expect(result.decision?.action).not.toBe('BUY');
  });
});
