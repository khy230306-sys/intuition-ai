import { describe, expect, it } from 'vitest'
import { buildAdvice } from '@/engine/strategy'
import type { Card } from '@/engine/cards'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('strategy', () => {
  it('recommends raise for AA preflop', () => {
    const advice = buildAdvice(
      [c(14, 's'), c(14, 'h')],
      [],
      { winPct: 85, tiePct: 0.5, losePct: 14.5, trials: 1000, opponents: 1 },
      'early',
    )
    expect(advice.action).toBe('raise')
  })

  it('recommends fold for trash preflop', () => {
    const advice = buildAdvice(
      [c(7, 's'), c(2, 'h')],
      [],
      { winPct: 28, tiePct: 1, losePct: 71, trials: 1000, opponents: 1 },
      'early',
    )
    expect(advice.action).toBe('fold')
  })
})
