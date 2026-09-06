import { prisma } from '../db/client.js';

const KEY = 'paper_broker_state';

export interface PersistedPaperState {
  cash: number;
  positions: Array<{ symbol: string; quantity: number; avgPrice: number; name: string }>;
}

export async function loadPaperState(): Promise<PersistedPaperState | null> {
  const row = await prisma.configKv.findUnique({ where: { key: KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.valueJson) as PersistedPaperState;
  } catch {
    return null;
  }
}

export async function savePaperState(state: PersistedPaperState): Promise<void> {
  await prisma.configKv.upsert({
    where: { key: KEY },
    create: { key: KEY, valueJson: JSON.stringify(state) },
    update: { valueJson: JSON.stringify(state) },
  });
}
