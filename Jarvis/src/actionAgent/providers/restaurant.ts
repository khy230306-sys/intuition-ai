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
        '음식점 검색에 필요한 정보는 모았어요. 현재 음식점 검색 제공자가 연결되지 않아 실제 목록을 보여드릴 수 없습니다.',
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
