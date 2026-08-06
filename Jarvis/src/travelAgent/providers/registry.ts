import {
  flightProviderStatus,
  hotelProviderStatus,
  loadTravelConfig,
} from '../config'
import { AmadeusFlightProvider } from './amadeusFlightProvider'
import { AmadeusHotelProvider } from './amadeusHotelProvider'
import { DuffelFlightProvider } from './duffelFlightProvider'
import { ExpediaRapidHotelProvider } from './expediaHotelProvider'
import { mockFlightProvider } from './mockFlightProvider'
import { mockHotelProvider } from './mockHotelProvider'
import type { FlightProvider, HotelProvider } from './types'

export function getFlightProvider(): FlightProvider {
  const cfg = loadTravelConfig()
  const status = flightProviderStatus(cfg)
  if (status !== 'connected') return mockFlightProvider
  if (cfg.flightProvider === 'duffel' && cfg.duffelKey) return new DuffelFlightProvider(cfg.duffelKey)
  if (cfg.flightProvider === 'amadeus' && cfg.amadeusKey && cfg.amadeusSecret) {
    return new AmadeusFlightProvider(cfg.amadeusKey, cfg.amadeusSecret)
  }
  return mockFlightProvider
}

export function getHotelProvider(): HotelProvider {
  const cfg = loadTravelConfig()
  const status = hotelProviderStatus(cfg)
  if (status !== 'connected') return mockHotelProvider
  if (cfg.hotelProvider === 'expedia_rapid' && cfg.expediaKey) {
    return new ExpediaRapidHotelProvider(cfg.expediaKey)
  }
  if (cfg.hotelProvider === 'amadeus' && cfg.amadeusKey && cfg.amadeusSecret) {
    return new AmadeusHotelProvider(cfg.amadeusKey, cfg.amadeusSecret)
  }
  return mockHotelProvider
}
