/**
 * Travel Services connection config — keys never logged or shown in UI.
 */

import { deobfuscateSecret, obfuscateSecret } from '../ai-providers/keyVault'

const KEY = 'aizio_travel_services_v1'

export type FlightProviderId = 'demo' | 'duffel' | 'amadeus'
export type HotelProviderId = 'demo' | 'expedia_rapid' | 'amadeus'

export type TravelProviderStatus = 'connected' | 'not_configured' | 'error' | 'demo'

export type TravelServicesConfig = {
  flightProvider: FlightProviderId
  hotelProvider: HotelProviderId
  duffelKey?: string
  amadeusKey?: string
  amadeusSecret?: string
  expediaKey?: string
  autoAddCalendar: boolean
  updatedAt: string
}

const DEFAULT: TravelServicesConfig = {
  flightProvider: 'demo',
  hotelProvider: 'demo',
  autoAddCalendar: false,
  updatedAt: new Date(0).toISOString(),
}

export function loadTravelConfig(): TravelServicesConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const p = JSON.parse(raw) as TravelServicesConfig
    return {
      ...DEFAULT,
      ...p,
      duffelKey: p.duffelKey ? deobfuscateSecret(p.duffelKey) : undefined,
      amadeusKey: p.amadeusKey ? deobfuscateSecret(p.amadeusKey) : undefined,
      amadeusSecret: p.amadeusSecret ? deobfuscateSecret(p.amadeusSecret) : undefined,
      expediaKey: p.expediaKey ? deobfuscateSecret(p.expediaKey) : undefined,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveTravelConfig(patch: Partial<TravelServicesConfig>): TravelServicesConfig {
  const cur = loadTravelConfig()
  const next: TravelServicesConfig = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  const stored = {
    ...next,
    duffelKey: next.duffelKey ? obfuscateSecret(next.duffelKey) : undefined,
    amadeusKey: next.amadeusKey ? obfuscateSecret(next.amadeusKey) : undefined,
    amadeusSecret: next.amadeusSecret ? obfuscateSecret(next.amadeusSecret) : undefined,
    expediaKey: next.expediaKey ? obfuscateSecret(next.expediaKey) : undefined,
  }
  localStorage.setItem(KEY, JSON.stringify(stored))
  return next
}

export function flightProviderStatus(cfg = loadTravelConfig()): TravelProviderStatus {
  if (cfg.flightProvider === 'demo') return 'demo'
  if (cfg.flightProvider === 'duffel') return cfg.duffelKey ? 'connected' : 'not_configured'
  if (cfg.flightProvider === 'amadeus')
    return cfg.amadeusKey && cfg.amadeusSecret ? 'connected' : 'not_configured'
  return 'not_configured'
}

export function hotelProviderStatus(cfg = loadTravelConfig()): TravelProviderStatus {
  if (cfg.hotelProvider === 'demo') return 'demo'
  if (cfg.hotelProvider === 'expedia_rapid') return cfg.expediaKey ? 'connected' : 'not_configured'
  if (cfg.hotelProvider === 'amadeus')
    return cfg.amadeusKey && cfg.amadeusSecret ? 'connected' : 'not_configured'
  return 'not_configured'
}

export function isDemoTravelMode(cfg = loadTravelConfig()): boolean {
  return (
    flightProviderStatus(cfg) === 'demo' ||
    flightProviderStatus(cfg) === 'not_configured' ||
    hotelProviderStatus(cfg) === 'demo' ||
    hotelProviderStatus(cfg) === 'not_configured'
  )
}

export function statusLabelKo(s: TravelProviderStatus): string {
  if (s === 'connected') return 'Connected'
  if (s === 'demo') return 'Demo'
  if (s === 'error') return 'Error'
  return 'Not configured'
}
