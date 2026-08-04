import { describe, expect, it } from 'vitest'
import { wilsonLowerBound } from './wilson'

describe('wilsonLowerBound', () => {
  it('all success should have a reasonably high lower bound', () => {
    const lb = wilsonLowerBound(10, 10)
    // 95% Wilson 하한은 0.7대 이상이어야 하는 경우가 일반적입니다.
    expect(lb).toBeGreaterThan(0.7)
    expect(lb).toBeLessThan(1)
  })

  it('zero success should produce 0', () => {
    const lb = wilsonLowerBound(0, 10)
    expect(lb).toBe(0)
  })
})

