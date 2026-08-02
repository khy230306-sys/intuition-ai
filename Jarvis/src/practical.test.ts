import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseExpenseLine, wantsExpense } from './expenseParse'
import { convertAmount, FALLBACK_RATES, parseFxQuery, resetFxCache } from './fx'
import { marketSessionNow } from './finance'
import {
  formatWhenAt,
  parseWhenFromText,
  scheduleAlarm,
  setAlarmUiHandler,
  wantsLocalAlarm,
} from './notify'

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

vi.stubGlobal(
  'Notification',
  class {
    static permission = 'granted'
    static requestPermission = async () => 'granted'
    constructor(_title: string, _opts?: NotificationOptions) {}
    close() {}
  },
)

describe('expense one-liners', () => {
  it('parses bare and keyword forms', () => {
    expect(wantsExpense('커피 4500')).toBe(true)
    expect(parseExpenseLine('커피 4500')?.amount).toBe(4500)
    expect(parseExpenseLine('커피 4500')?.category).toBe('카페')
    expect(parseExpenseLine('4500원 택시')?.category).toBe('교통')
    expect(parseExpenseLine('지출 점심 1.5만')?.amount).toBe(15000)
    expect(parseExpenseLine('지출 커피 4500원')?.amount).toBe(4500)
    expect(wantsExpense('100달러 환율')).toBe(false)
  })
})

describe('fx parse', () => {
  it('parses conversion queries', () => {
    expect(parseFxQuery('100달러 환율')).toEqual({
      kind: 'convert',
      amount: 100,
      from: 'USD',
      to: 'KRW',
    })
    expect(parseFxQuery('환율')).toEqual({ kind: 'board' })
    expect(convertAmount(100, 'USD', 'KRW', FALLBACK_RATES)).toBe(145000)
  })
})

describe('market hours', () => {
  it('reports KR and US sessions with countdown language', () => {
    const text = marketSessionNow(new Date('2026-07-29T01:00:00Z'))
    expect(text).toMatch(/한국\(KRX\)/)
    expect(text).toMatch(/미국\(NYSE/)
    expect(text).toMatch(/개장|장전|장후|주말|휴장/)
  })
})

describe('local alarms', () => {
  beforeEach(() => {
    store.clear()
    vi.useRealTimers()
  })

  it('parses relative and absolute times', () => {
    const now = Date.parse('2026-07-29T03:00:00+09:00')
    const rel = parseWhenFromText('알림 30분 뒤 약 먹어', now)
    expect(rel?.whenAt).toBe(now + 30 * 60_000)
    expect(rel?.rest).toMatch(/약/)
    expect(wantsLocalAlarm('알림 30분 뒤 약')).toBe(true)
    const abs = parseWhenFromText('오후 3시에 알려줘 회의', now)
    expect(abs?.whenAt).toBeGreaterThan(now)
    expect(formatWhenAt(abs!.whenAt)).toMatch(/\d+:\d+/)
  })

  it('schedules and fires with fake timers', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    let fired = ''
    setAlarmUiHandler((a) => {
      fired = a.body
    })
    scheduleAlarm('AIZIO', '테스트 알림', now + 2000)
    expect(fired).toBe('')
    vi.advanceTimersByTime(2100)
    expect(fired).toBe('테스트 알림')
    setAlarmUiHandler(null)
    vi.useRealTimers()
  })
})

describe('brain wiring for practical features', () => {
  beforeEach(() => {
    store.clear()
    resetFxCache()
  })

  it('handles market hours, expense, and alarm intents', async () => {
    const { think } = await import('./brain')
    const m = await think('장시간')
    expect(m.text).toMatch(/KRX|장/)
    const e = await think('커피 4500')
    expect(e.text).toMatch(/4,500|지출/)
    const a = await think('알림 5분 뒤 물 마시기')
    expect(a.text).toMatch(/알림 예약/)
  })

  it('answers fx convert (network or fallback)', async () => {
    const { think } = await import('./brain')
    const r = await think('100달러 환율')
    expect(r.text).toMatch(/USD|달러|원/)
    expect(r.text.length).toBeGreaterThan(10)
  }, 15_000)
})
