/**
 * Places Cost Guard — minimize billed Google Places calls.
 * Session-scoped dedupe only (no long-term Google-policy-violating cache).
 */

export type PlacesCostTelemetry = {
  dayKey: string
  textSearch: number
  nearbySearch: number
  placeDetails: number
  errors: number
  quotaExceeded: number
  lastErrorCode?: string
  lastAt?: number
}

const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_MAX_RETRIES = 1
const SESSION_DETAILS_TTL_MS = 5 * 60_000

let telemetry: PlacesCostTelemetry = freshTelemetry()
const sessionDetailHits = new Map<string, { at: number; payload: unknown }>()
const inFlightKeys = new Set<string>()

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function freshTelemetry(): PlacesCostTelemetry {
  return {
    dayKey: dayKey(),
    textSearch: 0,
    nearbySearch: 0,
    placeDetails: 0,
    errors: 0,
    quotaExceeded: 0,
  }
}

function rollDay(): void {
  const k = dayKey()
  if (telemetry.dayKey !== k) telemetry = freshTelemetry()
}

export function resetCostGuardForTests(): void {
  telemetry = freshTelemetry()
  sessionDetailHits.clear()
  inFlightKeys.clear()
}

export function getPlacesCostTelemetry(): PlacesCostTelemetry {
  rollDay()
  return { ...telemetry }
}

/** Hook for daily request telemetry (UI/diagnostics can read). */
export function recordPlacesCostEvent(
  kind: 'textSearch' | 'nearbySearch' | 'placeDetails' | 'error' | 'quotaExceeded',
  errorCode?: string,
): void {
  rollDay()
  if (kind === 'textSearch') telemetry.textSearch += 1
  else if (kind === 'nearbySearch') telemetry.nearbySearch += 1
  else if (kind === 'placeDetails') telemetry.placeDetails += 1
  else if (kind === 'error') telemetry.errors += 1
  else if (kind === 'quotaExceeded') {
    telemetry.quotaExceeded += 1
    telemetry.errors += 1
  }
  if (errorCode) telemetry.lastErrorCode = errorCode
  telemetry.lastAt = Date.now()
}

export function placesRequestTimeoutMs(): number {
  return DEFAULT_TIMEOUT_MS
}

export function placesMaxRetries(): number {
  return DEFAULT_MAX_RETRIES
}

/** Minimal FieldMasks — do not request unused photo/review bodies on list search. */
export const GOOGLE_TEXT_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.types,places.attributions'

export const GOOGLE_NEARBY_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.types,places.attributions'

export const GOOGLE_PLACE_DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,types,attributions,regularOpeningHours'

export function abortAfter(ms: number, outer?: AbortSignal): AbortSignal {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  if (outer) {
    if (outer.aborted) c.abort()
    else
      outer.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          c.abort()
        },
        { once: true },
      )
  }
  c.signal.addEventListener('abort', () => clearTimeout(t), { once: true })
  return c.signal
}

export function getSessionPlaceDetails<T>(placeId: string): T | null {
  const hit = sessionDetailHits.get(placeId)
  if (!hit) return null
  if (Date.now() - hit.at > SESSION_DETAILS_TTL_MS) {
    sessionDetailHits.delete(placeId)
    return null
  }
  return hit.payload as T
}

export function setSessionPlaceDetails(placeId: string, payload: unknown): void {
  sessionDetailHits.set(placeId, { at: Date.now(), payload })
}

/** Prevent duplicate in-flight identical request keys within a session. */
export async function withDuplicateRequestGuard<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (inFlightKeys.has(key)) {
    const err = new Error('DUPLICATE_REQUEST_IN_FLIGHT')
    ;(err as Error & { code?: string }).code = 'DUPLICATE_REQUEST_IN_FLIGHT'
    throw err
  }
  inFlightKeys.add(key)
  try {
    return await fn()
  } finally {
    inFlightKeys.delete(key)
  }
}

export function mapGooglePlacesHttpError(status: number, bodyText?: string): Error {
  const snippet = (bodyText || '').slice(0, 200)
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(snippet)) {
    recordPlacesCostEvent('quotaExceeded', `HTTP_${status}`)
    const err = new Error('QUOTA_EXCEEDED')
    ;(err as Error & { code?: string }).code = 'QUOTA_EXCEEDED'
    return err
  }
  if (status === 403 || /PERMISSION_DENIED|API_KEY/i.test(snippet)) {
    recordPlacesCostEvent('error', `HTTP_${status}`)
    const err = new Error('GOOGLE_PLACES_FORBIDDEN')
    ;(err as Error & { code?: string }).code = 'GOOGLE_PLACES_FORBIDDEN'
    return err
  }
  if (status === 401) {
    recordPlacesCostEvent('error', 'HTTP_401')
    const err = new Error('GOOGLE_PLACES_UNAUTHORIZED')
    ;(err as Error & { code?: string }).code = 'GOOGLE_PLACES_UNAUTHORIZED'
    return err
  }
  recordPlacesCostEvent('error', `HTTP_${status}`)
  return new Error(`google_places_http_${status}`)
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { maxRetries?: number; timeoutMs?: number },
): Promise<Response> {
  const maxRetries = opts?.maxRetries ?? placesMaxRetries()
  const timeoutMs = opts?.timeoutMs ?? placesRequestTimeoutMs()
  let lastErr: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const signal = abortAfter(timeoutMs, init.signal || undefined)
      const res = await fetch(url, { ...init, signal })
      // Retry only transient 5xx (not 429 — surfaced as quota)
      if (res.status >= 500 && attempt < maxRetries) {
        lastErr = new Error(`http_${res.status}`)
        continue
      }
      return res
    } catch (e) {
      lastErr = e
      if (attempt >= maxRetries) break
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch_failed')
}
