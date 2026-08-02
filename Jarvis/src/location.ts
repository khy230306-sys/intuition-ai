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
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
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
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('위치 권한이 거부되었습니다. 설정 → Safari/JARVIS → 위치 → 허용으로 바꿔 주세요.'))
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
        } else {
          reject(new Error('위치를 확인할 수 없습니다. 위치 서비스가 켜져 있는지 확인해 주세요.'))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30_000,
      },
    )
  })
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
      address?: { city?: string; town?: string; village?: string; suburb?: string; country?: string }
    }
    const a = data.address
    if (a) {
      const place = a.city || a.town || a.village || a.suburb
      if (place && a.country) return `${place}, ${a.country}`
      if (place) return place
    }
    return data.display_name?.split(',').slice(0, 3).join(',').trim() || null
  } catch {
    return null
  }
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
  const fix = await requestLocation()
  const place = await reverseGeocode(fix.lat, fix.lon)
  return formatFix(fix, place)
}
