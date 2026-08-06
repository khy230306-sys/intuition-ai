import type { HotelProvider, HotelSearchInput, HotelSearchResult } from './types'

export class AmadeusHotelProvider implements HotelProvider {
  id = 'amadeus'
  private apiKey: string
  private apiSecret: string
  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  async searchHotels(_input: HotelSearchInput): Promise<HotelSearchResult> {
    void this.apiKey
    void this.apiSecret
    void _input
    throw new Error('Amadeus hotel provider is not configured for live search. Use Demo.')
  }
}
