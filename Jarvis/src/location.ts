/** Device location helpers — stored only on this device (localStorage). */

export type GeoFix = {
  lat: number
  lon: number
  accuracy: number
  at: number
}

export type GeoPermission = 'unknown' | 'granted' | 'denied' | 'unavailable'

const CACHE_KEY = 'jarvis.geo.last.v1'
const GRANTED_KEY = 'jarvis.geo.granted.v1'

export function loadCachedFix(): GeoFix | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GeoFix
  } catch {
    return null
  }
}

export function saveCachedFix(fix: GeoFix): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(fix))
  localStorage.setItem(GRANTED_KEY, '1')
}

export function wasLocationGranted(): boolean {
  return localStorage.getItem(GRANTED_KEY) === '1'
}

export function clearLocationGrant(): void {
  localStorage.removeItem(GRANTED_KEY)
}

export function canUseGeolocation(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
}

export async function queryPermissionState(): Promise<GeoPermission> {
  if (!canUseGeolocation()) return 'unavailable'
  try {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms?.query) return 'unknown'
    const status = await perms.query({ name: 'geolocation' as PermissionName })
    if (status.state === 'granted') return 'granted'
    if (status.state === 'denied') return 'denied'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function requestLocation(timeoutMs = 20000): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!canUseGeolocation()) {
      reject(new Error('이 기기는 위치 서비스를 지원하지 않습니다.'))
      return
    }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    // Airplane mode / offline: prefer cache, short GPS budget (no 20s gate stall).
    const budget = offline ? Math.min(timeoutMs, 2500) : timeoutMs
    const cached = loadCachedFix()
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix: GeoFix = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: Date.now(),
        }
        saveCachedFix(fix)
        resolve(fix)
      },
      (err) => {
        if (cached && (offline || err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
          resolve(cached)
          return
        }
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('위치 권한이 거부되었습니다. 설정 → Safari/AIZIO → 위치 → 허용으로 바꿔 주세요.'))
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
        } else {
          reject(new Error('위치를 확인할 수 없습니다. 위치 서비스가 켜져 있는지 확인해 주세요.'))
        }
      },
      {
        enableHighAccuracy: !offline,
        timeout: budget,
        maximumAge: offline ? 86_400_000 : 30_000,
      },
    )
  })
}

/** Major Korea cities — offline fallback when reverse-geocode is slow/unavailable. */
export const KOREA_CITY_COORDS: ReadonlyArray<{ name: string; lat: number; lon: number }> = [
  { name: '서울', lat: 37.5665, lon: 126.978 },
  { name: '부산', lat: 35.1796, lon: 129.0756 },
  { name: '대구', lat: 35.8714, lon: 128.6014 },
  { name: '인천', lat: 37.4563, lon: 126.7052 },
  { name: '광주', lat: 35.1595, lon: 126.8526 },
  { name: '대전', lat: 36.3504, lon: 127.3845 },
  { name: '울산', lat: 35.5384, lon: 129.3114 },
  { name: '제주', lat: 33.4996, lon: 126.5312 },
  { name: '수원', lat: 37.2636, lon: 127.0286 },
  { name: '창원', lat: 35.228, lon: 128.6811 },
  { name: '성남', lat: 37.42, lon: 127.1265 },
  { name: '고양', lat: 37.6584, lon: 126.832 },
  { name: '용인', lat: 37.2411, lon: 127.1776 },
  { name: '청주', lat: 36.6424, lon: 127.489 },
  { name: '전주', lat: 35.8242, lon: 127.148 },
  { name: '포항', lat: 36.019, lon: 129.3435 },
  { name: '천안', lat: 36.8151, lon: 127.1139 },
]

