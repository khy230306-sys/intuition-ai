import { describe, expect, it } from 'vitest'
import { analyze, getHeaderStats, numberWinRates, positionWinRates } from '../src/ai'
import { csvToRecords, recordsToCsv } from '../src/storage'
import type { CardNumber, GameRecord, Position } from '../src/types'

function rec(
  cards: [CardNumber, CardNumber, CardNumber],
  winner: Position,
  recommended: Position | null = null,
  i = 0,
): GameRecord {
  return {
    id: `t${i}`,
    cards,
    winner,
    recommended,
    hit: recommended === null ? null : recommended === winner,
    createdAt: 1_700_000_000_000 + i * 1000,
  }
}

describe('analyze', () => {
  it('returns flat probs with no data', () => {
    const r = analyze([], [1, 5, 9])
    expect(r.sample).toBe(0)
    expect(r.probs[0] + r.probs[1] + r.probs[2]).toBeCloseTo(1, 5)
    expect(r.confidence).toBeLessThan(20)
  })

  it('recommends the historically stronger position for identical combo', () => {
    const records: GameRecord[] = []
    for (let i = 0; i < 20; i++) {
      records.push(rec([1, 5, 9], 2, 2, i))
    }
    for (let i = 0; i < 5; i++) {
      records.push(rec([1, 5, 9], 1, 2, 100 + i))
    }
    const r = analyze(records, [1, 5, 9])
    expect(r.recommended).toBe(2)
    expect(r.probs[1]).toBeGreaterThan(r.probs[0])
    expect(r.probs[1]).toBeGreaterThan(r.probs[2])
    expect(r.confidence).toBeGreaterThan(30)
  })

  it('header stats reflect hit rate', () => {
    const records = [
      rec([1, 2, 3], 1, 1, 1),
      rec([4, 5, 6], 2, 1, 2),
      rec([7, 8, 9], 3, 3, 3),
      rec([1, 1, 1], 2, 2, 4),
    ]
    const h = getHeaderStats(records)
    expect(h.total).toBe(4)
    expect(h.overallHitRate).toBeCloseTo(0.75, 5)
  })
})

describe('stats helpers', () => {
  it('computes position and number rates', () => {
    const records = [
      rec([1, 2, 3], 1, null, 1),
      rec([1, 5, 9], 2, null, 2),
      rec([10, 2, 3], 1, null, 3),
    ]
    const pos = positionWinRates(records)
    expect(pos[0].total).toBe(2)
    expect(pos[1].total).toBe(1)
    const nums = numberWinRates(records)
    expect(nums[0].n).toBe(1)
    expect(nums[0].total).toBeGreaterThan(0)
  })
})

describe('csv', () => {
  it('round-trips records', () => {
    const records = [rec([1, 5, 9], 2, 2, 1), rec([3, 4, 7], 1, 3, 2)]
    const csv = recordsToCsv(records)
    const back = csvToRecords(csv)
    expect(back).toHaveLength(2)
    expect(back[0].cards).toEqual([1, 5, 9])
    expect(back[0].winner).toBe(2)
    expect(back[1].recommended).toBe(3)
  })
})
