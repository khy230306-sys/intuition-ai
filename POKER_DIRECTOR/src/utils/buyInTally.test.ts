import { describe, expect, it } from 'vitest'
import { getBuyInMarks, splitJeong } from '@/utils/buyInTally'

describe('buyInTally', () => {
  it('uses buyInMarks when present', () => {
    expect(getBuyInMarks({ buyInMarks: 7, rebuyCount: 0, reentryCount: 0 })).toBe(7)
  })

  it('falls back to 1 + rebuy + reentry', () => {
    expect(getBuyInMarks({ rebuyCount: 2, reentryCount: 1 })).toBe(4)
  })

  it('splits 正 groups', () => {
    expect(splitJeong(0)).toEqual({ full: 0, rest: 0 })
    expect(splitJeong(3)).toEqual({ full: 0, rest: 3 })
    expect(splitJeong(5)).toEqual({ full: 1, rest: 0 })
    expect(splitJeong(12)).toEqual({ full: 2, rest: 2 })
  })
})
