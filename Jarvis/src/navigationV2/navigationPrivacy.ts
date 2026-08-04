/**
 * Privacy helpers for Navigation v2 — never log precise coordinates or full addresses.
 */

import type { LatLng } from './types'

export function accuracyBucket(accuracyM: number | null | undefined): 'unknown' | 'high' | 'medium' | 'low' {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return 'unknown'
  if (accuracyM <= 25) return 'high'
  if (accuracyM <= 80) return 'medium'
  return 'low'
}

/** Mask address for UI/diagnostics — keep city/district only when possible. */
export function maskAddress(address: string): string {
  const s = String(address || '').trim()
  if (!s) return ''
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.map((p, i) => (i === parts.length - 1 ? '···' : p)).join(' ')
  return `${parts.slice(0, 2).join(' ')} ···`
}

/** Never include full lat/lng in exported diagnostics. */
export function redactCoords(_coords: LatLng | null | undefined): null {
  return null
}

export function safePermissionLabel(
  state: 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown' | string,
): string {
  switch (state) {
    case 'granted':
      return 'granted'
    case 'denied':
      return 'denied'
    case 'prompt':
      return 'prompt'
    case 'unsupported':
      return 'unsupported'
    default:
      return 'unknown'
  }
}
