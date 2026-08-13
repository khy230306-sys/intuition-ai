import { prisma } from '../db/client.js';
import type { ActivityItem } from '@aizio/trade-shared';

type Listener = (item: ActivityItem) => void;
const listeners = new Set<Listener>();

export function onActivity(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function emitEvent(
  kind: string,
  message: string,
  level: 'info' | 'trade' | 'warn' | 'error' = 'info',
  detail: Record<string, unknown> = {},
) {
  const row = await prisma.systemEvent.create({
    data: {
      kind,
      level,
      message,
      detailJson: JSON.stringify(detail),
    },
  });
  const item: ActivityItem = {
    id: row.id,
    at: row.createdAt.toISOString(),
    level,
    message,
  };
  for (const l of listeners) l(item);
  return item;
}

export async function recentActivity(limit = 40): Promise<ActivityItem[]> {
  const rows = await prisma.systemEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    level: r.level as ActivityItem['level'],
    message: r.message,
  }));
}
