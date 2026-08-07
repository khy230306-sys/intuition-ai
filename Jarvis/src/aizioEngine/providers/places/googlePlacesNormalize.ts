/**
 * Normalize Google Places API (New) responses → ProviderPlace.
 * Never invent rating/review when absent. Drop rows without providerPlaceId.
 */

import type { ProviderPlace } from '../types'

export type GooglePlaceRaw = {
  id?: string
  name?: string // resource name places/xxx
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  types?: string[]
  attributions?: Array<{ provider?: string; text?: string } | string>
  photos?: Array<{ name?: string }>
  regularOpeningHours?: unknown
}

export const GOOGLE_PLACES_PROVIDER_ID = 'google_places'

export function normalizeGooglePlace(raw: GooglePlaceRaw, fetchedAt = Date.now()): ProviderPlace | null {
  const id = String(raw.id || raw.name?.replace(/^places\//, '') || '').trim()
  const name = String(raw.displayName?.text || '').trim()
  if (!id || !name) return null
  const lat = raw.location?.latitude ?? null
  const lng = raw.location?.longitude ?? null
  const address = String(raw.formattedAddress || '').trim()
  if (lat == null && lng == null && !address) return null

  const attributions = (raw.attributions || [])
    .map((a) => (typeof a === 'string' ? a : a.text || a.provider || ''))
    .map((s) => s.trim())
    .filter(Boolean)

  const photoNames = (raw.photos || [])
    .map((p) => String(p.name || '').trim())
    .filter(Boolean)

  const place: ProviderPlace = {
    provider: GOOGLE_PLACES_PROVIDER_ID,
    providerPlaceId: id.startsWith('places/') ? id.slice('places/'.length) : id,
    name,
    address: address || (lat != null && lng != null ? `${lat},${lng}` : ''),
    latitude: lat,
    longitude: lng,
    category: raw.types?.[0],
    mapsUrl: raw.googleMapsUri,
    navigationQuery: address || name,
    fetchedAt,
    rawSourceAvailable: true,
  }

  // Only attach when Google returned values — never invent
  if (typeof raw.rating === 'number' && Number.isFinite(raw.rating)) {
    place.rating = raw.rating
  }
  if (typeof raw.userRatingCount === 'number' && Number.isFinite(raw.userRatingCount)) {
    place.reviewCount = raw.userRatingCount
  }
  if (attributions.length) place.attributions = attributions
  if (photoNames.length) place.photoNames = photoNames

  return place
}

export function normalizeGooglePlaceList(
  places: GooglePlaceRaw[] | undefined,
  fetchedAt = Date.now(),
): ProviderPlace[] {
  const out: ProviderPlace[] = []
  for (const raw of places || []) {
    const n = normalizeGooglePlace(raw, fetchedAt)
    if (n) out.push(n)
  }
  return out
}
