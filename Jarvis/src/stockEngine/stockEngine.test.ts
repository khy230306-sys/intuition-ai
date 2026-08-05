import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  factorsFromBars,
  factorsFromQuote,
  rangePosition,
  rsiProxyFromRet5d,
} from './factors'
import { detectMarket, detectSectorFilter, filterUniverse, REC_UNIVERSE } from './universe'
import {
  actionFromScore,
  enrichWithRelativeStrength,
  scorePick,
  wantsStockRecommend,
} from './screen'
import { wantsStockAnalysis } from './analyze'
import { attractivenessFromScore, deriveTradeLevels } from './levels'
import type { QuoteSnapshot } from '../types'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, String(v))
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
  clear: () => store.clear(),
})

function q(partial: Partial<QuoteSnapshot> & Pick<QuoteSnapshot, 'symbol' | 'price'>): QuoteSnapshot {
  return {
    name: partial.name || partial.symbol,
    currency: partial.currency || 'KRW',
    changePct: partial.changePct ?? 0,
    dayHigh: partial.dayHigh ?? null,
    dayLow: partial.dayLow ?? null,
    fiftyTwoHigh: partial.fiftyTwoHigh ?? partial.price * 1.2,
    fiftyTwoLow: partial.fiftyTwoLow ?? partial.price * 0.8,
    volume: partial.volume ?? 1_000_000,
    ret5dPct: partial.ret5dPct,
    avgVolume5d: partial.avgVolume5d,
    fetchedAt: Date.now(),
    source: 'snapshot',
    ...partial,
  }
}

describe('stockEngine universe', () => {
  it('has broad liquid universe', () => {
    expect(REC_UNIVERSE.length).toBeGreaterThanOrEqual(80)
    expect(REC_UNIVERSE.some((c) => c.symbol === '005930.KS')).toBe(true)
    expect(REC_UNIVERSE.some((c) => c.symbol === 'NVDA')).toBe(true)
    expect(REC_UNIVERSE.some((c) => c.symbol === 'SMH')).toBe(true)
    expect(REC_UNIVERSE.some((c) => c.kind === 'etf')).toBe(true)
  })

  it('filters market and sector', () => {
    expect(detectMarket('미국 종목 추천')).toBe('US')
    expect(detectMarket('한국 주식 추천')).toBe('KR')
    expect(detectSectorFilter('반도체 종목 추천')).toBe('반도체')
    const semi = filterUniverse('ALL', '반도체')
    expect(semi.every((c) => c.sector === '반도체' || c.symbol === 'SMH' || c.symbol === 'SOXX')).toBe(
      true,
    )
    expect(semi.length).toBeGreaterThan(5)
  })
})

describe('stockEngine factors + score', () => {
  it('computes range, volume, rsi proxy, momentum', () => {
    const quote = q({
      symbol: 'TEST',
      price: 90,
      fiftyTwoLow: 80,
      fiftyTwoHigh: 120,
      volume: 2_000_000,
      avgVolume5d: 1_000_000,
      ret5dPct: -8,
      changePct: -3,
    })
    expect(rangePosition(quote)).toBeCloseTo(0.25, 2)
    const f = factorsFromQuote(quote)
    expect(f.volumeRatio).toBeCloseTo(2, 2)
    expect(f.ret5dPct).toBe(-8)
    expect(f.rsiProxy).toBeLessThan(45)
    expect(f.meanRevScore).toBeGreaterThan(0.5)
    expect(rsiProxyFromRet5d(12)).toBeGreaterThan(60)
  })

  it('derives bars factors', () => {
    const quote = q({ symbol: 'X', price: 110 })
    const f = factorsFromBars([100, 102, 105, 108, 110], [1e6, 1e6, 1e6, 1e6, 2e6], quote)
    expect(f.ret5dPct).toBeCloseTo(10, 0)
    expect(f.volumeRatio).toBeCloseTo(2, 1)
  })

  it('scores bottom-of-range higher for conservative', () => {
    const c = REC_UNIVERSE.find((x) => x.symbol === '005930.KS')!
    const low = scorePick(
      c,
      q({
        symbol: c.symbol,
        name: c.name,
        price: 85,
        fiftyTwoLow: 80,
        fiftyTwoHigh: 120,
        changePct: -0.2,
        ret5dPct: -1,
      }),
      'conservative',
      new Set(),
      new Set(),
    )
    const high = scorePick(
      c,
      q({
        symbol: c.symbol,
        name: c.name,
        price: 118,
        fiftyTwoLow: 80,
        fiftyTwoHigh: 120,
        changePct: 5,
        ret5dPct: 12,
      }),
      'conservative',
      new Set(),
      new Set(),
    )
    expect(low.score).toBeGreaterThan(high.score)
    expect(actionFromScore(70)).toBe('엔진추천')
    expect(actionFromScore(30)).toBe('회피')
  })

  it('enriches relative strength', () => {
    const c = REC_UNIVERSE.find((x) => x.symbol === 'AAPL')!
    const picks = [8, -5, 2].map((ret) =>
      scorePick(
        c,
        q({ symbol: c.symbol, name: c.name, price: 100, ret5dPct: ret, changePct: 0 }),
        'balanced',
        new Set(),
        new Set(),
      ),
    )
    const enriched = enrichWithRelativeStrength(picks)
    const strong = enriched.find((p) => p.factors.ret5dPct === 8)!
    const weak = enriched.find((p) => p.factors.ret5dPct === -5)!
    expect(strong.rsPctile).toBeGreaterThan(weak.rsPctile!)
    expect(strong.score).toBeGreaterThanOrEqual(weak.score)
  })
})

describe('stockEngine trade levels', () => {
  it('derives attractiveness, target, stop, sell from quote', () => {
    expect(attractivenessFromScore(78)).toBe(78)
    const lv = deriveTradeLevels(100_000, 78, 'balanced', {
      fiftyTwoHigh: 120_000,
      fiftyTwoLow: 80_000,
      dayVolAbs: 1.2,
      currency: 'KRW',
    })
    expect(lv).not.toBeNull()
    expect(lv!.attractivenessPct).toBe(78)
    expect(lv!.targetPrice).toBeGreaterThan(100_000)
    expect(lv!.stopPrice).toBeLessThan(100_000)
    expect(lv!.sellPrice).toBeGreaterThan(100_000)
    expect(lv!.sellPrice).toBeLessThanOrEqual(lv!.targetPrice)
  })
})

describe('stockEngine intents', () => {
  beforeEach(() => store.clear())

  it('detects recommend and analysis asks', () => {
    expect(wantsStockRecommend('주식 종목 추천')).toBe(true)
    expect(wantsStockRecommend('반도체 종목 추천')).toBe(true)
    expect(wantsStockRecommend('퀀트 추천')).toBe(true)
    expect(wantsStockRecommend('맛집 추천')).toBe(false)
    expect(wantsStockAnalysis('삼성전자 종목분석')).toBe(true)
    expect(wantsStockAnalysis('삼성전자 시세')).toBe(false)
  })
})
