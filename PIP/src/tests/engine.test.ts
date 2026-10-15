import { describe, expect, it } from 'vitest'
import { assertValidFullDeck, countByValue, createDeck } from '../game/deck'
import {
  buildRoundResult,
  judgeCardDuel,
  judgeOddEven,
  judgePair,
  judgeTotalBand,
} from '../game/rules'
import { settleBet } from '../game/payout'
import {
  consumeRound,
  createShoe,
  isShoeComplete,
  peekNextPair,
  remainingCards,
  validateShoeIntegrity,
} from '../game/shoe'
import { canTransition } from '../game/stateMachine'
import { HIDDEN_COUNT, PLAYING_COUNT, ROUNDS_PER_SHOE } from '../game/types'

describe('PIP deck', () => {
  it('creates exactly 50 cards with 10 of each pip', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(50)
    assertValidFullDeck(deck)
    expect(countByValue(deck)).toEqual({ 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 })
  })
})

describe('PIP shoe', () => {
  it('splits into frozen hidden 6 and playing 44', () => {
    const shoe = createShoe(1)
    expect(shoe.hidden).toHaveLength(HIDDEN_COUNT)
    expect(shoe.playing).toHaveLength(PLAYING_COUNT)
    expect(validateShoeIntegrity(shoe)).toEqual([])
    expect(remainingCards(shoe)).toBe(44)
  })

  it('plays exactly 22 rounds without reshuffle or reuse', () => {
    let shoe = createShoe(7)
    const usedIds: string[] = []
    const frozenPlaying = shoe.playing.map((card) => card.id)

    for (let i = 0; i < ROUNDS_PER_SHOE; i += 1) {
      const pair = peekNextPair(shoe)
      usedIds.push(pair.cardA.id, pair.cardB.id)
      const result = buildRoundResult(i + 1, pair.cardA.value, pair.cardB.value)
      shoe = consumeRound(shoe, result)
    }

    expect(shoe.history).toHaveLength(22)
    expect(isShoeComplete(shoe)).toBe(true)
    expect(new Set(usedIds).size).toBe(44)
    expect(shoe.playing.map((card) => card.id)).toEqual(frozenPlaying)
    expect(validateShoeIntegrity(shoe)).toEqual([])
  })

  it('keeps hidden cards immutable during shoe', () => {
    const shoe = createShoe(3)
    const hiddenIds = shoe.hidden.map((card) => card.id)
    let next = shoe
    for (let i = 0; i < 5; i += 1) {
      const pair = peekNextPair(next)
      next = consumeRound(
        next,
        buildRoundResult(i + 1, pair.cardA.value, pair.cardB.value),
      )
    }
    expect(next.hidden.map((card) => card.id)).toEqual(hiddenIds)
  })
})

describe('PIP rules', () => {
  it('judges card duel', () => {
    expect(judgeCardDuel(2, 4)).toBe('UP')
    expect(judgeCardDuel(5, 1)).toBe('DOWN')
    expect(judgeCardDuel(3, 3)).toBe('SAME')
  })

  it('judges total bands and extras', () => {
    expect(judgeTotalBand(2)).toBe('LOW')
    expect(judgeTotalBand(5)).toBe('LOW')
    expect(judgeTotalBand(6)).toBe('CENTER')
    expect(judgeTotalBand(7)).toBe('HIGH')
    expect(judgeTotalBand(10)).toBe('HIGH')
    expect(judgeOddEven(7)).toBe('ODD')
    expect(judgeOddEven(8)).toBe('EVEN')
    expect(judgePair(4, 4)).toBe(true)
    expect(judgePair(4, 2)).toBe(false)
  })

  it('settles demo payouts', () => {
    const result = buildRoundResult(1, 2, 4)
    const win = settleBet(result, { mode: 'CARD_DUEL', choice: 'UP', stake: 100 })
    const lose = settleBet(result, { mode: 'TOTAL', choice: 'LOW', stake: 100 })
    expect(win.won).toBe(true)
    expect(win.payout).toBeGreaterThan(0)
    expect(lose.won).toBe(false)
    expect(lose.payout).toBe(0)
  })
})

describe('PIP state machine', () => {
  it('allows expected transitions only', () => {
    expect(canTransition('BETTING_OPEN', 'BETTING_LOCK')).toBe(true)
    expect(canTransition('BETTING_OPEN', 'RESULT')).toBe(false)
    expect(canTransition('SHOE_COMPLETE', 'HIDDEN_REVEAL')).toBe(true)
  })
})
