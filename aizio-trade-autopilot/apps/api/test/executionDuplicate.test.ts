import { beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
process.env.DATABASE_URL = `file:${resolve(apiRoot, 'prisma/test-exec.db')}`;
process.env.AI_REQUIRED_FOR_ENTRY = 'false';

describe('Execution duplicate protection', () => {
  beforeAll(() => {
    execSync('npx prisma db push --skip-generate', {
      cwd: apiRoot,
      env: { ...process.env },
      stdio: 'inherit',
    });
  });

  it('blocks duplicate signal orders', async () => {
    const { prisma } = await import('../src/db/client.js');
    await prisma.orderRow.deleteMany();
    const { getPaperBroker } = await import('../src/brokers/index.js');
    const { placeManagedOrder, DuplicateOrderError } = await import('../src/services/execution.js');
    const broker = getPaperBroker(5_000_000);
    await broker.connect();
    const signalId = `sig-dup-${Date.now()}`;
    const a = await placeManagedOrder({
      broker,
      mode: 'PAPER',
      symbol: '005930',
      side: 'BUY',
      quantity: 1,
      signalId,
      strategyId: 'momentum',
    });
    expect(a.status).toBe('FILLED');
    await expect(
      placeManagedOrder({
        broker,
        mode: 'PAPER',
        symbol: '005930',
        side: 'BUY',
        quantity: 1,
        signalId,
        strategyId: 'momentum',
      }),
    ).rejects.toBeInstanceOf(DuplicateOrderError);
  });
});
