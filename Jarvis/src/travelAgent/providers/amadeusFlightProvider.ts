import type { FlightProvider, FlightSearchInput, FlightSearchResult } from './types'

export class AmadeusFlightProvider implements FlightProvider {
  id = 'amadeus'
  private apiKey: string
  private apiSecret: string
  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  async searchFlights(_input: FlightSearchInput): Promise<FlightSearchResult> {
    void this.apiKey
    void this.apiSecret
    void _input
    throw new Error('Amadeus flight provider is not configured for live search. Use Demo.')
  }
}
