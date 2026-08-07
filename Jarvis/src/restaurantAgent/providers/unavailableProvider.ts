import type { RestaurantProvider, RestaurantSearchResult } from './types'

export const unavailableRestaurantProvider: RestaurantProvider = {
  id: 'unavailable',
  async searchRestaurants(): Promise<RestaurantSearchResult> {
    return {
      offers: [],
      searchedAt: new Date().toISOString(),
      provider: 'unavailable',
      demo: false,
    }
  },
  async getRestaurantDetails() {
    throw new Error('맛집 Provider 미연결')
  },
}
