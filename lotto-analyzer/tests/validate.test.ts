import { describe, expect, it } from 'vitest'
import {
  DrawValidationError,
  validateCombination,
  validateDraw,
} from '../src/lotto/domain/validate'
import type { LottoDraw } from '../src/lotto/domain/types'

function baseDraw(): LottoDraw {
  return {
    drawNumber: 100,
    drawDate: '2024-06-01',
    numbers: [3, 12, 23, 31, 38, 44],
    bonusNumber: 7,
    source: 'test',
    fetchedAt: '2024-06-01T00:00:00.000Z',
  }
}

describe('validateDraw', () => {
  it('accepts a valid draw and sorts numbers', () => {
    const d = validateDraw({
      ...baseDraw(),
      numbers: [44, 3, 23, 12, 38, 31],
    })
    expect(d.numbers).toEqual([3, 12, 23, 31, 38, 44])
  })

  it('rejects duplicate main numbers', () => {
    expect(() =>
      validateDraw({ ...baseDraw(), numbers: [3, 3, 12, 23, 31, 38] }),
    ).toThrow(DrawValidationError)
  })

  it('rejects bonus conflicting with mains', () => {
    expect(() => validateDraw({ ...baseDraw(), bonusNumber: 3 })).toThrow(
      DrawValidationError,
    )
  })

  it('rejects invalid draw date', () => {
    expect(() => validateDraw({ ...baseDraw(), drawDate: '06-01-2024' })).toThrow(
      DrawValidationError,
    )
  })
})

describe('validateCombination', () => {
  it('accepts valid 6 unique numbers in range', () => {
    expect(validateCombination([45, 1, 22, 33, 11, 9])).toEqual([
      1, 9, 11, 22, 33, 45,
    ])
  })

  it('rejects out of range', () => {
    expect(() => validateCombination([0, 1, 2, 3, 4, 5])).toThrow(
      DrawValidationError,
    )
    expect(() => validateCombination([1, 2, 3, 4, 5, 46])).toThrow(
      DrawValidationError,
    )
  })

  it('rejects wrong length', () => {
    expect(() => validateCombination([1, 2, 3])).toThrow(DrawValidationError)
  })
})
