import type { CardDuelResult, PipValue, RoundResult, TotalBand } from './types'

export type HistoryStats = {
  valueCounts: Record<PipValue, number>
  cardDuel: Record<CardDuelResult, number>
  totalBand: Record<TotalBand, number>
  pairCount: number
  oddCount: number
  evenCount: number
}

export function emptyStats(): HistoryStats {
  return {
    valueCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    cardDuel: { UP: 0, DOWN: 0, SAME: 0 },
    totalBand: { LOW: 0, CENTER: 0, HIGH: 0 },
    pairCount: 0,
    oddCount: 0,
    evenCount: 0,
  }
}

export function computeStats(history: RoundResult[]): HistoryStats {
  const stats = emptyStats()
  for (const round of history) {
    stats.valueCounts[round.cardA] += 1
    stats.valueCounts[round.cardB] += 1
    stats.cardDuel[round.cardDuel] += 1
    stats.totalBand[round.totalBand] += 1
    if (round.isPair) stats.pairCount += 1
    if (round.oddEven === 'ODD') stats.oddCount += 1
    else stats.evenCount += 1
  }
  return stats
}
