import { assertValidFullDeck, createDeck } from './deck'
import { shuffleCopy } from './shuffle'
import type { Card, RoundResult, Shoe } from './types'
import { HIDDEN_COUNT, PLAYING_COUNT, ROUNDS_PER_SHOE } from './types'

export function createShoe(shoeNumber: number): Shoe {
  const fullOrder = shuffleCopy(createDeck())
  assertValidFullDeck(fullOrder)

  const hidden = fullOrder.slice(0, HIDDEN_COUNT)
  const playing = fullOrder.slice(HIDDEN_COUNT)

  if (hidden.length !== HIDDEN_COUNT) {
    throw new Error(`Hidden must be ${HIDDEN_COUNT}`)
  }
  if (playing.length !== PLAYING_COUNT) {
    throw new Error(`Playing must be ${PLAYING_COUNT}`)
  }

  // Freeze order: shoe never reshuffles mid-run
  return {
    shoeNumber,
    fullOrder: Object.freeze([...fullOrder]) as Card[],
    hidden: Object.freeze([...hidden]) as Card[],
    playing: Object.freeze([...playing]) as Card[],
    cursor: 0,
    history: [],
  }
}

export function remainingCards(shoe: Shoe): number {
  return Math.max(0, shoe.playing.length - shoe.cursor)
}

export function currentRound(shoe: Shoe): number {
  return Math.floor(shoe.cursor / 2) + 1
}

export function roundsCompleted(shoe: Shoe): number {
  return shoe.history.length
}

export function isShoeComplete(shoe: Shoe): boolean {
  return shoe.history.length >= ROUNDS_PER_SHOE || remainingCards(shoe) < 2
}

export function peekNextPair(shoe: Shoe): { cardA: Card; cardB: Card } {
  if (remainingCards(shoe) < 2) {
    throw new Error('Not enough cards remaining in shoe')
  }
  return {
    cardA: shoe.playing[shoe.cursor]!,
    cardB: shoe.playing[shoe.cursor + 1]!,
  }
}

export function consumeRound(shoe: Shoe, result: RoundResult): Shoe {
  if (isShoeComplete(shoe)) {
    throw new Error('Cannot consume round from completed shoe')
  }
  return {
    ...shoe,
    cursor: shoe.cursor + 2,
    history: [...shoe.history, result],
  }
}

export function validateShoeIntegrity(shoe: Shoe): string[] {
  const errors: string[] = []
  try {
    assertValidFullDeck(shoe.fullOrder as Card[])
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  if (shoe.hidden.length !== HIDDEN_COUNT) {
    errors.push(`Hidden count ${shoe.hidden.length} != ${HIDDEN_COUNT}`)
  }
  if (shoe.playing.length !== PLAYING_COUNT) {
    errors.push(`Playing count ${shoe.playing.length} != ${PLAYING_COUNT}`)
  }

  const joined = [...shoe.hidden, ...shoe.playing]
  if (joined.length !== shoe.fullOrder.length) {
    errors.push('Hidden+Playing length mismatch with full order')
  } else {
    for (let i = 0; i < joined.length; i += 1) {
      if (joined[i]?.id !== shoe.fullOrder[i]?.id) {
        errors.push('Hidden/Playing order diverged from frozen full order')
        break
      }
    }
  }

  if (shoe.cursor % 2 !== 0) {
    errors.push('Cursor must always advance by 2')
  }
  if (shoe.history.length > ROUNDS_PER_SHOE) {
    errors.push('History exceeds rounds per shoe')
  }
  if (shoe.cursor !== shoe.history.length * 2) {
    errors.push('Cursor and history are out of sync')
  }

  return errors
}
