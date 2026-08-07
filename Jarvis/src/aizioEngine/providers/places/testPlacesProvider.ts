/**
 * TEST-ONLY PlacesProvider. Never used on production execution path.
 */

import { TEST_PLACES_CAPABILITIES } from '../capabilities'
import type {
  PlacesProvider,
  PlacesSearchInput,
  PlacesSearchOutput,
  ProviderHealth,
  ProviderPlace,
} from '../types'

export class TestPlacesProvider implements PlacesProvider {
  readonly id = 'test_places'
  readonly label = 'Test Places Fixture'
  readonly tier = 'test' as const
  readonly capabilities = TEST_PLACES_CAPABILITIES
  readonly isTestDouble = true

  private fixtures: ProviderPlace[]

  constructor(fixtures?: ProviderPlace[]) {
    const now = Date.now()
    this.fixtures = fixtures || [
      {
        provider: 'test_places',
        providerPlaceId: 'test_ulsan_park_1',
        name: '울산대공원',
        address: '울산광역시 남구 대공원로 94',
        latitude: 35.531,
        longitude: 129.294,
        category: 'park',
        mapsUrl: 'https://maps.example/test/ulsan-park',
        navigationQuery: '울산대공원 울산광역시 남구',
        fetchedAt: now,
        rawSourceAvailable: true,
      },
      {
        provider: 'test_places',
        providerPlaceId: 'test_ulsan_museum_2',
        name: '울산박물관',
        address: '울산광역시 남구 두왕로 277',
        latitude: 35.527,
        longitude: 129.31,
        category: 'museum',
        mapsUrl: 'https://maps.example/test/ulsan-museum',
        navigationQuery: '울산박물관',
        fetchedAt: now,
        rawSourceAvailable: true,
      },
      {
        provider: 'test_places',
        providerPlaceId: 'test_taehwa_3',
        name: '태화강 국가정원',
        address: '울산광역시 중구 태화동',
        latitude: 35.549,
        longitude: 129.297,
        category: 'garden',
        navigationQuery: '태화강 국가정원',
        fetchedAt: now,
        rawSourceAvailable: true,
      },
    ]
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'TEST DOUBLE — production 금지',
      checkedAt: Date.now(),
      liveVerified: true,
    }
  }

  async searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchOutput> {
    const requestId = `test_places_${Date.now().toString(36)}`
    void input
    const places = this.fixtures.map((p) => ({
      ...p,
      fetchedAt: Date.now(),
      // Never invent rating/review on test fixtures unless explicitly provided
    }))
    return { places, providerRequestId: requestId, provider: this.id }
  }

  async getPlaceDetails(providerPlaceId: string): Promise<ProviderPlace | null> {
    return this.fixtures.find((p) => p.providerPlaceId === providerPlaceId) || null
  }
}

export const testPlacesProvider = new TestPlacesProvider()
