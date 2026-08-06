import { describe, expect, it } from 'vitest'
import {
  dealBaccaratRound,
  handTotal,
  resolveWinner,
  settlePayout,
  shouldBankerDraw,
} from '../game/baccarat/engine'
import type { Card } from '../game/baccarat/types'

function card(rank: Card['rank'], suit: Card['suit'] = 'S'): Card {
  return { rank, suit, id: `${rank}-${suit}-${Math.random()}` }
}

describe('ORBIS Baccarat engine', () => {
  it('computes baccarat totals', () => {
    expect(handTotal([card('A'), card('8')])).toBe(9)
    expect(handTotal([card('K'), card('5')])).toBe(5)
    expect(handTotal([card('9'), card('9')])).toBe(8)
  })

  it('resolves winners', () => {
    expect(resolveWinner(7, 5)).toBe('player')
    expect(resolveWinner(4, 9)).toBe('banker')
    expect(resolveWinner(6, 6)).toBe('tie')
  })

  it('applies banker third-card rules', () => {
    expect(shouldBankerDraw(2, null)).toBe(true)
    expect(shouldBankerDraw(6, null)).toBe(false)
    expect(shouldBankerDraw(3, card('8'))).toBe(false)
    expect(shouldBankerDraw(5, card('4'))).toBe(true)
    expect(shouldBankerDraw(6, card('6'))).toBe(true)
  })

  it('settles demo payouts', () => {
    expect(settlePayout('player', 100, 'player')).toBe(200)
    expect(settlePayout('banker', 100, 'banker')).toBe(195)
    expect(settlePayout('tie', 100, 'tie')).toBe(800)
    expect(settlePayout('player', 100, 'tie')).toBe(100)
    expect(settlePayout('player', 100, 'banker')).toBe(0)
  })

  it('deals a complete round from a shoe', () => {
    const shoe = [
      card('2'),
      card('3'),
      card('4'),
      card('5'),
      card('6'),
      card('7'),
      card('8'),
      card('9'),
    ]
    // deal draws with pop: last cards come first
    const packed = [...shoe].reverse()
    const round = dealBaccaratRound(packed)
    expect(round.player.cards.length).toBeGreaterThanOrEqual(2)
    expect(round.banker.cards.length).toBeGreaterThanOrEqual(2)
    expect(['player', 'banker', 'tie']).toContain(round.winner)
  })
})
