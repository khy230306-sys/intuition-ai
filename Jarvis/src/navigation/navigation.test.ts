import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseNavigationIntent, wantsNavigation } from './navigationParser'
import {
  buildAllMapLinks,
  buildMapLinks,
  isSafeMapUrl,
  resolveEffectiveProvider,
} from './navigationUrlBuilder'
import {
  clearNavSession,
  loadNavigationSettings,
  navigationDiagSnapshot,
  removeFavorite,
  setSavedPlace,
  updateNavigationSettings,
} from './navigationStorage'

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

describe('navigation intent', () => {
  it('detects common route commands', () => {
    expect(wantsNavigation('울산역으로 안내해 줘')).toBe(true)
    expect(wantsNavigation('집으로 안내해 줘')).toBe(true)
    expect(wantsNavigation('회사까지 길 찾아줘')).toBe(true)
    expect(wantsNavigation('가까운 약국')).toBe(true)
    expect(wantsNavigation('카카오맵으로 열어줘')).toBe(true)
    expect(wantsNavigation('티맵으로 안내해 줘')).toBe(true)
  })

  it('does not treat casual talk as navigation', () => {
    expect(wantsNavigation('회사 이야기해 줘')).toBe(false)
    expect(wantsNavigation('집 이야기 해봐')).toBe(false)
    expect(wantsNavigation('오늘 날씨 알려줘')).toBe(false)
  })

  it('extracts destination, mode, map including tmap', () => {
    const a = parseNavigationIntent('울산역까지 자동차로 안내해 줘')
    expect(a?.destinationText).toMatch(/울산역/)
    expect(a?.travelMode).toBe('driving')
    expect(a?.intent).toBe('navigation.open_route')

    const b = parseNavigationIntent('걸어서 서울역으로 가자')
    expect(b?.travelMode).toBe('walking')

    const c = parseNavigationIntent('부산역까지 대중교통 길 찾아줘')
    expect(c?.travelMode).toBe('transit')

    const d = parseNavigationIntent('카카오맵으로 열어줘')
    expect(d?.preferredMap).toBe('kakao')

    const t = parseNavigationIntent('사천백천사 T맵으로 안내해 줘')
    expect(t?.preferredMap).toBe('tmap')
    expect(t?.destinationText).toMatch(/사천백천사/)

    const e = parseNavigationIntent('가까운 약국 찾아줘')
    expect(e?.intent).toBe('navigation.search_nearby')
    expect(e?.categoryKey).toBe('pharmacy')
  })

  it('saved place home/work and missing destination', () => {
    expect(parseNavigationIntent('집으로 안내해 줘')?.savedPlaceId).toBe('home')
    expect(parseNavigationIntent('회사로 안내해 줘')?.savedPlaceId).toBe('work')
    const miss = parseNavigationIntent('안내해 줘')
    expect(miss?.missingFields).toContain('destinationText')
  })
})

