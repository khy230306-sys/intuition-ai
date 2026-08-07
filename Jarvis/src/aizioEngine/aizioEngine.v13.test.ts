/**
 * Core Engine V1.3 — Commercial Provider Readiness
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetActionAgentForTests } from '../actionAgent'
import { endTranslationSession } from '../commandRouter'
import { clearRestaurantSession } from '../restaurantAgent/session'
import { clearTravelSession } from '../travelAgent/session'
import { clearInterpretMode } from '../translateBrain'
import {
  assertProviderAllowed,
  GOOGLE_PLACES_CAPABILITIES,
  GOOGLE_TEXT_SEARCH_FIELD_MASK,
  googleCalendarProvider,
  googlePlacesProvider,
  loadEngineSession,
  mapGooglePlacesHttpError,
  normalizeGooglePlace,
  PHOTON_CAPABILITIES,
  resetCostGuardForTests,
  resetEngineSessionForTests,
  resetProviderRegistryForTests,
  resolvePlacesProvider,
  runAizioEngineTurn,
  selectPlacesProvider,
  setAllowTestDoublesForTests,
  setExternalCalendarProviderForTests,
  setPlacesProviderForTests,
  testCalendarProvider,
  testPlacesProvider,
  withDuplicateRequestGuard,
  getPlacesCostTelemetry,
} from './index'
import { familySeekSelectionIntent } from './providers/selection'
import { photonPlacesProvider } from './providers/places/photonPlacesProvider'
import { TestCalendarProvider } from './providers/calendar/testCalendarProvider'
import { formatCalendarPendingExternal, formatCalendarReply } from './tools/calendarTool'

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
      return { ok: false, status: 503, json: async () => ({}), text: async () => '' } as Response
    }),
  )
}

describe('Core Engine V1.3 Commercial Provider Readiness', () => {
  beforeEach(() => {
    store.clear()
    resetEngineSessionForTests()
    resetProviderRegistryForTests()
    resetCostGuardForTests()
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

  it('Google 미연결 → PENDING_EXTERNAL_SETUP', async () => {
    const h = await googlePlacesProvider.healthCheck()
    expect(h.availability).toBe('PENDING_EXTERNAL_SETUP')
    expect(h.liveVerified).toBeFalsy()

    const cal = await googleCalendarProvider.healthCheck()
    expect(cal.availability).toBe('PENDING_EXTERNAL_SETUP')
    expect(googleCalendarProvider.getAuthStatus().status).toBe('pending_setup')
  })

  it('Photon에서 rating/review 생성 금지', async () => {
    resetProviderRegistryForTests()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [129.29, 35.53] },
              properties: {
                name: '울산대공원',
                city: '울산',
                countrycode: 'KR',
                osm_id: 123,
                osm_type: 'W',
              },
            },
          ],
        }),
      })),
    )
    const out = await photonPlacesProvider.searchPlaces({ query: '울산대공원', city: '울산', limit: 3 })
    expect(out.places.length).toBeGreaterThan(0)
    for (const p of out.places) {
      expect(p.rating).toBeUndefined()
      expect(p.reviewCount).toBeUndefined()
      expect(p.photoNames).toBeUndefined()
    }
    expect(PHOTON_CAPABILITIES).not.toContain('RATING')
    expect(PHOTON_CAPABILITIES).not.toContain('REVIEWS')
  })

  it('capability 기반 Provider 선택', async () => {
    expect(GOOGLE_PLACES_CAPABILITIES).toContain('RATING')
    expect(GOOGLE_PLACES_CAPABILITIES).toContain('NEARBY_SEARCH')

    // With test override
    const sel = await selectPlacesProvider(familySeekSelectionIntent())
    expect(sel.provider?.id).toBe('test_places')

    // Without override: Google pending → Photon auxiliary degraded
    resetProviderRegistryForTests()
    const photonSel = await selectPlacesProvider({
      ...familySeekSelectionIntent(),
      allowLiveVerify: false,
    })
    expect(photonSel.provider?.id).toBe('photon')
    expect(photonSel.degraded).toBe(true)
    expect(photonSel.missingCapabilities).toEqual(
      expect.arrayContaining(['RATING', 'REVIEWS', 'PLACE_DETAILS']),
    )
  })

  it('Google REAL fixture normalization', () => {
    const place = normalizeGooglePlace({
      id: 'ChIJ_test_1',
      displayName: { text: '울산대공원' },
      formattedAddress: '울산광역시 남구',
      location: { latitude: 35.53, longitude: 129.29 },
      rating: 4.5,
      userRatingCount: 1200,
      googleMapsUri: 'https://maps.google.com/?cid=1',
      types: ['park'],
      attributions: [{ text: 'Google' }],
    })
    expect(place).toBeTruthy()
    expect(place!.providerPlaceId).toBe('ChIJ_test_1')
    expect(place!.rating).toBe(4.5)
    expect(place!.reviewCount).toBe(1200)
    expect(place!.attributions).toContain('Google')
    expect(place!.rawSourceAvailable).toBe(true)

    const noRating = normalizeGooglePlace({
      id: 'ChIJ_2',
      displayName: { text: '某處' },
      formattedAddress: '서울',
      location: { latitude: 37.5, longitude: 127.0 },
    })
    expect(noRating!.rating).toBeUndefined()
    expect(noRating!.reviewCount).toBeUndefined()
  })

  it('providerPlaceId 없는 Google 결과 REAL 실패', () => {
    const bad = normalizeGooglePlace({
      displayName: { text: '이름만' },
      formattedAddress: '서울',
      location: { latitude: 37.5, longitude: 127.0 },
    })
    expect(bad).toBeNull()
  })

  it('FieldMask 최소 필드 검증', () => {
    expect(GOOGLE_TEXT_SEARCH_FIELD_MASK).toContain('places.id')
    expect(GOOGLE_TEXT_SEARCH_FIELD_MASK).toContain('places.displayName')
    expect(GOOGLE_TEXT_SEARCH_FIELD_MASK).not.toMatch(/reviews\b/i)
    expect(GOOGLE_TEXT_SEARCH_FIELD_MASK).not.toMatch(/places\.photos/)
  })

  it('quota 오류 처리', () => {
    const err = mapGooglePlacesHttpError(429, 'RESOURCE_EXHAUSTED quota')
    expect(err.message).toBe('QUOTA_EXCEEDED')
    expect(getPlacesCostTelemetry().quotaExceeded).toBeGreaterThanOrEqual(1)
  })

  it('duplicate request guard', async () => {
    let releases!: () => void
    const gate = new Promise<void>((r) => {
      releases = r
    })
    const p1 = withDuplicateRequestGuard('dup-key', async () => {
      await gate
      return 1
    })
    await Promise.resolve()
    await expect(withDuplicateRequestGuard('dup-key', async () => 2)).rejects.toThrow(
      /DUPLICATE_REQUEST_IN_FLIGHT/,
    )
    releases()
    await expect(p1).resolves.toBe(1)
  })

  it('Calendar OAuth 미연결 상태', async () => {
    const auth = googleCalendarProvider.getAuthStatus()
    expect(auth.status).toBe('pending_setup')
    expect(auth.clientIdConfigured).toBe(false)
    const authz = await googleCalendarProvider.authorize()
    expect(authz.ok).toBe(false)
    expect(authz.error).toMatch(/PENDING_EXTERNAL_SETUP/)
  })

  it('Calendar create→get 재검증', async () => {
    const cal = new TestCalendarProvider()
    setExternalCalendarProviderForTests(cal)
    await runAizioEngineTurn('내일 울산 비 와?')
    await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    await runAizioEngineTurn('두 번째가 괜찮네')
    const c = await runAizioEngineTurn('토요일 오후 2시 일정에 넣어줘')
    expect(c?.text).toMatch(/외부 캘린더에 등록했습니다/)
    expect(loadEngineSession()?.lastCalendar?.verified).toBe(true)
    expect(loadEngineSession()?.lastCalendar?.calendarKind).toBe('external')
  })

  it('Local/External 문구 구분', () => {
    expect(formatCalendarPendingExternal()).toBe(
      'Google Calendar가 아직 연결되지 않았습니다. AIZIO 내부 일정으로 저장할 수 있습니다.',
    )
    const local = formatCalendarReply(
      {
        title: '공원',
        whenAt: Date.now() + 86400000,
        whenLabel: '토 오후 2시',
        reminderId: 'r1',
        verified: true,
        calendarKind: 'local',
        provider: 'aizio_local_calendar',
      },
      true,
    )
    expect(local).toMatch(/AIZIO 내부 일정에 저장했습니다/)
    expect(local).not.toMatch(/Google Calendar에 등록했습니다/)

    const ext = formatCalendarReply(
      {
        title: '공원',
        whenAt: Date.now() + 86400000,
        whenLabel: '토 오후 2시',
        reminderId: 'e1',
        verified: true,
        calendarKind: 'external',
        provider: 'google_calendar',
        externalEventId: 'e1',
      },
      true,
    )
    expect(ext).toMatch(/Google Calendar에 등록했습니다/)
    expect(ext).not.toMatch(/AIZIO 내부 일정에 저장했습니다/)
  })

  it('fallback 시 missingCapabilities 표시', async () => {
    resetProviderRegistryForTests()
    const sel = await resolvePlacesProvider()
    // No Google key → Photon fallback
    expect(sel.provider?.id).toBe('photon')
    expect(sel.degraded).toBe(true)
    expect(sel.missingCapabilities.length).toBeGreaterThan(0)
    expect(sel.fallbackFrom).toBe('google_places')
  })

  it('Production Test Provider 차단', () => {
    resetProviderRegistryForTests()
    expect(() => assertProviderAllowed(testPlacesProvider)).toThrow(/blocked|Test provider/i)
    expect(() => assertProviderAllowed(testCalendarProvider)).toThrow(/blocked|Test provider/i)
  })

  it('local calendar copy in 4-turn (not Google)', async () => {
    await runAizioEngineTurn('내일 울산 비 와?')
    await runAizioEngineTurn('아이들이랑 갈 만한 곳 찾아줘')
    await runAizioEngineTurn('두 번째가 괜찮네')
    const c = await runAizioEngineTurn('토요일 오후 2시 일정에 넣어줘')
    expect(c?.text).toMatch(/AIZIO 내부 일정에 저장했습니다/)
    expect(c?.text).not.toMatch(/Google Calendar에 등록했습니다/)
  })
})
