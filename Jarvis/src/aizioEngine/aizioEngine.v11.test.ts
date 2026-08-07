/**
 * Core Engine V1.1 — Context / ToolResult / Verifier / Permission
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetActionAgentForTests } from '../actionAgent'
import { endTranslationSession } from '../commandRouter'
import { clearRestaurantSession } from '../restaurantAgent/session'
import { loadReminders } from '../storage'
import { clearTravelSession } from '../travelAgent/session'
import { clearInterpretMode } from '../translateBrain'
import {
  checkPermission,
  classifyEngineTurn,
  clearEngineSession,
  containsForbiddenSuccessClaim,
  extractDateTimeHints,
  loadEngineSession,
  makeToolResult,
  resetEngineSessionForTests,
  resetProviderRegistryForTests,
  resolveContextRef,
  runAizioEngineTurn,
  setAllowTestDoublesForTests,
  setPlacesProviderForTests,
  testPlacesProvider,
  verifyCalendarWrite,
  verifyPlacesResult,
  verifyWeatherResult,
} from './index'
import { ensureEngineSession } from './session'
import { emptyContext } from './context'

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

function mockOpenMeteo() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('daily=') || url.includes('current=')) {
        const today = new Date()
        const d0 = today.toISOString().slice(0, 10)
        const d1 = new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
        const d2 = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10)
        if (url.includes('current=')) {
          return {
            ok: true,
            json: async () => ({
              current: { temperature_2m: 23, weather_code: 1, precipitation_probability: 10 },
            }),
          } as Response
        }
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
      return { ok: true, json: async () => ({ features: [] }) } as Response
    }),
  )
}

describe('Core Engine V1.1 context + verify + permission', () => {
  beforeEach(() => {
    store.clear()
    resetEngineSessionForTests()
    resetProviderRegistryForTests()
    resetActionAgentForTests()
    clearTravelSession()
    clearRestaurantSession()
    clearInterpretMode()
    endTranslationSession()
    mockOpenMeteo()
    setAllowTestDoublesForTests(true)
    setPlacesProviderForTests(testPlacesProvider)
  })

  it('4-turn goal flow with 일정에 넣어줘', async () => {
    const w = await runAizioEngineTurn('내일 울산 비 와?')
    expect(w?.text).toMatch(/울산|강수|비/)
    expect(loadEngineSession()?.context.weather?.city).toBe('울산')
    expect(loadEngineSession()?.context.goal).toBe('outings_plan')

    const p = await runAizioEngineTurn('비 안 오면 아이들이랑 갈 만한 곳 찾아줘')
    expect(p?.text).toMatch(/1\./)
    expect(p?.text).not.toMatch(/【DEMO 맛집/)
    expect(loadEngineSession()?.context.places.length).toBeGreaterThanOrEqual(2)

    const s = await runAizioEngineTurn('두 번째가 괜찮네')
    expect(s?.text).toMatch(/선택/)
    expect(loadEngineSession()?.context.selected?.rank).toBe(2)

    const c = await runAizioEngineTurn('토요일 오후 2시 일정에 넣어줘')
    expect(c?.text).toMatch(/AIZIO 내부 일정에 저장했습니다/)
    expect(c?.text).not.toMatch(/예약했습니다|Google Calendar에 등록했습니다/)
    expect(loadEngineSession()?.lastVerified?.calendar).toBe(true)
    const title = loadEngineSession()!.context.selected!.title
    expect(loadReminders().some((r) => r.text.includes(title))).toBe(true)
  })

  it('resolves 거기 / 아까 두 번째 말한 곳', async () => {
    await runAizioEngineTurn('내일 울산 비 와?')
    await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    const sess = loadEngineSession()!
    const ref2 = resolveContextRef('아까 두 번째 말한 곳', sess.context)
    expect(ref2?.kind).toBe('place_by_rank')
    if (ref2?.kind === 'place_by_rank') expect(ref2.rank).toBe(2)

    await runAizioEngineTurn('두 번째가 괜찮네')
    const there = await runAizioEngineTurn('거기 일정 넣어줘')
    // needs datetime if not in utterance — should ask, not fake success
    expect(there?.text).toMatch(/언제|시|토요일|시간/)
    expect(there?.text).not.toMatch(/저장했습니다|완료되었습니다/)

    const withTime = await runAizioEngineTurn('토요일 오후 2시에 거기 일정 넣어줘')
    expect(withTime?.text).toMatch(/AIZIO 내부 일정에 저장했습니다/)
  })

  it('date hints: 내일 / 모레 / 이번 주말 / 다음 주말', () => {
    expect(extractDateTimeHints('내일 갈래').dayHint).toBe('내일')
    expect(extractDateTimeHints('모레 어때').dayHint).toBe('모레')
    expect(extractDateTimeHints('이번 주말').dayHint).toBe('이번주말')
    expect(extractDateTimeHints('다음 주말').dayHint).toBe('다음주말')
  })

  it('no candidates → 두 번째 does not invent selection', async () => {
    await runAizioEngineTurn('내일 울산 비 와?')
    const r = await runAizioEngineTurn('두 번째')
    expect(r?.text).toMatch(/후보가 없|먼저/)
    expect(loadEngineSession()?.context.selected).toBeFalsy()
  })

  it('session clear drops previous refs', async () => {
    await runAizioEngineTurn('내일 울산 비 와?')
    await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    await runAizioEngineTurn('두 번째가 괜찮네')
    clearEngineSession()
    expect(loadEngineSession()).toBeNull()
    const r = await runAizioEngineTurn('거기 일정 넣어줘')
    expect(r).toBeNull()
  })

  it('verifier rejects empty weather / places; calendar re-read', async () => {
    const badW = verifyWeatherResult(
      makeToolResult({
        toolId: 'weather.forecast',
        success: true,
        data: null as never,
        source: 'x',
        sourceType: 'live_api',
        isRealData: true,
      }),
    )
    expect(badW.ok).toBe(false)
    expect(badW.result.isRealData).toBe(false)

    const badP = verifyPlacesResult(
      makeToolResult({
        toolId: 'places.family_seek',
        success: true,
        data: { candidates: [], query: 'q' },
        source: 'curated',
        sourceType: 'curated',
        isRealData: false,
      }),
    )
    expect(badP.ok).toBe(false)

    // calendar: success flag but missing in store
    const cal = await verifyCalendarWrite(
      makeToolResult({
        toolId: 'calendar.local_write',
        success: true,
        data: {
          title: 'Ghost',
          whenAt: Date.now() + 86400000,
          whenLabel: '내일',
          reminderId: 'missing-id',
          verified: false,
          calendarKind: 'local',
          provider: 'aizio_local_calendar',
        },
        source: 'localStorage',
        sourceType: 'local_store',
        isRealData: true,
      }),
    )
    expect(cal.ok).toBe(false)
    expect(cal.userMessage).not.toMatch(/저장했습니다/)
  })

  it('curated places rejected (not shown as REAL or as user list)', () => {
    const curated = verifyPlacesResult(
      makeToolResult({
        toolId: 'places.family_seek',
        success: true,
        data: {
          candidates: [
            {
              rank: 1,
              id: 'a',
              title: '울산대공원',
              mapsQuery: '울산대공원',
              source: 'curated',
            },
          ],
          query: '울산',
        },
        source: 'curated-family',
        sourceType: 'curated',
        isRealData: false,
      }),
    )
    expect(curated.ok).toBe(false)
    expect(curated.result.isRealData).toBe(false)
  })

  it('permission: L0/L1 allowed; L2/L3 not executable', () => {
    expect(checkPermission('weather.read').allowed).toBe(true)
    expect(checkPermission('calendar.local_write').allowed).toBe(true)
    const ext = checkPermission('calendar.external_write')
    expect(ext.allowed).toBe(false)
    if (!ext.allowed) expect(ext.status).toBe('pending_external_setup')
    const pay = checkPermission('payment')
    expect(pay.allowed).toBe(false)
  })

  it('duplicate weather request short-circuits', async () => {
    const a = await runAizioEngineTurn('내일 울산 비 와?')
    const b = await runAizioEngineTurn('내일 울산 비 와?')
    expect(b?.text).toMatch(/방금 조회|울산/)
    expect(a?.text).toBeTruthy()
  })

  it('forbidden success claims detector', () => {
    expect(containsForbiddenSuccessClaim('저장했습니다')).toBe(true)
    expect(containsForbiddenSuccessClaim('AIZIO 내부 일정에 저장했습니다')).toBe(false)
    expect(containsForbiddenSuccessClaim('로컬 일정에 저장했고 목록에서 확인했습니다')).toBe(false)
  })

  it('classify uses context for 그거 일정', () => {
    ensureEngineSession({
      context: {
        ...emptyContext(),
        places: [
          { rank: 1, id: '1', title: 'A', mapsQuery: 'A', source: 'curated' },
          { rank: 2, id: '2', title: 'B', mapsQuery: 'B', source: 'curated' },
        ],
        selected: { rank: 2, id: '2', title: 'B', mapsQuery: 'B', source: 'curated' },
        goal: 'outings_plan',
      },
      places: [
        { rank: 1, id: '1', title: 'A', mapsQuery: 'A', source: 'curated' },
        { rank: 2, id: '2', title: 'B', mapsQuery: 'B', source: 'curated' },
      ],
      selected: { rank: 2, id: '2', title: 'B', mapsQuery: 'B', source: 'curated' },
    })
    const sess = loadEngineSession()
    expect(classifyEngineTurn('거기 일정 넣어줘', sess)).toBe('calendar_write')
  })
})
