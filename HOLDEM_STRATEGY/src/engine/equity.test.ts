import { describe, expect, it } from 'vitest'
import { estimateEquity, createRng } from '@/engine/equity'
import type { Card } from '@/engine/cards'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('equity', () => {
  it('AA is favorite preflop vs 1 opponent', () => {
    const eq = estimateEquity([c(14, 's'), c(14, 'h')], [], 1, 2000, createRng(42))
    expect(eq.winPct).toBeGreaterThan(75)
  })

  it('72o is underdog preflop', () => {
    const eq = estimateEquity([c(7, 's'), c(2, 'h')], [], 1, 2000, createRng(7))
    expect(eq.winPct).toBeLessThan(40)
  })
})
