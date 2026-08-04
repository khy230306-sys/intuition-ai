import type { GeoFix, LatLng } from './types'

export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'

export async function queryGeoPermission(): Promise<GeoPermission> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported'
  try {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!perms?.query) return 'unknown'
    const r = await perms.query({ name: 'geolocation' as PermissionName })
    if (r.state === 'granted' || r.state === 'denied' || r.state === 'prompt') return r.state
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function accuracyGrade(m: number): 'high' | 'medium' | 'low' | 'none' {
  if (!Number.isFinite(m) || m <= 0) return 'none'
  if (m <= 25) return 'high'
  if (m <= 100) return 'medium'
  return 'low'
}

export function requestCurrentPosition(opts?: { timeoutMs?: number }): Promise<{
  ok: boolean
  permission: GeoPermission
  fix?: GeoFix
  errorCode?: string
  accuracyGrade: 'high' | 'medium' | 'low' | 'none'
}> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, permission: 'unsupported', errorCode: 'unsupported', accuracyGrade: 'none' })
      return
    }
    const timeoutMs = opts?.timeoutMs ?? 8000
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix: GeoFix = {
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracyM: pos.coords.accuracy,
          heading: pos.coords.heading,
          speedMps: pos.coords.speed,
          at: Date.now(),
        }
        resolve({
          ok: true,
          permission: 'granted',
          fix,
          accuracyGrade: accuracyGrade(fix.accuracyM),
        })
      },
      (err) => {
        const code =
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.TIMEOUT
              ? 'timeout'
              : 'unavailable'
        resolve({
          ok: false,
          permission: code === 'denied' ? 'denied' : 'unknown',
          errorCode: code,
          accuracyGrade: 'none',
        })
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10_000 },
    )
  })
}

export type WatchHandle = { stop: () => void }

export function watchPosition(
  onFix: (fix: GeoFix) => void,
  onError?: (code: string) => void,
): WatchHandle {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.('unsupported')
    return { stop: () => {} }
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onFix({
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        accuracyM: pos.coords.accuracy,
        heading: pos.coords.heading,
        speedMps: pos.coords.speed,
        at: Date.now(),
      })
    },
    (err) => {
      onError?.(
        err.code === err.PERMISSION_DENIED
          ? 'denied'
          : err.code === err.TIMEOUT
            ? 'timeout'
            : 'unavailable',
      )
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
  )
  return {
    stop: () => {
      try {
        navigator.geolocation.clearWatch(id)
      } catch {
        /* ignore */
      }
    },
  }
}

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLng = toR(b.lng - a.lng)
  const la1 = toR(a.lat)
  const la2 = toR(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearingDeg(a: LatLng, b: LatLng): number {
  const toR = (d: number) => (d * Math.PI) / 180
  const φ1 = toR(a.lat)
  const φ2 = toR(b.lat)
  const Δλ = toR(b.lng - a.lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function formatDistance(m: number | null): string {
  if (m == null || !Number.isFinite(m)) return '거리 미확인'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

export function formatDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return '시간 미확인'
  const m = Math.round(sec / 60)
  if (m < 60) return `약 ${m}분`
  const h = Math.floor(m / 60)
  return `약 ${h}시간 ${m % 60}분`
}
