import type { Judgment, Outcome, PendingPrediction, PredictionRecord, Side } from './types'

export function judgePrediction(
  pending: PendingPrediction | null,
  actual: Outcome,
): PredictionRecord | null {
  if (!pending) return null
  if (actual !== 'P' && actual !== 'B') return null // TIE excluded
  const result: Judgment = pending.pick === actual ? 'WIN' : 'LOSE'
  return {
    ...pending,
    actualResult: actual,
    result,
    judgedAt: new Date().toISOString(),
  }
}

export function successMarks(
  records: readonly PredictionRecord[],
  limit = 12,
): Array<'O' | 'X'> {
  return records
    .filter((r) => r.result === 'WIN' || r.result === 'LOSE')
    .slice(-limit)
    .map((r) => (r.result === 'WIN' ? 'O' : 'X'))
}

export function successStats(records: readonly PredictionRecord[], limit = 12): {
  marks: Array<'O' | 'X'>
  wins: number
  losses: number
  rate: number
} {
  const marks = successMarks(records, limit)
  const wins = marks.filter((m) => m === 'O').length
  const losses = marks.filter((m) => m === 'X').length
  const rate = marks.length === 0 ? 0 : (wins / marks.length) * 100
  return { marks, wins, losses, rate }
}

export function sideLabel(side: Side): string {
  return side === 'P' ? 'PLAYER' : 'BANKER'
}
