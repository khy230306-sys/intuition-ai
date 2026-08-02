import { beforeEach, describe, expect, it, vi } from 'vitest'
import { correlation, describe as desc, mean, parseNumbers, stdev } from './stats'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
})

vi.stubGlobal('crypto', {
  randomUUID: () => `id-${store.size}-${Math.random().toString(16).slice(2)}`,
})

describe('stats engine', () => {
  it('parses and describes numbers', () => {
    const nums = parseNumbers('1.2, -0.5 3 10%')
    expect(nums).toEqual([1.2, -0.5, 3, 10])
    const d = desc([2, 4, 4, 4, 5, 5, 7, 9])!
    expect(d.n).toBe(8)
    expect(d.mean).toBe(5)
    expect(d.median).toBe(4.5)
    expect(d.mode).toEqual([4])
  })

  it('computes correlation', () => {
    const r = correlation([1, 2, 3, 4], [2, 4, 6, 8])
    expect(r).toBeCloseTo(1, 5)
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeGreaterThan(0)
    expect(mean([1, 2, 3])).toBe(2)
  })
})

describe('stats brain realtime', () => {
  beforeEach(() => {
    store.clear()
  })

  it('stores data and answers statistical questions', async () => {
    const { think } = await import('./brain')
    const saved = await think('데이터 수익률 1.2 -0.5 3.1 0.8 -1.2')
    expect(saved.text).toMatch(/통계 분석|평균|n=5/)

    const add = await think('추가 2.0')
    expect(add.text).toMatch(/n=6/)

    const avg = await think('평균')
    expect(avg.text).toMatch(/평균/)

    const report = await think('통계')
    expect(report.text).toContain('표준편차')

    const prob = await think('확률 0 이상')
    expect(prob.text).toMatch(/P\(X/)
  })
})
