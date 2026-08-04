import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyNavV2Intent, isPlaceLikeQuery } from './navigationIntent'
import { searchPlaces } from './placeSearchService'
import {
  clearNavV2Context,
  hasActiveNavContext,
  setCandidates,
  selectCandidateByIndex,
} from './navigationContext'
import { calculateRoutes, findOffRoute, nextStepIndex } from './routingService'
import { haversineM } from './geolocationService'
import { maskAddress, redactCoords, accuracyBucket } from './navigationPrivacy'
import { tryHandleNavigationV2 } from './navigationController'
import { clearRecentSearches, loadRecentSearches, navV2DiagSnapshot, pushRecentSearch } from './navigationStorage'

const store = new Map<string, string>()
const session = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => session.get(k) ?? null,
  setItem: (k: string, v: string) => session.set(k, v),
  removeItem: (k: string) => session.delete(k),
  clear: () => session.clear(),
})

describe('nav v2 intent', () => {
  it('treats short place names as search not chat failure', () => {
    expect(classifyNavV2Intent('역삼동').kind).toBe('place_search')
    expect(classifyNavV2Intent('역삼동 주').kind).toBe('place_search')
    expect(classifyNavV2Intent('강남역').kind).toBe('place_search')
    expect(classifyNavV2Intent('울산역').kind).toBe('place_search')
    expect(classifyNavV2Intent('스타벅스').kind).toBe('place_search')
    expect(classifyNavV2Intent('근처 약국').kind).toBe('nearby_search')
    expect(classifyNavV2Intent('주변 주차장').kind).toBe('nearby_search')
    expect(classifyNavV2Intent('역삼동으로 안내해줘').kind).toBe('place_search')
    expect(isPlaceLikeQuery('역삼')).toBe(true)
  })

  it('keeps place trivia as chat', () => {
    expect(classifyNavV2Intent('강남역은 어떤 곳이야').kind).toBe('chat_about_place')
    expect(classifyNavV2Intent('역삼동은 어떤 동네야?').kind).toBe('chat_about_place')
  })

  it('handles context commands', () => {
    expect(classifyNavV2Intent('두 번째', { hasActiveContext: true }).kind).toBe('select_index')
    expect(classifyNavV2Intent('두 번째', { hasActiveContext: true }).index).toBe(2)
    expect(classifyNavV2Intent('첫 번째로 바꿔줘', { hasActiveContext: true }).kind).toBe('select_index')
    expect(classifyNavV2Intent('자동차로', { hasActiveContext: true }).mode).toBe('driving')
    expect(classifyNavV2Intent('걸어서', { hasActiveContext: true }).mode).toBe('walking')
    expect(classifyNavV2Intent('안내 시작', { hasActiveContext: true }).kind).toBe('start_guidance')
    expect(classifyNavV2Intent('안내 종료', { hasActiveContext: true }).kind).toBe('stop_guidance')
  })
})

describe('place search catalog', () => {
  it('returns multiple yeoksam candidates', async () => {
    const r = await searchPlaces('역삼동', {
      origin: { lat: 37.5, lng: 127.03 },
      limit: 8,
    })
    expect(r.ok).toBe(true)
    expect(r.catalogOnly).toBe(true)
    expect(r.candidates.length).toBeGreaterThanOrEqual(3)
    expect(r.candidates.length).toBeLessThanOrEqual(10)
    expect(r.candidates.some((c) => c.name.includes('주민센터'))).toBe(true)
    expect(r.candidates.some((c) => c.name.includes('역'))).toBe(true)
    expect(r.candidates.every((c) => c.address && c.name)).toBe(true)
  })

  it('handles partial 역삼동 주', async () => {
    const r = await searchPlaces('역삼동 주', { limit: 5 })
    expect(r.candidates.some((c) => c.name.includes('주민센터'))).toBe(true)
  })

  it('nearby pharmacy sorted by distance when origin present', async () => {
    const r = await searchPlaces('근처 약국', {
      origin: { lat: 37.5, lng: 127.036 },
      limit: 5,
    })
    expect(r.candidates.length).toBeGreaterThan(0)
    expect(r.candidates[0]?.distanceM).not.toBeNull()
    const dists = r.candidates.map((c) => c.distanceM!).filter((d) => d != null)
    for (let i = 1; i < dists.length; i++) {
      expect(dists[i]!).toBeGreaterThanOrEqual(dists[i - 1]! - 1)
    }
  })

  it('empty query returns empty without inventing places', async () => {
    const r = await searchPlaces('   ', { limit: 5 })
    expect(r.candidates.length).toBe(0)
  })

  it('caches identical searches', async () => {
    const a = await searchPlaces('강남역', { limit: 5 })
    const b = await searchPlaces('강남역', { limit: 5 })
    expect(a.candidates.map((c) => c.id)).toEqual(b.candidates.map((c) => c.id))
  })
})

