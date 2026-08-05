import { beforeEach, describe, expect, it, vi } from 'vitest'
import { wantsStockRecommend } from './recommend'

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
  randomUUID: () => `id-${Math.random().toString(16).slice(2)}`,
})

describe('cold stock recommend', () => {
  beforeEach(() => {
    store.clear()
  })

  it('detects recommend intents', () => {
    expect(wantsStockRecommend('주식 종목 추천')).toBe(true)
    expect(wantsStockRecommend('냉정하게 추천해줘')).toBe(true)
    expect(wantsStockRecommend('미국 보수 추천')).toBe(true)
    expect(wantsStockRecommend('안녕')).toBe(false)
  })

  it('does not treat lifestyle asks as stock picks', () => {
    expect(wantsStockRecommend('좋은 음악을 추천해줘')).toBe(false)
    expect(wantsStockRecommend('맛집추천')).toBe(false)
    expect(wantsStockRecommend('국내여행은 어디가좋을까?')).toBe(false)
    expect(wantsStockRecommend('카페 추천해줘')).toBe(false)
    expect(wantsStockRecommend('영화 추천')).toBe(false)
    expect(wantsStockRecommend('추천해줘')).toBe(false)
  })

  it('returns cold screening for 주식 종목 추천', async () => {
    const { think } = await import('./brain')
    const reply = await think('주식 종목 추천')
    expect(reply.text).toMatch(/엔진 추천|AI퀀트|스크리닝/)
    expect(reply.text).toMatch(/본인/)
    expect(reply.text).not.toMatch(/이해하지 못했/)
  }, 30000)
})

