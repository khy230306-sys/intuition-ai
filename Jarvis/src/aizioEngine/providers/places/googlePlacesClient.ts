/**
 * Google Places API (New) client — Text Search / Nearby / Details.
 */

import {
  fetchWithRetry,
  GOOGLE_NEARBY_SEARCH_FIELD_MASK,
  GOOGLE_PLACE_DETAILS_FIELD_MASK,
  GOOGLE_TEXT_SEARCH_FIELD_MASK,
  getSessionPlaceDetails,
  mapGooglePlacesHttpError,
  recordPlacesCostEvent,
  setSessionPlaceDetails,
  withDuplicateRequestGuard,
} from '../costGuard'
import { readEnv } from '../env'
import type { NearbySearchInput, PlacesSearchInput, PlacesSearchOutput, ProviderPlace } from '../types'
import { normalizeGooglePlace, normalizeGooglePlaceList, type GooglePlaceRaw } from './googlePlacesNormalize'

export function googlePlacesApiKey(): string {
  return (
    readEnv('VITE_AIZIO_GOOGLE_PLACES_API_KEY') ||
    readEnv('AIZIO_GOOGLE_PLACES_API_KEY') ||
    ''
  )
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

export async function googleTextSearch(
  input: PlacesSearchInput,
  apiKey = googlePlacesApiKey(),
): Promise<PlacesSearchOutput> {
  if (!apiKey) {
    const err = new Error('PENDING_EXTERNAL_SETUP')
    ;(err as Error & { code?: string }).code = 'PENDING_EXTERNAL_SETUP'
    throw err
  }
  const requestId = `gplaces_text_${Date.now().toString(36)}`
  const q = `${input.city ? input.city + ' ' : ''}${input.query}`.trim()
  const guardKey = `text:${q}:${input.limit ?? 5}`

  return withDuplicateRequestGuard(guardKey, async () => {
    recordPlacesCostEvent('textSearch')
    const res = await fetchWithRetry('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: input.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_TEXT_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: q,
        languageCode: 'ko',
        maxResultCount: Math.min(8, input.limit ?? 5),
        regionCode: 'KR',
      }),
    })
    if (!res.ok) throw mapGooglePlacesHttpError(res.status, await readErrorBody(res))
    const data = (await res.json()) as { places?: GooglePlaceRaw[] }
    const places = normalizeGooglePlaceList(data.places)
    return { places, providerRequestId: requestId, provider: 'google_places' }
  })
}

export async function googleNearbySearch(
  input: NearbySearchInput,
  apiKey = googlePlacesApiKey(),
): Promise<PlacesSearchOutput> {
  if (!apiKey) {
    const err = new Error('PENDING_EXTERNAL_SETUP')
    ;(err as Error & { code?: string }).code = 'PENDING_EXTERNAL_SETUP'
    throw err
  }
  const requestId = `gplaces_near_${Date.now().toString(36)}`
  const guardKey = `near:${input.latitude},${input.longitude}:${input.radiusMeters ?? 3000}`

  return withDuplicateRequestGuard(guardKey, async () => {
    recordPlacesCostEvent('nearbySearch')
    const res = await fetchWithRetry('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      signal: input.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_NEARBY_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        languageCode: 'ko',
        maxResultCount: Math.min(8, input.limit ?? 5),
        locationRestriction: {
          circle: {
            center: { latitude: input.latitude, longitude: input.longitude },
            radius: Math.min(50000, Math.max(100, input.radiusMeters ?? 3000)),
          },
        },
        includedTypes: input.includedTypes?.length ? input.includedTypes : undefined,
      }),
    })
    if (!res.ok) throw mapGooglePlacesHttpError(res.status, await readErrorBody(res))
    const data = (await res.json()) as { places?: GooglePlaceRaw[] }
    return {
      places: normalizeGooglePlaceList(data.places),
      providerRequestId: requestId,
      provider: 'google_places',
    }
  })
}

export async function googlePlaceDetails(
  providerPlaceId: string,
  signal?: AbortSignal,
  apiKey = googlePlacesApiKey(),
): Promise<ProviderPlace | null> {
  if (!apiKey) {
    const err = new Error('PENDING_EXTERNAL_SETUP')
    ;(err as Error & { code?: string }).code = 'PENDING_EXTERNAL_SETUP'
    throw err
  }
  const id = providerPlaceId.replace(/^places\//, '')
  const cached = getSessionPlaceDetails<ProviderPlace>(id)
  if (cached) return { ...cached, fetchedAt: cached.fetchedAt }

  return withDuplicateRequestGuard(`details:${id}`, async () => {
    recordPlacesCostEvent('placeDetails')
    const res = await fetchWithRetry(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        signal,
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': GOOGLE_PLACE_DETAILS_FIELD_MASK,
        },
      },
    )
    if (res.status === 404) return null
    if (!res.ok) throw mapGooglePlacesHttpError(res.status, await readErrorBody(res))
    const raw = (await res.json()) as GooglePlaceRaw
    const place = normalizeGooglePlace(raw)
    if (place) setSessionPlaceDetails(id, place)
    return place
  })
}
