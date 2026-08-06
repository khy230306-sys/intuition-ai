import type { RestaurantDetails, RestaurantSearchInput } from '../schema'
import type { RestaurantProvider, RestaurantSearchResult } from './types'

/**
 * Adapter slot for future partners (Naver Booking, Catchtable, OpenTable, Maps, etc.).
 * Without credentials this provider must not be used for live "success" claims.
 */
export class ExternalRestaurantProvider implements RestaurantProvider {
  id = 'external'
  private apiKey: string
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async searchRestaurants(_input: RestaurantSearchInput): Promise<RestaurantSearchResult> {
    void this.apiKey
    void _input
    throw new Error('External restaurant provider is not configured. Use Demo.')
  }

  async getRestaurantDetails(_restaurantId: string): Promise<RestaurantDetails> {
    void _restaurantId
    throw new Error('External restaurant provider is not configured. Use Demo.')
  }
}
