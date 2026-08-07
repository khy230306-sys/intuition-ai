import type { GamePhase } from './types'

const transitions: Record<GamePhase, GamePhase[]> = {
  SHOE_INIT: ['BETTING_OPEN'],
  BETTING_OPEN: ['BETTING_LOCK'],
  BETTING_LOCK: ['CARD_A_REVEAL'],
  CARD_A_REVEAL: ['CARD_B_REVEAL'],
  CARD_B_REVEAL: ['RESULT'],
  RESULT: ['SETTLEMENT'],
  SETTLEMENT: ['NEXT_ROUND', 'SHOE_COMPLETE'],
  NEXT_ROUND: ['BETTING_OPEN'],
  SHOE_COMPLETE: ['HIDDEN_REVEAL'],
  HIDDEN_REVEAL: ['NEW_SHOE'],
  NEW_SHOE: ['SHOE_INIT'],
}

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return transitions[from]?.includes(to) ?? false
}

export function transition(from: GamePhase, to: GamePhase): GamePhase {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid PIP phase transition: ${from} -> ${to}`)
  }
  return to
}
