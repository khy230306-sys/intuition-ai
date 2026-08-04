import type { GeoPermissionState, LocationAttemptResult } from './navigationTypes'

export async function queryGeoPermission(): Promise<GeoPermissionState> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported'
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const r = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    if (r.state === 'granted') return 'granted'
    if (r.state === 'denied') return 'denied'
    if (r.state === 'prompt') return 'prompt'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function accuracyGrade(acc: number | null | undefined): LocationAttemptResult['accuracyGrade'] {
  if (acc == null || !Number.isFinite(acc)) return 'none'
  if (acc <= 50) return 'high'
  if (acc <= 200) return 'medium'
  return 'low'
}

/**
 * Request current position after a user gesture.
 * Coordinates are returned ephemerally — caller must not persist them.
 */
export function requestCurrentPosition(opts?: {
  timeoutMs?: number
}): Promise<LocationAttemptResult> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve({
      ok: false,
      permission: 'unsupported',
      accuracyGrade: 'none',
      errorCode: 'unsupported',
    })
  }
  const timeoutMs = opts?.timeoutMs ?? 12_000
  return new Promise((resolve) => {
    let settled = false
    const finish = (r: LocationAttemptResult) => {
      if (settled) return
      settled = true
      resolve(r)
    }
    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        permission: 'unknown',
        accuracyGrade: 'none',
        errorCode: 'timeout',
      })
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer)
        finish({
          ok: true,
          permission: 'granted',
          accuracyGrade: accuracyGrade(pos.coords.accuracy),
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        })
      },
      (err) => {
        window.clearTimeout(timer)
        const code =
          err.code === 1 ? 'denied' : err.code === 2 ? 'unavailable' : err.code === 3 ? 'timeout' : 'error'
        finish({
          ok: false,
          permission: code === 'denied' ? 'denied' : 'unknown',
          accuracyGrade: 'none',
          errorCode: code,
        })
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

/** Safe diag fields only — never lat/lng. */
export function locationDiagFields(r: LocationAttemptResult): Record<string, unknown> {
  return {
    permission: r.permission,
    ok: r.ok,
    accuracyGrade: r.accuracyGrade,
    errorCode: r.errorCode || null,
  }
}
