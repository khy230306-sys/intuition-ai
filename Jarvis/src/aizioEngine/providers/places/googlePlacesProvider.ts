/**
 * Google Places provider scaffold — READY only when API key present.
 * Without key: PENDING_EXTERNAL_SETUP (never fake results).
 */

import { readEnv } from '../env'
import type {
  PlacesProvider,
  PlacesSearchInput,
  PlacesSearchOutput,
  ProviderHealth,
  ProviderPlace,
} from '../types'

export class GooglePlacesProvider implements PlacesProvider {
  readonly id = 'google_places'
  readonly label = 'Google Places API'

  private apiKey(): string {
    return (
      readEnv('VITE_AIZIO_GOOGLE_PLACES_API_KEY') ||
      readEnv('AIZIO_GOOGLE_PLACES_API_KEY') ||
      ''
    )
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey()) {
      return {
        providerId: this.id,
        availability: 'PENDING_EXTERNAL_SETUP',
        message: 'VITE_AIZIO_GOOGLE_PLACES_API_KEY 미설정',
        checkedAt: Date.now(),
      }
    }
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'Google Places API 키 감지됨',
      checkedAt: Date.now(),
    }
  }

  async searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchOutput> {
    const key = this.apiKey()
    const requestId = `gplaces_${Date.now().toString(36)}`
    if (!key) {
      const err = new Error('PENDING_EXTERNAL_SETUP')
      ;(err as Error & { code?: string }).code = 'PENDING_EXTERNAL_SETUP'
      throw err
    }

    // Places API (New) Text Search — structure ready; failures surface honestly
    const q = `${input.city ? input.city + ' ' : ''}${input.query}`.trim()
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: input.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.types',
      },
      body: JSON.stringify({
        textQuery: q,
        languageCode: 'ko',
        maxResultCount: Math.min(8, input.limit ?? 5),
        regionCode: 'KR',
      }),
    })
    if (!res.ok) {
      throw new Error(`google_places_http_${res.status}`)
    }
    const data = (await res.json()) as {
      places?: Array<{
        id?: string
        displayName?: { text?: string }
        formattedAddress?: string
        location?: { latitude?: number; longitude?: number }
        rating?: number
        userRatingCount?: number
        googleMapsUri?: string
        types?: string[]
      }>
    }
    const fetchedAt = Date.now()
    const places: ProviderPlace[] = []
    for (const p of data.places || []) {
      const id = String(p.id || '').trim()
      const name = String(p.displayName?.text || '').trim()
      if (!id || !name) continue
      const lat = p.location?.latitude ?? null
      const lng = p.location?.longitude ?? null
      const address = String(p.formattedAddress || '').trim()
      if (lat == null && lng == null && !address) continue
      places.push({
        provider: this.id,
        providerPlaceId: id,
        name,
        address: address || `${lat},${lng}`,
        latitude: lat,
        longitude: lng,
        category: p.types?.[0],
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? null,
        mapsUrl: p.googleMapsUri,
        navigationQuery: address || name,
        fetchedAt,
        rawSourceAvailable: true,
      })
    }

    return { places, providerRequestId: requestId, provider: this.id }
  }
}

export const googlePlacesProvider = new GooglePlacesProvider()
