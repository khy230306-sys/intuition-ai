import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHomeSummary } from './homeSummary'
import { appShareMessage, buildBackupQrPayload, QR_SAFE_CHARS } from './shareKit'
import { weatherCoordsMatch, weatherLabel, weatherPlaceMatches } from './weather'

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

describe('home summary', () => {
  beforeEach(() => store.clear())

  it('builds widget fields from storage', async () => {
    const { addReminder, addExpense } = await import('./storage')
    addReminder('약 먹기', '오늘', Date.now() + 3600_000)
    addReminder('운동')
    addExpense(4500, '카페', '커피')
    const s = buildHomeSummary({
      tempC: 12.4,
      code: 0,
      label: '맑음',
      precipProb: 10,
      place: '서울',
      at: Date.now(),
      source: 'test',
    })
    expect(s.weatherLine).toContain('맑음')
    expect(s.todos).toEqual(expect.arrayContaining(['약 먹기', '운동']))
    expect(s.spendToday).toBe(4500)
    expect(s.nextAlarm).toMatch(/약 먹기/)
  })
})

describe('share kit', () => {
  beforeEach(() => store.clear())

  it('builds app share message and backup qr strategy', () => {
    expect(appShareMessage('https://example.com/jarvis')).toContain('https://example.com/jarvis')
    expect(weatherLabel(0)).toBe('맑음')
    const built = buildBackupQrPayload()
    expect(built.payload.length).toBeGreaterThan(10)
    if (built.kind === 'invite') {
      expect(built.bytes).toBeGreaterThan(QR_SAFE_CHARS)
      expect(built.reason).toMatch(/QR/)
    }
  })
})

describe('weather cache matching', () => {
  it('matches coords within epsilon and place names', () => {
    const snap = {
      tempC: 10,
      code: 0,
      label: '맑음',
      precipProb: null,
      place: '서울',
      at: Date.now(),
      source: 'test',
      lat: 37.5,
      lon: 127.0,
    }
    expect(weatherCoordsMatch(snap, 37.51, 127.01)).toBe(true)
    expect(weatherCoordsMatch(snap, 35.1, 129.0)).toBe(false)
    expect(weatherPlaceMatches('서울', '')).toBe(true)
    expect(weatherPlaceMatches('서울', '서울')).toBe(true)
    expect(weatherPlaceMatches('서울', '부산')).toBe(false)
  })
})