describe('map URLs korea-first', () => {
  it('builds kakao/tmap/naver/apple/google safely', () => {
    const kakao = buildMapLinks({
      query: '사천백천사',
      travelMode: 'driving',
      preferredMap: 'kakao',
    })
    expect(kakao.webUrl).toContain('map.kakao.com/link/to/')
    expect(kakao.appUrl).toMatch(/^kakaomap:/)
    expect(isSafeMapUrl(kakao.webUrl)).toBe(true)
    expect(isSafeMapUrl(kakao.appUrl || '')).toBe(true)

    const tmap = buildMapLinks({
      query: '울산역',
      travelMode: 'driving',
      preferredMap: 'tmap',
    })
    expect(tmap.appUrl).toMatch(/^tmap:/)
    expect(tmap.label).toBe('T맵')
    expect(isSafeMapUrl(tmap.appUrl || '')).toBe(true)
    expect(isSafeMapUrl(tmap.webUrl)).toBe(true)

    const naver = buildMapLinks({ query: '부산역', travelMode: 'walking', preferredMap: 'naver' })
    expect(naver.webUrl).toContain('map.naver.com')
    expect(naver.appUrl).toMatch(/^nmap:/)

    const apple = buildMapLinks({
      query: '울산역',
      travelMode: 'driving',
      preferredMap: 'apple',
    })
    expect(apple.webUrl).toContain('maps.apple.com')

    const google = buildMapLinks({
      query: '서울역',
      travelMode: 'transit',
      preferredMap: 'google',
    })
    expect(google.webUrl).toContain('google.com/maps')
    expect(google.webUrl).toContain('transit')
  })

  it('builds all chooser providers', () => {
    const all = buildAllMapLinks({ query: '울산역', travelMode: 'driving' })
    expect(all.map((x) => x.provider)).toEqual(['kakao', 'tmap', 'naver', 'apple', 'google'])
  })

  it('encodes destination and rejects bad schemes', () => {
    const links = buildMapLinks({
      query: 'A & B <script>',
      travelMode: 'driving',
      preferredMap: 'google',
    })
    expect(links.webUrl).toContain(encodeURIComponent('A & B <script>'))
    expect(isSafeMapUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeMapUrl('data:text/html,hi')).toBe(false)
    expect(isSafeMapUrl('https://evil.example/maps')).toBe(false)
  })

  it('auto provider prefers kakao for Korean locale', () => {
    expect(resolveEffectiveProvider('system', 'iPhone', { language: 'ko-KR' })).toBe('kakao')
    expect(resolveEffectiveProvider('system', 'Android', { language: 'ko' })).toBe('kakao')
    expect(resolveEffectiveProvider('system', 'iPhone', { language: 'en-US' })).toBe('apple')
    expect(resolveEffectiveProvider('system', 'Android', { language: 'en-US' })).toBe('google')
    expect(resolveEffectiveProvider('tmap', 'iPhone', { language: 'en' })).toBe('tmap')
  })

  it('blocks empty destination build misuse via sanitize', () => {
    const empty = buildMapLinks({ query: '', travelMode: 'driving', preferredMap: 'google' })
    expect(empty.querySummary).toBe('')
  })
})

describe('navigation storage', () => {
  beforeEach(() => {
    store.clear()
    session.clear()
  })

  it('defaults to kakao / driving for new users', () => {
    const s = loadNavigationSettings()
    expect(s.defaultMap).toBe('kakao')
    expect(s.defaultTravelMode).toBe('driving')
  })

  it('stores map/travel prefs and home/work without leaking to diag', () => {
    updateNavigationSettings({ defaultMap: 'tmap', defaultTravelMode: 'walking' })
    setSavedPlace('home', { addressText: '울산광역시 남구 테스트로 1' })
    setSavedPlace('work', { addressText: '서울특별시 중구 세종대로 1' })
    const s = loadNavigationSettings()
    expect(s.defaultMap).toBe('tmap')
    expect(s.home?.addressText).toContain('울산')
    const diag = JSON.stringify(navigationDiagSnapshot())
    expect(diag).not.toContain('울산광역시')
    expect(diag).not.toContain('세종대로')
    expect(navigationDiagSnapshot().hasHome).toBe(true)
    clearNavSession()
  })

  it('adds and removes favorites without address in diag', () => {
    setSavedPlace('favorite', { label: '헬스장', addressText: '울산광역시 북구 비밀로 9' })
    const s = loadNavigationSettings()
    expect(s.favorites).toHaveLength(1)
    expect(s.favorites[0]?.label).toBe('헬스장')
    const diag = JSON.stringify(navigationDiagSnapshot())
    expect(diag).not.toContain('비밀로')
    expect(navigationDiagSnapshot().favoriteCount).toBe(1)
    removeFavorite(s.favorites[0]!.id)
    expect(loadNavigationSettings().favorites).toHaveLength(0)
  })
})
