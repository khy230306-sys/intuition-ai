import { beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');

process.env.DATABASE_URL = `file:${resolve(apiRoot, 'prisma/test.db')}`;
process.env.MARKET_DATA_PROVIDER = 'replay';
process.env.DEFAULT_MODE = 'PAPER';
process.env.AI_REQUIRED_FOR_ENTRY = 'false';

describe('Autopilot persistence + recovery', () => {
  beforeAll(() => {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
  });

  it('starts, persists enabled, recovers after simulated restart', async () => {
    const { prisma } = await import('../src/db/client.js');
    const autopilot = await import('../src/services/autopilot.js');
    const recovery = await import('../src/services/recovery.js');

    await autopilot.ensureAutopilotRow();
    await prisma.orderRow.deleteMany();
    await prisma.positionRow.deleteMany();
    await prisma.systemEvent.deleteMany();

    await autopilot.startAutopilot({ capital: 3_000_000, riskLevel: 'BALANCED', mode: 'PAPER' });
    let row = await autopilot.getAutopilot();
    expect(row.enabled).toBe(true);
    expect(row.mode).toBe('PAPER');

    // simulate process restart: recovery reads DB
    const result = await recovery.runRecovery();
    expect(result.resumed).toBe(true);
    row = await autopilot.getAutopilot();
    expect(row.enabled).toBe(true);
    expect(['RUNNING', 'MARKET_CLOSED', 'STARTING']).toContain(row.state);

    await autopilot.stopAutopilot('CLOSE_AND_STOP');
    row = await autopilot.getAutopilot();
    expect(row.enabled).toBe(false);

    const again = await recovery.runRecovery();
    expect(again.resumed).toBe(false);
  });

  it('reconciles DB vs broker position mismatch', async () => {
    const { prisma } = await import('../src/db/client.js');
    const autopilot = await import('../src/services/autopilot.js');
    const recovery = await import('../src/services/recovery.js');
    const { getPaperBroker } = await import('../src/brokers/index.js');

    await autopilot.startAutopilot({ capital: 3_000_000, riskLevel: 'BALANCED', mode: 'PAPER' });
    await prisma.positionRow.create({
      data: {
        symbol: '005930',
        entryPrice: 70000,
        quantity: 5,
        strategyId: 'ghost',
        openedAt: new Date(),
        highestPrice: 70000,
        lowestPrice: 70000,
        status: 'OPEN',
        mode: 'PAPER',
      },
    });
    // broker has no such position
    getPaperBroker().forcePosition('005930', 0, 0);
    await recovery.runRecovery();
    const ghost = await prisma.positionRow.findFirst({
      where: { symbol: '005930', strategyId: 'ghost' },
    });
    expect(ghost?.status).toBe('CLOSED');
    await autopilot.stopAutopilot('CLOSE_AND_STOP');
  });
});
