import { describe, expect, it } from 'vitest'
import {
  jaccard,
  mean,
  median,
  normalizeMap,
  oddCount,
  sectionCounts,
  stddev,
} from '../src/lotto/math/stats'
import { computeNumberStatistics } from '../src/lotto/features/numberStats'
import { GOLDEN_DRAWS } from './golden/dataset'

describe('math/stats', () => {
  it('computes mean and median', () => {
    expect(mean([2, 4, 6])).toBe(4)
    expect(median([1, 2, 9])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('computes stddev', () => {
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2)
  })

  it('normalizes score map to 0-100 range', () => {
    const norm = normalizeMap({ 1: 10, 2: 20, 3: 30 })
    expect(norm[1]).toBe(0)
    expect(norm[3]).toBe(100)
    expect(norm[2]).toBe(50)
  })

  it('computes jaccard similarity', () => {
    expect(jaccard([1, 2, 3], [3, 4, 5])).toBe(1 / 5)
    expect(jaccard([1, 2], [1, 2])).toBe(1)
  })

  it('counts odd numbers and sections', () => {
    expect(oddCount([1, 2, 3, 4, 5, 6])).toBe(3)
    expect(sectionCounts([1, 11, 21, 31, 41, 5])).toEqual([2, 1, 1, 1, 1])
  })
})

describe('numberStats', () => {
  it('builds statistics for golden draws', () => {
    const stats = computeNumberStatistics(GOLDEN_DRAWS)
    expect(stats.length).toBe(45)
    const num1 = stats.find((s) => s.number === 1)
    expect(num1?.totalAppearances).toBeGreaterThan(0)
    expect(num1?.temperature).toBeTruthy()
  })
})
