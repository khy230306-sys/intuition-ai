import type { FlightProvider, FlightSearchInput, FlightSearchResult } from './types'

/** Stub — requires Duffel production access + API key. Falls back unused when not configured. */
export class DuffelFlightProvider implements FlightProvider {
  id = 'duffel'
  private apiKey: string
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async searchFlights(_input: FlightSearchInput): Promise<FlightSearchResult> {
    void this.apiKey
    void _input
    throw new Error('Duffel provider is not configured for live search in this build. Use Demo.')
  }
}
