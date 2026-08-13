import { prisma } from '../db/client.js';

export async function writeJournal(entry: {
  symbol: string;
  strategyId?: string;
  signalId?: string;
  discoveryWhy?: string;
  buyWhy?: string;
  rejectWhy?: string;
  marketRegime?: string;
  quantScore?: number;
  aiAction?: string;
  aiConfidence?: number;
  riskDecision?: string;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  slippagePct?: number;
  commission?: number;
  tax?: number;
  grossPnl?: number;
  netPnl?: number;
  maxFavorable?: number;
  maxAdverse?: number;
  holdMs?: number;
  openedAt?: Date;
  closedAt?: Date;
  meta?: Record<string, unknown>;
}) {
  return prisma.tradeJournal.create({
    data: {
      symbol: entry.symbol,
      strategyId: entry.strategyId,
      signalId: entry.signalId,
      discoveryWhy: entry.discoveryWhy,
      buyWhy: entry.buyWhy,
      rejectWhy: entry.rejectWhy,
      marketRegime: entry.marketRegime,
      quantScore: entry.quantScore,
      aiAction: entry.aiAction,
      aiConfidence: entry.aiConfidence,
      riskDecision: entry.riskDecision,
      entryPrice: entry.entryPrice,
      exitPrice: entry.exitPrice,
      quantity: entry.quantity,
      slippagePct: entry.slippagePct,
      commission: entry.commission,
      tax: entry.tax,
      grossPnl: entry.grossPnl,
      netPnl: entry.netPnl,
      maxFavorable: entry.maxFavorable,
      maxAdverse: entry.maxAdverse,
      holdMs: entry.holdMs,
      openedAt: entry.openedAt,
      closedAt: entry.closedAt,
      metaJson: JSON.stringify(entry.meta ?? {}),
    },
  });
}
