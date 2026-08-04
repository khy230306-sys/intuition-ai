import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseNavigationIntent, wantsNavigation } from './navigationParser'
import { buildMapLinks, isSafeMapUrl, resolveEffectiveProvider } from './navigationUrlBuilder'
import {
  clearNavSession,
  loadNavigationSettings,
  navigationDiagSnapshot,
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
  })

  it('does not treat casual talk as navigation', () => {
    expect(wantsNavigation('회사 이야기해 줘')).toBe(false)
    expect(wantsNavigation('집 이야기 해봐')).toBe(false)
    expect(wantsNavigation('오늘 날씨 알려줘')).toBe(false)
  })

  it('extracts destination, mode, map', () => {
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

describe('map URLs', () => {
  it('builds apple/google/kakao/naver safely', () => {
    const apple = buildMapLinks({
      query: '울산역',
      travelMode: 'driving',
      preferredMap: 'apple',
    })
    expect(apple.webUrl).toContain('maps.apple.com')
    expect(isSafeMapUrl(apple.webUrl)).toBe(true)

    const google = buildMapLinks({
      query: '서울역',
      travelMode: 'transit',
      preferredMap: 'google',
    })
    expect(google.webUrl).toContain('google.com/maps')
    expect(google.webUrl).toContain('transit')

    const kakao = buildMapLinks({ query: '약국', travelMode: 'unspecified', preferredMap: 'kakao', nearby: true })
    expect(kakao.webUrl).toContain('map.kakao.com')
    expect(isSafeMapUrl(kakao.appUrl || '')).toBe(true)

    const naver = buildMapLinks({ query: '부산역', travelMode: 'walking', preferredMap: 'naver' })
    expect(naver.webUrl).toContain('map.naver.com')
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

  it('auto provider by UA', () => {
    expect(resolveEffectiveProvider('system', 'iPhone')).toBe('apple')
    expect(resolveEffectiveProvider('system', 'Android')).toBe('google')
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

  it('stores map/travel prefs and home/work without leaking to diag', () => {
    updateNavigationSettings({ defaultMap: 'kakao', defaultTravelMode: 'walking' })
    setSavedPlace('home', { addressText: '울산광역시 남구 테스트로 1' })
    setSavedPlace('work', { addressText: '서울특별시 중구 세종대로 1' })
    const s = loadNavigationSettings()
    expect(s.defaultMap).toBe('kakao')
    expect(s.home?.addressText).toContain('울산')
    const diag = JSON.stringify(navigationDiagSnapshot())
    expect(diag).not.toContain('울산광역시')
    expect(diag).not.toContain('세종대로')
    expect(navigationDiagSnapshot().hasHome).toBe(true)
    clearNavSession()
  })
})
