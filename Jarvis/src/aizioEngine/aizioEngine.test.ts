/**
 * Core Engine V1 — 4-turn success criteria.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { clearInterpretMode } from '../translateBrain'
import { endTranslationSession } from '../commandRouter'
import { resetActionAgentForTests } from '../actionAgent'
import { clearTravelSession } from '../travelAgent/session'
import { clearRestaurantSession } from '../restaurantAgent/session'
import { loadReminders } from '../storage'
import { routeCommand } from '../commandRouter'
import {
  classifyEngineTurn,
  extractEngineCity,
  loadEngineSession,
  resetEngineSessionForTests,
  runAizioEngineTurn,
} from './index'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })
vi.stubGlobal('crypto', { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` })
vi.stubGlobal('Notification', {
  permission: 'granted',
  requestPermission: async () => 'granted',
})

function mockOpenMeteoDaily() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('daily=')) {
        const today = new Date()
        const d0 = today.toISOString().slice(0, 10)
        const d1 = new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
        const d2 = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10)
        return {
          ok: true,
          json: async () => ({
            daily: {
              time: [d0, d1, d2],
              weather_code: [1, 1, 61],
              precipitation_probability_max: [10, 15, 70],
              temperature_2m_max: [24, 25, 22],
            },
          }),
        } as Response
      }
      if (url.includes('current=')) {
        return {
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 23,
              weather_code: 1,
              precipitation_probability: 10,
            },
          }),
        } as Response
      }
      // Photon etc. — empty so curated path is used
      return { ok: true, json: async () => ({ features: [] }) } as Response
    }),
  )
}

describe('AIZIO Core Engine V1', () => {
  beforeEach(() => {
    store.clear()
    resetEngineSessionForTests()
    resetActionAgentForTests()
    clearTravelSession()
    clearRestaurantSession()
    clearInterpretMode()
    endTranslationSession()
    mockOpenMeteoDaily()
  })

  it('detects city and weather turn', () => {
    expect(extractEngineCity('내일 울산 비 와?')).toBe('울산')
    expect(classifyEngineTurn('내일 울산 비 와?', null)).toBe('weather')
    expect(routeCommand({ text: '내일 울산 비 와?' }).intent).toBe('weather.query')
  })

  it('4-turn success: weather → places → select → calendar', async () => {
    const w = await runAizioEngineTurn('내일 울산 비 와?')
    expect(w?.text).toMatch(/울산|강수|비/)
    expect(w?.text).toMatch(/open-meteo|날씨/i)
    expect(loadEngineSession()?.weather?.city).toBe('울산')
    expect(loadEngineSession()?.lastVerified?.weather).toBe(true)

    const p = await runAizioEngineTurn('비 안 오면 아이들이랑 갈 만한 곳 찾아줘.')
    expect(p?.text).toMatch(/1\.\s*.+/)
    expect(p?.text).toMatch(/2\./)
    expect(p?.text).not.toMatch(/【DEMO 맛집/)
    expect(loadEngineSession()?.places.length).toBeGreaterThanOrEqual(2)

    const s = await runAizioEngineTurn('두 번째가 괜찮네.')
    expect(s?.text).toMatch(/선택/)
    expect(loadEngineSession()?.selected?.rank).toBe(2)

    const c = await runAizioEngineTurn('토요일 오후 2시에 일정 잡아줘.')
    expect(c?.text).toMatch(/일정|저장/)
    expect(loadEngineSession()?.lastVerified?.calendar).toBe(true)
    const reminders = loadReminders()
    expect(reminders.some((r) => r.text.includes(loadEngineSession()!.selected!.title))).toBe(true)
  })

  it('think() path owns the 4-turn loop', async () => {
    const w = await think('내일 울산 비 와?')
    expect(w.text).toMatch(/울산|강수|비|날씨/)

    const p = await think('비 안 오면 아이들이랑 갈 만한 곳 찾아줘.')
    expect(p.text).toMatch(/1\./)
    expect(p.text).not.toMatch(/【DEMO 맛집/)

    const s = await think('두 번째가 괜찮네.')
    expect(s.text).toMatch(/선택|두 번째|2/)

    const c = await think('토요일 오후 2시에 일정 잡아줘.')
    expect(c.text).toMatch(/일정|저장/)
    expect(loadReminders().length).toBeGreaterThan(0)
  })
})
