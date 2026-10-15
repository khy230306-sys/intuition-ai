import type { Card, PipValue } from './types'
import { DECK_SIZE } from './types'

export function createDeck(): Card[] {
  const deck: Card[] = []
  let serial = 0
  for (let value = 1; value <= 5; value += 1) {
    for (let copy = 0; copy < 10; copy += 1) {
      deck.push({
        id: `pip-${value}-${copy}-${serial}`,
        value: value as PipValue,
      })
      serial += 1
    }
  }
  if (deck.length !== DECK_SIZE) {
    throw new Error(`PIP deck must contain ${DECK_SIZE} cards`)
  }
  return deck
}

export function countByValue(cards: Card[]): Record<PipValue, number> {
  const counts: Record<PipValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const card of cards) {
    counts[card.value] += 1
  }
  return counts
}

export function assertValidFullDeck(cards: Card[]): void {
  if (cards.length !== DECK_SIZE) {
    throw new Error(`Expected ${DECK_SIZE} cards, got ${cards.length}`)
  }
  const counts = countByValue(cards)
  for (const value of [1, 2, 3, 4, 5] as PipValue[]) {
    if (counts[value] !== 10) {
      throw new Error(`Expected 10 cards of value ${value}, got ${counts[value]}`)
    }
  }
  const ids = new Set(cards.map((card) => card.id))
  if (ids.size !== cards.length) {
    throw new Error('Duplicate card ids detected in deck')
  }
}
