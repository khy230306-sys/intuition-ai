import type { HotelProvider, HotelSearchInput, HotelSearchResult } from './types'

export class ExpediaRapidHotelProvider implements HotelProvider {
  id = 'expedia_rapid'
  private apiKey: string
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async searchHotels(_input: HotelSearchInput): Promise<HotelSearchResult> {
    void this.apiKey
    void _input
    throw new Error('Expedia Rapid is not configured for live search. Use Demo.')
  }
}
