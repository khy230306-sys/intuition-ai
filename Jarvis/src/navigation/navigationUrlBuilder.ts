/**
 * Build safe map app/web URLs for Korea-first navigation handoff.
 * AIZIO does not run turn-by-turn — it opens Kakao / TMAP / Naver / Apple / Google.
 */

import type { BuiltMapLinks, MapProviderId, TravelMode } from './navigationTypes'

const ALLOWED_WEB_HOSTS = [
  'maps.apple.com',
  'maps.google.com',
  'www.google.com',
  'www.google.co.kr',
  'map.kakao.com',
  'm.map.kakao.com',
  'map.naver.com',
  'm.map.naver.com',
  'www.tmap.co.kr',
  'tmap.co.kr',
  'apps.apple.com',
  'play.google.com',
]

const ALLOWED_SCHEMES = new Set([
  'https:',
  'http:',
  'maps:',
  'comgooglemaps:',
  'kakaomap:',
  'nmap:',
  'tmap:',
  'tmapx:',
])

export const MAP_PROVIDER_LABELS: Record<Exclude<MapProviderId, 'system'>, string> = {
  kakao: '카카오맵',
  tmap: 'T맵',
  naver: '네이버지도',
  apple: 'Apple 지도',
  google: 'Google 지도',
}

/** Korea-first order for chooser UI */
export const MAP_CHOOSER_ORDER: Array<Exclude<MapProviderId, 'system'>> = [
  'kakao',
  'tmap',
  'naver',
  'apple',
  'google',
]

export function isSafeMapUrl(url: string): boolean {
  try {
    if (!url || /[\u0000-\u001f]/.test(url)) return false
    if (/^\s*javascript:/i.test(url) || /^\s*data:/i.test(url) || /^\s*vbscript:/i.test(url)) {
      return false
    }
    const u = new URL(url)
    if (!ALLOWED_SCHEMES.has(u.protocol)) return false
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      const host = u.hostname.toLowerCase()
      return ALLOWED_WEB_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
    }
    return true
  } catch {
    return false
  }
}

function googleTravel(mode: TravelMode): string {
  if (mode === 'walking') return 'walking'
  if (mode === 'transit') return 'transit'
  if (mode === 'bicycling') return 'bicycling'
  if (mode === 'driving') return 'driving'
  return 'driving'
}

function appleDirFlg(mode: TravelMode): string {
  if (mode === 'walking') return 'w'
  if (mode === 'transit') return 'r'
  return 'd'
}

/** Kakao route by= */
function kakaoBy(mode: TravelMode): string {
  if (mode === 'walking') return 'FOOT'
  if (mode === 'transit') return 'PUBLICTRANSIT'
  return 'CAR'
}

