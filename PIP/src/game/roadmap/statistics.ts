import type { CardDuelResult, PipValue, RoundResult, TotalBand } from '../types'
import { ROUNDS_PER_SHOE } from '../types'
import { outcomeIcon, outcomeLabel } from './icons'
import type { MainRoadOutcome, RoadStatistics, StreakInfo } from './types'

function emptyStreak(): StreakInfo {
  return { outcome: null, length: 0, icon: '', label: '-' }
}

function streakFrom(outcome: MainRoadOutcome, length: number): StreakInfo {
  return {
    outcome,
    length,
    icon: outcomeIcon(outcome),
    label: outcomeLabel(outcome),
  }
}

/** Compute current/longest streaks on CARD DUEL ignoring SAME (tie does not break/extend). */
export function computeDuelStreaks(history: RoundResult[]): {
  current: StreakInfo
  longest: StreakInfo
} {
  let longest = emptyStreak()
  let currentOutcome: CardDuelResult | null = null
  let currentLen = 0

  for (const round of history) {
    if (round.cardDuel === 'SAME') continue
    if (currentOutcome === round.cardDuel) {
      currentLen += 1
    } else {
      currentOutcome = round.cardDuel
      currentLen = 1
    }
    if (currentLen > longest.length && currentOutcome) {
      longest = streakFrom(currentOutcome, currentLen)
    }
  }

  const current =
    currentOutcome && currentLen > 0 ? streakFrom(currentOutcome, currentLen) : emptyStreak()
  return { current, longest }
}

export function computeRoadStatistics(history: RoundResult[]): RoadStatistics {
  const cardDuel: Record<CardDuelResult, number> = { UP: 0, DOWN: 0, SAME: 0 }
  const totalBand: Record<TotalBand, number> = { LOW: 0, CENTER: 0, HIGH: 0 }
  const pipCounts: Record<PipValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const pairByValue: Record<PipValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const totalHistogram: Record<number, number> = {
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
  }

  let pairTotal = 0

  for (const round of history) {
    cardDuel[round.cardDuel] += 1
    totalBand[round.totalBand] += 1
    pipCounts[round.cardA] += 1
    pipCounts[round.cardB] += 1
    totalHistogram[round.total] = (totalHistogram[round.total] ?? 0) + 1
    if (round.isPair) {
      pairTotal += 1
      pairByValue[round.cardA] += 1
    }
  }

  const streaks = computeDuelStreaks(history)

  return {
    cardDuel,
    totalBand,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    progress: { completed: history.length, total: ROUNDS_PER_SHOE },
    pipCounts,
    pairByValue,
    pairTotal,
    totalHistogram,
  }
}
