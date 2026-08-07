import type { ProviderSearchRequest, ProviderSearchResponse, RestaurantProvider } from './types'

export const defaultRestaurantProvider: RestaurantProvider = {
  id: 'aizio-restaurant-gate',
  async search(req: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    if (req.allowFixtures) {
      const loc = req.slots.location || '근처'
      const cat = req.slots.category || '식당'
      return {
        availability: 'SEARCH_AVAILABLE',
        message: `테스트용 ${cat} 후보 · ${loc}`,
        results: [
          { id: 'result_1', rank: 1, title: `${loc} ${cat} A`, subtitle: 'fixture' },
          { id: 'result_2', rank: 2, title: `${loc} ${cat} B`, subtitle: 'fixture' },
          { id: 'result_3', rank: 3, title: `${loc} ${cat} C`, subtitle: 'fixture' },
        ],
      }
    }
    return {
      availability: 'NEEDS_PROVIDER',
      results: [],
      message:
        '음식점 실검색 API가 연결되어 있지 않습니다. DEMO 식당 목록은 표시하지 않습니다. 지도에서 찾으려면 「근처 맛집」처럼 말해 주세요.',
      errorCode: 'NEEDS_PROVIDER',
    }
  },
}

let injected: RestaurantProvider | null = null
export function getRestaurantProvider(): RestaurantProvider {
  return injected || defaultRestaurantProvider
}
export function setRestaurantProviderForTests(p: RestaurantProvider | null): void {
  injected = p
}
