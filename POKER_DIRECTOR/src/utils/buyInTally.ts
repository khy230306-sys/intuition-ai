import type { TournamentEntry } from '@/types'

/** Effective buy-in check count (paper ledger strokes). */
export function getBuyInMarks(entry: Pick<TournamentEntry, 'buyInMarks' | 'rebuyCount' | 'reentryCount'>): number {
  if (typeof entry.buyInMarks === 'number' && Number.isFinite(entry.buyInMarks)) {
    return Math.max(0, Math.floor(entry.buyInMarks))
  }
  return Math.max(1, 1 + (entry.rebuyCount || 0) + (entry.reentryCount || 0))
}

/** Split into complete 正 groups (5) and remaining strokes (0–4). */
export function splitJeong(count: number): { full: number; rest: number } {
  const n = Math.max(0, Math.floor(count))
  return { full: Math.floor(n / 5), rest: n % 5 }
}