/** 「울산광역시」→「울산」, 「Ulsan」→「울산」 */
export function normalizeKoreaPlaceName(raw: string): string {
  const t = String(raw || '').trim()
  if (!t) return ''
  const compact = t.replace(/\s+/g, '')
  const alias: Record<string, string> = {
    Seoul: '서울',
    Busan: '부산',
    Daegu: '대구',
    Incheon: '인천',
    Gwangju: '광주',
    Daejeon: '대전',
    Ulsan: '울산',
    Jeju: '제주',
    Suwon: '수원',
    Changwon: '창원',
  }
  for (const [en, ko] of Object.entries(alias)) {
    if (compact.toLowerCase().includes(en.toLowerCase())) return ko
  }
  for (const c of KOREA_CITY_COORDS) {
    if (compact.includes(c.name)) return c.name
  }
  return compact
    .replace(/(특별자치시|광역시|특별시|자치시|시|군|구)$/g, '')
    .trim() || t
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(bLat - aLat)
  const dLon = toR(bLon - aLon)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Nearest major Korea city within maxKm (default 90km). */
export function nearestKoreaCity(lat: number, lon: number, maxKm = 90): string | null {
  let best: { name: string; d: number } | null = null
  for (const c of KOREA_CITY_COORDS) {
    const d = haversineKm(lat, lon, c.lat, c.lon)
    if (!best || d < best.d) best = { name: c.name, d }
  }
  return best && best.d <= maxKm ? best.name : null
}

/** Reverse geocode via OpenStreetMap Nominatim (optional, needs network). */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}` +
      `&lon=${encodeURIComponent(String(lon))}&accept-language=ko`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as {
      display_name?: string
      address?: {
        city?: string
        town?: string
        village?: string
        suburb?: string
        county?: string
        state?: string
        province?: string
        country?: string
        country_code?: string
      }
    }
    const a = data.address
    if (a) {
      const raw =
        a.city || a.town || a.county || a.state || a.province || a.village || a.suburb || ''
      const normalized = normalizeKoreaPlaceName(raw || data.display_name || '')
      if (normalized) return normalized
    }
    const fromDisplay = normalizeKoreaPlaceName(data.display_name?.split(',')[0] || '')
    return fromDisplay || null
  } catch {
    return null
  }
}

/**
 * Label for GPS weather/briefing — never falls back to a stale settings city like「서울」.
 * Prefer reverse-geocode, then nearest Korea city, then「현재 위치」.
 */
export async function resolvePlaceLabel(lat: number, lon: number): Promise<string> {
  const near = nearestKoreaCity(lat, lon)
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline) return near || '현재 위치'
  const geo = await reverseGeocode(lat, lon)
  if (geo) {
    const n = normalizeKoreaPlaceName(geo)
    // If geocode is vague but we know a nearby city, prefer the city short name
    if (near && (n.includes(near) || near.includes(n) || n.length > 8)) return near
    return n || near || '현재 위치'
  }
  return near || '현재 위치'
}

export function formatFix(fix: GeoFix, place?: string | null): string {
  const when = new Date(fix.at).toLocaleString('ko-KR')
  const lines = [
    place ? `장소: ${place}` : null,
    `좌표: ${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)}`,
    `정확도: 약 ${Math.round(fix.accuracy)}m`,
    `시각: ${when}`,
    `지도: https://maps.apple.com/?ll=${fix.lat},${fix.lon}&q=${fix.lat},${fix.lon}`,
  ]
  return lines.filter(Boolean).join('\n')
}

export async function getLocationReport(): Promise<string> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  let fix: GeoFix
  try {
    fix = await requestLocation(offline ? 2500 : 12_000)
  } catch (err) {
    const cached = loadCachedFix()
    if (cached) {
      return `${formatFix(cached, null)}\n(저장된 최근 위치 · 실시간 GPS 없음)`
    }
    throw err
  }
  if (offline) {
    return `${formatFix(fix, null)}\n(오프라인 · 주소 검색 생략 · 좌표/지도 링크 제공)`
  }
  const place = await reverseGeocode(fix.lat, fix.lon)
  return formatFix(fix, place)
}