describe('context select', () => {
  beforeEach(() => {
    clearNavV2Context()
    store.clear()
    session.clear()
  })

  it('selects second candidate then first change', async () => {
    const r = await searchPlaces('역삼동', { limit: 5 })
    setCandidates('역삼동', r.candidates, null)
    expect(hasActiveNavContext()).toBe(true)
    const second = selectCandidateByIndex(2)
    expect(second?.id).toBe(r.candidates[1]?.id)
    const first = selectCandidateByIndex(1)
    expect(first?.id).toBe(r.candidates[0]?.id)
  })

  it('controller handles second after search', async () => {
    const search = await tryHandleNavigationV2('역삼동')
    expect(search?.handled).toBe(true)
    expect(search?.candidates?.length).toBeGreaterThanOrEqual(3)
    expect(search?.text).not.toMatch(/AI가 연결되지 않았습니다/)
    const pick = await tryHandleNavigationV2('두 번째')
    expect(pick?.handled).toBe(true)
    expect(pick?.text).toMatch(/선택/)
  })
})

describe('routing fallback', () => {
  it('returns approximate route when network unavailable', async () => {
    const origin = { lat: 37.5, lng: 127.03 }
    const dest = { lat: 37.51, lng: 127.04 }
    expect(haversineM(origin, dest)).toBeGreaterThan(100)
    const r = await calculateRoutes(origin, dest, 'driving')
    expect(r.routes.length).toBeGreaterThan(0)
    expect(r.routes[0]?.geometry.length).toBeGreaterThan(2)
  })

  it('supports walking and cycling modes', async () => {
    const origin = { lat: 37.5, lng: 127.03 }
    const dest = { lat: 37.505, lng: 127.035 }
    const walk = await calculateRoutes(origin, dest, 'walking')
    const bike = await calculateRoutes(origin, dest, 'cycling')
    expect(walk.routes[0]).toBeTruthy()
    expect(bike.routes[0]).toBeTruthy()
  })

  it('detects off-route and advances step index', async () => {
    const origin = { lat: 37.5, lng: 127.03 }
    const dest = { lat: 37.51, lng: 127.04 }
    const r = await calculateRoutes(origin, dest, 'driving')
    const route = r.routes[0]!
    expect(findOffRoute({ lat: 37.6, lng: 127.2 }, route)).toBe(true)
    expect(nextStepIndex(origin, route, 0)).toBeGreaterThanOrEqual(0)
  })
})

describe('privacy', () => {
  it('masks address and redacts coords', () => {
    expect(maskAddress('서울 강남구 역삼로 123')).toMatch(/···/)
    expect(redactCoords({ lat: 37.5, lng: 127.0 })).toBeNull()
    expect(accuracyBucket(10)).toBe('high')
    expect(accuracyBucket(100)).toBe('low')
  })

  it('diag snapshot has no coordinates', () => {
    pushRecentSearch('역삼동')
    const snap = JSON.stringify(navV2DiagSnapshot())
    expect(snap).not.toMatch(/37\.\d{4,}/)
    expect(snap).toContain('recentCount')
    clearRecentSearches()
    expect(loadRecentSearches().length).toBe(0)
  })
})

describe('escape / injection', () => {
  it('does not treat html in query as executable (search returns safe names)', async () => {
    const r = await searchPlaces('<script>alert(1)</script>', { limit: 3 })
    expect(r.candidates.every((c) => !c.name.includes('<script>'))).toBe(true)
  })
})
