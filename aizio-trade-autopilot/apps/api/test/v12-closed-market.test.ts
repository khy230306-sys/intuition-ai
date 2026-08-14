import { beforeAll, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
process.env.DATABASE_URL = `file:${resolve(apiRoot, 'prisma/test-v12-closed.db')}`;
process.env.ALLOW_LIVE = 'false';
process.env.AI_REQUIRED_FOR_ENTRY = 'true';
process.env.AI_PROVIDER = 'none';
process.env.MARKET_DATA_PROVIDER = 'auto';
process.env.PAPER_SIMULATE_REGULAR_SESSION = 'false';

describe('V1.2 closed-market SHADOW perfection', () => {
  beforeAll(() => {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });
  });

  it('SHADOW wait: MARKET_CLOSED + SHADOW WAITING, enabled stays true', async () => {
    const { ensureAutopilotRow } = await import('../src/services/autopilot.js');
    const { prisma } = await import('../src/db/client.js');
    await ensureAutopilotRow();
    await prisma.autopilotStateRow.update({
      where: { id: 'singleton' },
      data: {
        enabled: true,
        mode: 'SHADOW',
        state: 'MARKET_CLOSED',
        aiStatusText: 'MARKET CLOSED · SHADOW WAITING',
        readiness: 'SHADOW',
        haltReason: null,
      },
    });
    const { setMarketWaiting, getShadowResearch } = await import('../src/services/shadowMetrics.js');
    await setMarketWaiting(true);
    const row = await ensureAutopilotRow();
    expect(row.enabled).toBe(true);
    expect(row.state).toBe('MARKET_CLOSED');
    expect(row.aiStatusText).toContain('SHADOW WAITING');
    const research = await getShadowResearch();
    expect(research.marketWaiting).toBe(true);
  });

  it('rebindPaperMarketData(SHADOW) does not fall back to REPLAY on resolve failure', async () => {
    const registry = await import('../src/marketdata/registry.js');
    const { rebindPaperMarketData, getPaperBroker } = await import('../src/brokers/index.js');
    const spy = vi.spyOn(registry, 'resolveMarketDataProvider').mockImplementation(() => {
      throw new registry.MarketDataNotAvailableError('TOSS_NOT_CONFIGURED');
    });
    const before = getPaperBroker();
    expect(() => rebindPaperMarketData('SHADOW')).toThrow(/TOSS_NOT_CONFIGURED|MarketDataNotAvailable/);
    // Provider unchanged (still whatever it was) — must not have been swapped to a silent REPLAY bind via catch
    expect(before).toBe(getPaperBroker());
    spy.mockRestore();
  });

  it('diagnostics: waiting market does not FAIL scanner/freshness', async () => {
    const { setMarketWaiting } = await import('../src/services/shadowMetrics.js');
    await setMarketWaiting(true);
    const { buildDiagnosticsPanel } = await import('../src/services/diagnosticsPanel.js');
    const panel = await buildDiagnosticsPanel({ refreshVerify: false });
    const scanner = panel.rows.find((r) => r.name === 'SCANNER');
    const fresh = panel.rows.find((r) => r.name === 'DATA FRESHNESS');
    expect(scanner?.result).toBe('PASS');
    expect(fresh?.result).toBe('PASS');
  });

  it('REJECTED paper exit must not close DB position', async () => {
    const { prisma } = await import('../src/db/client.js');
    const { getPaperBroker } = await import('../src/brokers/index.js');
    const paper = getPaperBroker(3_000_000);
    await paper.resetLedger(3_000_000);
    const pos = await prisma.positionRow.create({
      data: {
        symbol: '005930',
        entryPrice: 70000,
        quantity: 1,
        strategyId: 'momentum',
        openedAt: new Date(),
        highestPrice: 70000,
        lowestPrice: 70000,
        status: 'OPEN',
        mode: 'PAPER',
      },
    });
    const { placeManagedOrder } = await import('../src/services/execution.js');
    const order = await placeManagedOrder({
      broker: paper,
      mode: 'PAPER',
      symbol: '005930',
      side: 'SELL',
      quantity: 1,
      strategyId: 'momentum',
      signalId: `exit-reject-${Date.now()}`,
    });
    expect(String(order.status)).toBe('REJECTED');
    expect(Number(order.filledQuantity)).toBe(0);
    const still = await prisma.positionRow.findUnique({ where: { id: pos.id } });
    expect(still?.status).toBe('OPEN');
    await prisma.positionRow.update({
      where: { id: pos.id },
      data: { status: 'CLOSED', exitReason: 'TEST_CLEANUP', closedAt: new Date() },
    });
  });

  it('TossMarketDataProvider exposes ranking stats API', async () => {
    const { TossMarketDataProvider } = await import('../src/marketdata/tossProvider.js');
    const p = new TossMarketDataProvider();
    expect(p.getRankingStats('005930')).toBeUndefined();
    expect(typeof p.listLiquidSymbols).toBe('function');
  });
});
