import { isWinningChoice } from './rules'
import type { BetSelection, RoundResult, Settlement } from './types'

/** Demo-only multipliers. No cash value. */
const MULTIPLIERS: Record<string, Record<string, number>> = {
  CARD_DUEL: {
    UP: 1.95,
    DOWN: 1.95,
    SAME: 4.5,
  },
  TOTAL: {
    LOW: 1.9,
    CENTER: 4.2,
    HIGH: 1.9,
  },
  ODD_EVEN: {
    ODD: 1.95,
    EVEN: 1.95,
  },
  PAIR: {
    PAIR: 5.5,
    NO_PAIR: 1.15,
  },
  EXACT_TOTAL: {
    '2': 18,
    '3': 12,
    '4': 8,
    '5': 6,
    '6': 5,
    '7': 6,
    '8': 8,
    '9': 12,
    '10': 18,
  },
}

export function getMultiplier(mode: string, choice: string): number {
  return MULTIPLIERS[mode]?.[choice] ?? 0
}

export function settleBet(result: RoundResult, selection: BetSelection): Settlement {
  const won = isWinningChoice(result, selection.mode, selection.choice)
  const multiplier = getMultiplier(selection.mode, selection.choice)
  const payout = won ? Math.floor(selection.stake * multiplier) : 0
  return {
    selection,
    won,
    payout,
    net: payout - selection.stake,
  }
}
