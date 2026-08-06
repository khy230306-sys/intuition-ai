import type { RestaurantSearchInput } from '../schema'
import type { RestaurantProvider, RestaurantSearchResult } from './types'
import { mockRestaurantProvider } from './mockRestaurantProvider'

/**
 * Deep-link fallback: search may use demo catalog; reservation opens official URL only.
 * Never claims a reservation succeeded via deep link alone.
 */
export class DeepLinkRestaurantProvider implements RestaurantProvider {
  id = 'deeplink'

  async searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantSearchResult> {
    const res = await mockRestaurantProvider.searchRestaurants(input)
    return {
      ...res,
      provider: 'deeplink',
      demo: true,
      offers: res.offers.map((o) =>
        o.bookingUrl
          ? { ...o, provider: 'deeplink', reservationMode: 'deeplink' as const }
          : o,
      ),
    }
  }

  async getRestaurantDetails(restaurantId: string) {
    return mockRestaurantProvider.getRestaurantDetails(restaurantId)
  }

  async createReservation(input: {
    restaurantId: string
    reservationAttemptId: string
    date: string
    time: string
    partySize: number
  }) {
    const details = await this.getRestaurantDetails(input.restaurantId)
    const url = details.bookingUrl
    return {
      reservationAttemptId: input.reservationAttemptId,
      status: 'FAILED' as const,
      restaurantName: details.name,
      bookingUrl: url,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      provider: 'deeplink',
      message: url
        ? '예약 페이지를 열어 직접 완료해 주세요. 딥링크만으로는 예약을 완료 처리하지 않습니다.'
        : '연결 가능한 예약 페이지가 없습니다. 전화 예약을 이용해 주세요.',
    }
  }
}

export const deepLinkRestaurantProvider = new DeepLinkRestaurantProvider()
