/**
 * Google Places commercial provider.
 * No API key → PENDING_EXTERNAL_SETUP.
 * READY only after live call verification succeeds (or key + successful probe).
 * REAL only after verified external response with providerPlaceId.
 */

import { GOOGLE_PLACES_CAPABILITIES } from '../capabilities'
import { googlePlacesApiKey, googleNearbySearch, googlePlaceDetails, googleTextSearch } from './googlePlacesClient'
import type {
  NearbySearchInput,
  PlacesProvider,
  PlacesSearchInput,
  PlacesSearchOutput,
  ProviderHealth,
  ProviderPlace,
} from '../types'

let liveVerifiedAt = 0

export function resetGooglePlacesLiveVerifyForTests(): void {
  liveVerifiedAt = 0
}

export function markGooglePlacesLiveVerified(): void {
  liveVerifiedAt = Date.now()
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly id = 'google_places'
  readonly label = 'Google Places API'
  readonly tier = 'commercial' as const
  readonly capabilities = GOOGLE_PLACES_CAPABILITIES

  private apiKey(): string {
    return googlePlacesApiKey()
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey()) {
      return {
        providerId: this.id,
        availability: 'PENDING_EXTERNAL_SETUP',
        message: 'VITE_AIZIO_GOOGLE_PLACES_API_KEY 미설정',
        checkedAt: Date.now(),
        liveVerified: false,
      }
    }
    if (!liveVerifiedAt) {
      return {
        providerId: this.id,
        availability: 'PENDING_EXTERNAL_SETUP',
        message: 'API Key 있음 — 실제 외부 호출 검증 전 (PENDING_EXTERNAL_SETUP)',
        checkedAt: Date.now(),
        liveVerified: false,
      }
    }
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'Google Places 라이브 검증됨',
      checkedAt: Date.now(),
      liveVerified: true,
    }
  }

  /**
   * Attempt live probe when key present (does not invent results).
   * Called by selection engine to promote PENDING → READY after success.
   */
  async tryLiveVerify(signal?: AbortSignal): Promise<boolean> {
    if (!this.apiKey()) return false
    if (liveVerifiedAt) return true
    try {
      const out = await googleTextSearch({ query: '서울역', city: '서울', limit: 1, signal })
      if (out.places.some((p) => p.providerPlaceId)) {
        liveVerifiedAt = Date.now()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  /** For unit tests — simulate successful live verification without network. */
  setLiveVerifiedForTests(v: boolean): void {
    liveVerifiedAt = v ? Date.now() : 0
  }

  async searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchOutput> {
    const out = await googleTextSearch(input)
    if (out.places.some((p) => p.providerPlaceId)) {
      liveVerifiedAt = Date.now()
    }
    return out
  }

  async nearbySearch(input: NearbySearchInput): Promise<PlacesSearchOutput> {
    const out = await googleNearbySearch(input)
    if (out.places.some((p) => p.providerPlaceId)) {
      liveVerifiedAt = Date.now()
    }
    return out
  }

  async getPlaceDetails(providerPlaceId: string, signal?: AbortSignal): Promise<ProviderPlace | null> {
    const place = await googlePlaceDetails(providerPlaceId, signal)
    if (place?.providerPlaceId) liveVerifiedAt = Date.now()
    return place
  }
}

export const googlePlacesProvider = new GooglePlacesProvider()
