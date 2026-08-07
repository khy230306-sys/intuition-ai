/**
 * Honest empty providers — used when DEMO is disabled and Live is not connected.
 */

import type { FlightProvider, FlightSearchResult, HotelProvider, HotelSearchResult } from './types'

export const unavailableFlightProvider: FlightProvider = {
  id: 'unavailable',
  async searchFlights(): Promise<FlightSearchResult> {
    return {
      offers: [],
      searchedAt: new Date().toISOString(),
      provider: 'unavailable',
      demo: false,
    }
  },
}

export const unavailableHotelProvider: HotelProvider = {
  id: 'unavailable',
  async searchHotels(): Promise<HotelSearchResult> {
    return {
      offers: [],
      searchedAt: new Date().toISOString(),
      provider: 'unavailable',
      demo: false,
    }
  },
}
