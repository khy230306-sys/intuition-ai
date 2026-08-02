import { beforeEach, describe, expect, it, vi } from 'vitest'
import { positionSize, dcaPlan, compound } from './finance'
import { resolveTicker, extractTickerFromText } from './tickers'
import { safeEvalMath, convertUnit } from './smart'

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

describe('tickers', () => {
  it('resolves korean aliases', () => {
    expect(resolveTicker('삼성전자')?.symbol).toBe('005930.KS')
    expect(resolveTicker('엔비디아')?.symbol).toBe('NVDA')
    expect(resolveTicker('005930')?.symbol).toBe('005930.KS')
  })

  it('extracts from sentence', () => {
    expect(extractTickerFromText('삼성전자 시세 알려줘')?.name).toBe('삼성전자')
  })
})

describe('finance math', () => {
  it('sizes positions', () => {
    const r = positionSize({ capital: 10_000_000, riskPct: 1, entry: 70000, stop: 65000 })
    expect(r.shares).toBe(20)
    expect(r.riskAmount).toBe(100_000)
  })

  it('builds dca and compound text', () => {
    expect(dcaPlan(500000, 120, 7)).toContain('예상 평가액')
    expect(compound(1_000_000, 8, 10, 0)).toContain('예상')
  })
})

describe('smart utils', () => {
  it('calculates and converts', () => {
    expect(safeEvalMath('12*5')).toBe(60)
    expect(convertUnit('10kg를 파운드로 변환')).toContain('lb')
  })
})

describe('jarvis brain investing + life', () => {
  beforeEach(() => {
    store.clear()
  })

  it('answers briefing and help', async () => {
    const { think } = await import('./brain')
    const brief = await think('브리핑')
    expect(brief.text).toMatch(/AIZIO|할 일|투자/)
    const help = await think('도움말')
    expect(help.text).toContain('투자')
  })

  it('handles everyday weather / time without API key', async () => {
    const { think } = await import('./brain')
    const weather = await think('오늘 날씨 알려줘')
    expect(weather.text).toMatch(/날씨/)
    expect(weather.speak).toBe(true)
    const time = await think('지금 몇 시야')
    expect(time.text).toMatch(/시|분|오전|오후|지금/)
    const garbage = await think('대화식자제헤달')
    expect(garbage.text).toMatch(/음성을 정확히|또박또박|날씨/)
    const wipe = await think('대화 초기화')
    expect(wipe.clearChat).toBe(true)
    expect(wipe.text).toMatch(/초기화|삭제/)
  })

  it('manages watchlist and holdings locally', async () => {
    const { think } = await import('./brain')
    const w = await think('관심종목 삼성전자 추가')
    expect(w.text).toContain('관심종목 추가')
    const h = await think('보유 삼성전자 10주 평단 70000')
    expect(h.text).toMatch(/보유|삼성/)
  })

  it('records shopping and expenses', async () => {
    const { think } = await import('./brain')
    const s = await think('장바구니 우유 계란')
    expect(s.text).toContain('우유')
    const e = await think('지출 커피 4500원')
    expect(e.text).toContain('4,500')
  })

  it('fetches a live quote when online', async () => {
    const { think } = await import('./brain')
    const q = await think('삼성전자 시세')
    expect(q.text.length).toBeGreaterThan(10)
    expect(q.text).toMatch(/삼성|005930|현재가|시세/)
  })
})
