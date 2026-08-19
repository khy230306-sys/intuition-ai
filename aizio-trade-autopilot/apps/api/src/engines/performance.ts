import { prisma } from '../db/client.js';

export interface PerformanceSnapshot {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpe: number;
  maxDrawdown: number;
  avgHoldMs: number;
  grossPnl: number;
  netPnl: number;
  daily: Array<{ date: string; netPnl: number }>;
  byStrategy: Array<{ strategyId: string; trades: number; netPnl: number; winRate: number }>;
}

export async function computePerformance(): Promise<PerformanceSnapshot> {
  const rows = await prisma.tradeJournal.findMany({
    where: { closedAt: { not: null }, netPnl: { not: null } },
    orderBy: { closedAt: 'asc' },
  });
  const pnls = rows.map((r) => r.netPnl ?? 0);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const grossWins = wins.reduce((a, b) => a + b, 0);
  const grossLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const avgWin = wins.length ? grossWins / wins.length : 0;
  const avgLoss = losses.length ? grossLosses / losses.length : 0;
  const winRate = pnls.length ? wins.length / pnls.length : 0;
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const expectancy = pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const avgHoldMs = rows.length
    ? rows.reduce((a, r) => a + (r.holdMs ?? 0), 0) / rows.length
    : 0;

  // simple sharpe on trade returns
  const mean = expectancy;
  const variance =
    pnls.length > 1 ? pnls.reduce((a, p) => a + (p - mean) ** 2, 0) / (pnls.length - 1) : 0;
  const sharpe = variance > 0 ? mean / Math.sqrt(variance) : 0;

  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const p of pnls) {
    equity += p;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }

  const dailyMap = new Map<string, number>();
  for (const r of rows) {
    const d = (r.closedAt ?? r.createdAt).toISOString().slice(0, 10);
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + (r.netPnl ?? 0));
  }

  const byStrat = new Map<string, { trades: number; wins: number; netPnl: number }>();
  for (const r of rows) {
    const id = r.strategyId ?? 'unknown';
    const cur = byStrat.get(id) ?? { trades: 0, wins: 0, netPnl: 0 };
    cur.trades += 1;
    cur.netPnl += r.netPnl ?? 0;
    if ((r.netPnl ?? 0) > 0) cur.wins += 1;
    byStrat.set(id, cur);
  }

  return {
    totalTrades: pnls.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : 999,
    expectancy,
    sharpe,
    maxDrawdown: maxDd,
    avgHoldMs,
    grossPnl: rows.reduce((a, r) => a + (r.grossPnl ?? 0), 0),
    netPnl: pnls.reduce((a, b) => a + b, 0),
    daily: [...dailyMap.entries()].map(([date, netPnl]) => ({ date, netPnl })),
    byStrategy: [...byStrat.entries()].map(([strategyId, v]) => ({
      strategyId,
      trades: v.trades,
      netPnl: v.netPnl,
      winRate: v.trades ? v.wins / v.trades : 0,
    })),
  };
}
