/**
 * Build safe map app/web URLs. Only allowlisted schemes/hosts.
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
]

const ALLOWED_SCHEMES = new Set([
  'https:',
  'http:',
  'maps:',
  'comgooglemaps:',
  'kakaomap:',
  'nmap:',
])

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
    // Custom schemes — no host validation beyond scheme allowlist
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
  // d=dir, dirflg: d drive, w walk, r transit
  if (mode === 'walking') return 'w'
  if (mode === 'transit') return 'r'
  return 'd'
}

function sanitizeQuery(q: string): string {
  return String(q || '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 200)
}

export function resolveEffectiveProvider(
  preferred: MapProviderId,
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): MapProviderId {
  if (preferred !== 'system') return preferred
  if (/iPhone|iPad|iPod/i.test(ua)) return 'apple'
  if (/Android/i.test(ua)) return 'google'
  return 'google'
}

export function buildMapLinks(input: {
  query: string
  travelMode: TravelMode
  preferredMap: MapProviderId
  nearby?: boolean
  origin?: { lat: number; lng: number } | null
  userAgent?: string
}): BuiltMapLinks {
  const q = sanitizeQuery(input.query)
  if (!q) {
    return {
      provider: 'google',
      label: 'Google 지도',
      appUrl: null,
      webUrl: 'https://www.google.com/maps',
      querySummary: '',
    }
  }
  const provider = resolveEffectiveProvider(input.preferredMap, input.userAgent)
  const enc = encodeURIComponent(q)
  const mode = googleTravel(input.travelMode)

  if (provider === 'apple') {
    const dirflg = appleDirFlg(input.travelMode)
    const web =
      input.nearby || input.travelMode === 'unspecified'
        ? `https://maps.apple.com/?q=${enc}`
        : `https://maps.apple.com/?daddr=${enc}&dirflg=${dirflg}`
    const app = input.nearby
      ? `maps://?q=${enc}`
      : `maps://?daddr=${enc}&dirflg=${dirflg}`
    return { provider, label: 'Apple 지도', appUrl: app, webUrl: web, querySummary: q }
  }

  if (provider === 'kakao') {
    // Kakao map web search — app scheme may fail without app; always provide web.
    const web = `https://map.kakao.com/?q=${enc}`
    const app = `kakaomap://search?q=${enc}`
    return { provider, label: '카카오맵', appUrl: app, webUrl: web, querySummary: q }
  }

  if (provider === 'naver') {
    const web = `https://map.naver.com/v5/search/${enc}`
    const app = `nmap://search?query=${enc}`
    return { provider, label: '네이버지도', appUrl: app, webUrl: web, querySummary: q }
  }

  // Google (default / Android / desktop)
  let web = `https://www.google.com/maps/search/?api=1&query=${enc}`
  if (!input.nearby && input.travelMode !== 'unspecified') {
    web = `https://www.google.com/maps/dir/?api=1&destination=${enc}&travelmode=${mode}`
    if (input.origin) {
      web += `&origin=${input.origin.lat},${input.origin.lng}`
    }
  }
  const app = `comgooglemaps://?q=${enc}&directionsmode=${mode}`
  return { provider: 'google', label: 'Google 지도', appUrl: app, webUrl: web, querySummary: q }
}

export function buildMapTestSearchUrl(provider: MapProviderId): BuiltMapLinks {
  return buildMapLinks({
    query: '서울역',
    travelMode: 'unspecified',
    preferredMap: provider === 'system' ? 'system' : provider,
    nearby: true,
  })
}
