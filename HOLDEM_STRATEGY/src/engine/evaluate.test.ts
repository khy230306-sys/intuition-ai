import { describe, expect, it } from 'vitest'
import { evaluate5, evaluateBest, CATEGORY, categoryOf } from '@/engine/evaluate'
import type { Card } from '@/engine/cards'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('evaluate', () => {
  it('detects royal/straight flush', () => {
    const score = evaluate5([c(14, 's'), c(13, 's'), c(12, 's'), c(11, 's'), c(10, 's')])
    expect(categoryOf(score)).toBe(CATEGORY.straightFlush)
  })

  it('detects wheel straight', () => {
    const score = evaluate5([c(14, 's'), c(2, 'h'), c(3, 'd'), c(4, 'c'), c(5, 's')])
    expect(categoryOf(score)).toBe(CATEGORY.straight)
  })

  it('detects full house', () => {
    const score = evaluate5([c(14, 's'), c(14, 'h'), c(14, 'd'), c(9, 'c'), c(9, 's')])
    expect(categoryOf(score)).toBe(CATEGORY.fullHouse)
  })

  it('picks best of seven', () => {
    const score = evaluateBest([
      c(14, 's'),
      c(14, 'h'),
      c(2, 'd'),
      c(3, 'c'),
      c(9, 's'),
      c(9, 'h'),
      c(9, 'd'),
    ])
    expect(categoryOf(score)).toBe(CATEGORY.fullHouse)
  })

  it('AA beats KK', () => {
    const aa = evaluateBest([c(14, 's'), c(14, 'h'), c(2, 'd'), c(3, 'c'), c(7, 's')])
    const kk = evaluateBest([c(13, 's'), c(13, 'h'), c(2, 'd'), c(3, 'c'), c(7, 's')])
    expect(aa).toBeGreaterThan(kk)
  })
})
