/**
 * Core Engine V1.2 — REAL Places / Calendar providers / Registry / Production guards
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { resetActionAgentForTests } from '../actionAgent'
import { endTranslationSession } from '../commandRouter'
import { clearRestaurantSession } from '../restaurantAgent/session'
import { loadReminders } from '../storage'
import { clearTravelSession } from '../travelAgent/session'
import { clearInterpretMode } from '../translateBrain'
import {
  assertProviderAllowed,
  checkPermission,
  containsForbiddenSuccessClaim,
  loadEngineSession,
  makeToolResult,
  resetEngineSessionForTests,
  resetProviderRegistryForTests,
  resolveExternalCalendarProvider,
  resolvePlacesProvider,
  runAizioEngineTurn,
  setAllowTestDoublesForTests,
  setExternalCalendarProviderForTests,
  setPlacesProviderForTests,
  testCalendarProvider,
  testPlacesProvider,
  verifyCalendarWrite,
  verifyPlacesResult,
} from './index'
import { TestPlacesProvider } from './providers/places/testPlacesProvider'
import { TestCalendarProvider } from './providers/calendar/testCalendarProvider'
import { googleCalendarProvider } from './providers/calendar/googleCalendarProvider'
import { googlePlacesProvider } from './providers/places/googlePlacesProvider'

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

function mockOpenMeteoOnly() {
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
      // Places/calendar external — fail closed (no fake places)
      return { ok: false, status: 503, json: async () => ({}) } as Response
    }),
  )
}

describe('Core Engine V1.2 REAL providers', () => {
  beforeEach(() => {
    store.clear()
    resetEngineSessionForTests()
    resetProviderRegistryForTests()
    resetActionAgentForTests()
    clearTravelSession()
    clearRestaurantSession()
    clearInterpretMode()
    endTranslationSession()
    mockOpenMeteoOnly()
    setAllowTestDoublesForTests(true)
    setPlacesProviderForTests(testPlacesProvider)
  })

  afterEach(() => {
    resetProviderRegistryForTests()
  })

  it('REAL Places Provider success (test provider injected)', async () => {
    await runAizioEngineTurn('내일 울산 비 와?')
    const p = await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    expect(p?.text).toMatch(/1\./)
    expect(p?.text).toMatch(/test_places|울산/)
    expect(p?.text).not.toMatch(/가짜 장소/)
    const places = loadEngineSession()?.context.places || []
    expect(places.length).toBeGreaterThanOrEqual(2)
    expect(places[0].providerPlaceId).toBeTruthy()
    expect(places[0].provider).toBe('test_places')
  })

  it('Provider ID 없는 결과 REAL 판정 실패', () => {
    const r = verifyPlacesResult(
      makeToolResult({
        toolId: 'places.family_seek',
        success: true,
        data: {
          candidates: [
            {
              rank: 1,
              id: 'x',
              title: '어딘가',
              mapsQuery: '어딘가',
              source: 'photon',
              providerPlaceId: 'osm/1',
              address: '울산',
              fetchedAt: Date.now(),
              rawSourceAvailable: true,
              // provider missing on candidate — but ToolResult.provider also missing
            },
          ],
          query: 'q',
        },
        source: 'photon',
        sourceType: 'live_api',
        isRealData: true,
        // no provider / providerRequestId
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.result.isRealData).toBe(false)
  })

  it('curated 결과 REAL 판정 실패 (목록도 거부)', () => {
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
          provider: 'curated',
        },
        source: 'curated-family',
        sourceType: 'curated',
        isRealData: true,
        provider: 'curated',
        providerRequestId: 'curated-1',
      }),
    )
    expect(curated.ok).toBe(false)
    expect(curated.result.isRealData).toBe(false)
  })

  it('name+mapsQuery+rank alone never REAL', () => {
    const r = verifyPlacesResult(
      makeToolResult({
        toolId: 'places.family_seek',
        success: true,
        data: {
          candidates: [
            { rank: 1, id: '1', title: '가짜공원', mapsQuery: '가짜공원', source: 'catalog' },
          ],
          query: 'q',
          provider: 'catalog',
        },
        source: 'catalog',
        sourceType: 'catalog',
        isRealData: true,
        provider: 'catalog',
        providerRequestId: 'x',
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.result.isRealData).toBe(false)
  })

  it('Provider 장애 시 가짜 장소 생성 금지', async () => {
    resetProviderRegistryForTests()
    setAllowTestDoublesForTests(true)
    // No places override — mock fetch 503 → Photon fails; Google pending
    const failing = new TestPlacesProvider([])
    // Override search to throw
    failing.searchPlaces = async () => {
      throw new Error('provider_down')
    }
    setPlacesProviderForTests(failing)

    await runAizioEngineTurn('내일 울산 비 와?')
    const p = await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    expect(p?.text).toMatch(/연결해야|실패|없습니다|가짜 장소/)
    expect(p?.text).not.toMatch(/1\.\s*울산대공원/)
    expect(loadEngineSession()?.context.places.length || 0).toBe(0)
  })

  it('local Calendar 저장 문구 정확성', async () => {
    await runAizioEngineTurn('내일 울산 비 와?')
    await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    await runAizioEngineTurn('두 번째가 괜찮네')
    const c = await runAizioEngineTurn('토요일 오후 2시 일정에 넣어줘')
    expect(c?.text).toMatch(/AIZIO 내부 일정에 저장했습니다/)
    expect(c?.text).not.toMatch(/Google Calendar에 등록했습니다/)
    expect(loadReminders().length).toBeGreaterThan(0)
  })

  it('external Calendar 성공 후 재조회 검증', async () => {
    setExternalCalendarProviderForTests(new TestCalendarProvider())
    await runAizioEngineTurn('내일 울산 비 와?')
    await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    await runAizioEngineTurn('두 번째가 괜찮네')
    const c = await runAizioEngineTurn('토요일 오후 2시 일정에 넣어줘')
    expect(c?.text).toMatch(/외부 캘린더에 등록했습니다/)
    expect(c?.text).toMatch(/재조회/)
    expect(loadEngineSession()?.lastCalendar?.calendarKind).toBe('external')
    expect(loadEngineSession()?.lastVerified?.calendar).toBe(true)
  })

  it('OAuth 미연결 시 PENDING_EXTERNAL_SETUP', async () => {
    const health = await googleCalendarProvider.healthCheck()
    expect(health.availability).toBe('PENDING_EXTERNAL_SETUP')
    const ext = await resolveExternalCalendarProvider()
    expect(ext.provider).toBeNull()
    expect(ext.health.availability).toBe('PENDING_EXTERNAL_SETUP')

    const gPlaces = await googlePlacesProvider.healthCheck()
    expect(gPlaces.availability).toBe('PENDING_EXTERNAL_SETUP')

    const perm = checkPermission('calendar.external_write')
    expect(perm.allowed).toBe(false)
    if (!perm.allowed) expect(perm.status).toBe('pending_external_setup')
  })

  it('Production에서 Test Provider 차단', () => {
    resetProviderRegistryForTests()
    // allowTestDoubles=false (default after reset)
    expect(() => assertProviderAllowed(testPlacesProvider)).toThrow(/blocked|Test provider/i)
    expect(() => assertProviderAllowed(testCalendarProvider)).toThrow(/blocked|Test provider/i)
    expect(() => setPlacesProviderForTests(testPlacesProvider)).toThrow(/blocked|Test provider/i)
  })

  it('Context 4턴 회귀', async () => {
    const w = await runAizioEngineTurn('내일 울산 비 와?')
    expect(w?.text).toMatch(/울산|강수|비/)
    const p = await runAizioEngineTurn('비 안 오면 아이들이랑 갈 만한 곳 찾아줘')
    expect(p?.text).toMatch(/1\./)
    const s = await runAizioEngineTurn('두 번째가 괜찮네')
    expect(s?.text).toMatch(/선택/)
    const c = await runAizioEngineTurn('토요일 오후 2시 일정에 넣어줘')
    expect(c?.text).toMatch(/AIZIO 내부 일정에 저장했습니다/)
    expect(loadEngineSession()?.lastVerified?.calendar).toBe(true)
  })

  it('외부 서비스 실패 후 확정 성공 문구 금지', async () => {
    const bad = await verifyCalendarWrite(
      makeToolResult<{
        title: string
        whenAt: number
        whenLabel: string
        reminderId: string
        verified: boolean
        calendarKind: 'local' | 'external'
        provider: string
      }>({
        toolId: 'calendar.external_write',
        success: false,
        status: 'failed',
        data: undefined,
        source: 'google_calendar',
        sourceType: 'live_api',
        isRealData: false,
        errorMessage: '외부 캘린더 재조회 실패',
      }),
    )
    expect(bad.ok).toBe(false)
    expect(bad.userMessage || '').not.toMatch(/등록했습니다|저장했습니다|완료되었습니다/)
    expect(containsForbiddenSuccessClaim(bad.userMessage || '외부 캘린더 재조회 실패')).toBe(false)
  })

  it('REAL places shape with providerPlaceId + geo + fetchedAt', () => {
    const now = Date.now()
    const ok = verifyPlacesResult(
      makeToolResult({
        toolId: 'places.family_seek',
        success: true,
        data: {
          candidates: [
            {
              rank: 1,
              id: 'N/1',
              title: '울산대공원',
              mapsQuery: '울산대공원',
              source: 'photon',
              provider: 'photon',
              providerPlaceId: 'N/123',
              address: '울산광역시 남구',
              latitude: 35.53,
              longitude: 129.29,
              fetchedAt: now,
              rawSourceAvailable: true,
            },
          ],
          query: '울산',
          provider: 'photon',
          providerRequestId: 'photon_abc',
        },
        source: 'photon',
        sourceType: 'live_api',
        isRealData: false,
        provider: 'photon',
        providerRequestId: 'photon_abc',
      }),
    )
    expect(ok.ok).toBe(true)
    expect(ok.result.isRealData).toBe(true)
  })

  it('resolvePlacesProvider uses injected test provider when allowed', async () => {
    const r = await resolvePlacesProvider()
    expect(r.provider?.id).toBe('test_places')
    expect(r.availability).toBe('READY')
  })
})
