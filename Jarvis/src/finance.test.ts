import { describe, expect, it } from 'vitest'
import { formatQuote, sanitizeChangePct } from './finance'
import type { QuoteSnapshot } from './types'

describe('quote formatting', () => {
  it('hides absurd day change percentages', () => {
    expect(sanitizeChangePct(null)).toBeNull()
    expect(sanitizeChangePct(2.5)).toBe(2.5)
    expect(sanitizeChangePct(-22)).toBe(-22)
    expect(sanitizeChangePct(-25.1)).toBeNull()
    expect(sanitizeChangePct(40)).toBeNull()
  })

  it('labels quote source and age', () => {
    const q: QuoteSnapshot = {
      symbol: 'AAPL',
      name: 'Apple',
      price: 190,
      currency: 'USD',
      changePct: 1.2,
      dayHigh: 191,
      dayLow: 189,
      fiftyTwoHigh: 200,
      fiftyTwoLow: 150,
      volume: 1_000_000,
      fetchedAt: Date.now() - 120_000,
      source: 'snapshot',
    }
    const text = formatQuote(q)
    expect(text).toMatch(/스냅샷/)
    expect(text).toMatch(/분 전/)
    expect(text).toMatch(/\+1\.20%/)
  })
})