function sanitizeQuery(q: string): string {
  return String(q || '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

function isKoreanLocale(
  lang = typeof navigator !== 'undefined' ? navigator.language || '' : '',
  timeZone = '',
): boolean {
  const l = lang.toLowerCase()
  if (l.startsWith('ko')) return true
  try {
    const tz =
      timeZone ||
      (typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        : '')
    if (/Seoul|Korea/i.test(tz)) return true
  } catch {
    /* ignore */
  }
  return false
}

/**
 * Auto map policy (강화):
 * - 한국어/한국 시간대 → 카카오맵 (한국 장소명에 강함)
 * - 그 외 iPhone → Apple
 * - 그 외 Android/desktop → Google
 */
export function resolveEffectiveProvider(
  preferred: MapProviderId,
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  opts?: { language?: string; timeZone?: string },
): Exclude<MapProviderId, 'system'> {
  if (preferred !== 'system') return preferred
  if (isKoreanLocale(opts?.language, opts?.timeZone)) return 'kakao'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'apple'
  return 'google'
}

function buildKakao(q: string, enc: string, mode: TravelMode, nearby: boolean, origin?: { lat: number; lng: number } | null): BuiltMapLinks {
  // Name-based destination links work better for Korean POIs than Apple q=
  const web = nearby
    ? `https://map.kakao.com/link/search/${enc}`
    : `https://map.kakao.com/link/to/${enc}`
  // Prefer search scheme (reliable). With GPS, use route scheme for turn-by-turn in Kakao app.
  let app = `kakaomap://search?q=${enc}`
  if (!nearby && origin) {
    app = `kakaomap://route?sp=${origin.lat},${origin.lng}&by=${kakaoBy(mode)}&dname=${enc}`
  }
  return {
    provider: 'kakao',
    label: MAP_PROVIDER_LABELS.kakao,
    appUrl: app,
    webUrl: web,
    querySummary: q,
  }
}

function buildTmap(q: string, enc: string, nearby: boolean, origin?: { lat: number; lng: number } | null): BuiltMapLinks {
  // TMAP deep link — name-based when no coordinates
  let app = nearby || !q ? `tmap://search?name=${enc}` : `tmap://route?goalname=${enc}`
  if (!nearby && origin) {
    app = `tmap://route?startname=${encodeURIComponent('현재위치')}&startx=${origin.lng}&starty=${origin.lat}&goalname=${enc}`
  }
  // No public TMAP web directions without API key — Kakao web is the safe Korean fallback.
  const web = nearby ? `https://map.kakao.com/link/search/${enc}` : `https://map.kakao.com/link/to/${enc}`
  return {
    provider: 'tmap',
    label: MAP_PROVIDER_LABELS.tmap,
    appUrl: app,
    webUrl: web,
    querySummary: q,
  }
}

function buildNaver(q: string, enc: string, mode: TravelMode, nearby: boolean): BuiltMapLinks {
  const pathMode =
    mode === 'walking' ? 'walk' : mode === 'transit' ? 'transit' : mode === 'bicycling' ? 'bicycle' : 'car'
  const web = nearby
    ? `https://map.naver.com/v5/search/${enc}`
    : `https://map.naver.com/v5/search/${enc}`
  const routeKind =
    pathMode === 'walk' ? 'walk' : pathMode === 'transit' ? 'public' : 'car'
  const app = nearby
    ? `nmap://search?query=${enc}`
    : `nmap://route/${routeKind}?dname=${enc}&appname=AIZIO`
  return {
    provider: 'naver',
    label: MAP_PROVIDER_LABELS.naver,
    appUrl: app,
    webUrl: web,
    querySummary: q,
  }
}

function buildApple(q: string, enc: string, mode: TravelMode, nearby: boolean): BuiltMapLinks {
  const dirflg = appleDirFlg(mode)
  const web =
    nearby || mode === 'unspecified'
      ? `https://maps.apple.com/?q=${enc}`
      : `https://maps.apple.com/?daddr=${enc}&dirflg=${dirflg}`
  const app = nearby ? `maps://?q=${enc}` : `maps://?daddr=${enc}&dirflg=${dirflg}`
  return { provider: 'apple', label: MAP_PROVIDER_LABELS.apple, appUrl: app, webUrl: web, querySummary: q }
}

function buildGoogle(
  q: string,
  enc: string,
  mode: TravelMode,
  nearby: boolean,
  origin?: { lat: number; lng: number } | null,
): BuiltMapLinks {
  const gMode = googleTravel(mode)
  let web = `https://www.google.com/maps/search/?api=1&query=${enc}`
  if (!nearby && mode !== 'unspecified') {
    web = `https://www.google.com/maps/dir/?api=1&destination=${enc}&travelmode=${gMode}`
    if (origin) web += `&origin=${origin.lat},${origin.lng}`
  } else if (!nearby) {
    web = `https://www.google.com/maps/dir/?api=1&destination=${enc}&travelmode=driving`
  }
  const app = `comgooglemaps://?daddr=${enc}&directionsmode=${gMode}`
  return { provider: 'google', label: MAP_PROVIDER_LABELS.google, appUrl: app, webUrl: web, querySummary: q }
}

export function buildMapLinks(input: {
  query: string
  travelMode: TravelMode
  preferredMap: MapProviderId
  nearby?: boolean
  origin?: { lat: number; lng: number } | null
  userAgent?: string
  language?: string
}): BuiltMapLinks {
  const q = sanitizeQuery(input.query)
  if (!q) {
    return {
      provider: 'kakao',
      label: MAP_PROVIDER_LABELS.kakao,
      appUrl: 'kakaomap://open',
      webUrl: 'https://map.kakao.com/',
      querySummary: '',
    }
  }
  const provider = resolveEffectiveProvider(input.preferredMap, input.userAgent, {
    language: input.language,
  })
  const enc = encodeURIComponent(q)
  const nearby = Boolean(input.nearby)
  const mode = input.travelMode

  if (provider === 'kakao') return buildKakao(q, enc, mode, nearby, input.origin)
  if (provider === 'tmap') return buildTmap(q, enc, nearby, input.origin)
  if (provider === 'naver') return buildNaver(q, enc, mode, nearby)
  if (provider === 'apple') return buildApple(q, enc, mode, nearby)
  return buildGoogle(q, enc, mode, nearby, input.origin)
}

/** Build links for every provider — used by map chooser / “다른 지도”. */
export function buildAllMapLinks(input: {
  query: string
  travelMode: TravelMode
  nearby?: boolean
  origin?: { lat: number; lng: number } | null
}): BuiltMapLinks[] {
  return MAP_CHOOSER_ORDER.map((p) =>
    buildMapLinks({
      ...input,
      preferredMap: p,
    }),
  )
}

export function buildMapTestSearchUrl(provider: MapProviderId): BuiltMapLinks {
  return buildMapLinks({
    query: '서울역',
    travelMode: 'unspecified',
    preferredMap: provider === 'system' ? 'kakao' : provider,
    nearby: true,
  })
}
