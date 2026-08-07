/**
 * Provider Registry — Engine resolves providers here, never hardcodes vendors.
 */

import { localCalendarProvider } from './calendar/localCalendarProvider'
import { googleCalendarProvider } from './calendar/googleCalendarProvider'
import { isProductionRuntime } from './env'
import { googlePlacesProvider } from './places/googlePlacesProvider'
import { photonPlacesProvider } from './places/photonPlacesProvider'
import type { CalendarProvider, PlacesProvider, ProviderAvailability, ProviderHealth } from './types'
import {
  openMeteoWeatherProvider,
  type WeatherProvider,
} from './weather/openMeteoWeatherProvider'

let placesOverride: PlacesProvider | null = null
let calendarLocalOverride: CalendarProvider | null = null
let calendarExternalOverride: CalendarProvider | null = null
/** When true (tests only), allow test doubles on the active path. */
let allowTestDoubles = false

export function setAllowTestDoublesForTests(v: boolean): void {
  allowTestDoubles = v
}

export function assertProviderAllowed(p: { id: string; isTestDouble?: boolean }): void {
  if (p.isTestDouble && (isProductionRuntime() || !allowTestDoubles)) {
    throw new Error(`Test provider "${p.id}" blocked outside test harness`)
  }
}

export function setPlacesProviderForTests(p: PlacesProvider | null): void {
  if (p) assertProviderAllowed(p)
  placesOverride = p
}

export function setLocalCalendarProviderForTests(p: CalendarProvider | null): void {
  if (p) assertProviderAllowed(p)
  calendarLocalOverride = p
}

export function setExternalCalendarProviderForTests(p: CalendarProvider | null): void {
  if (p) assertProviderAllowed(p)
  calendarExternalOverride = p
}

export function resetProviderRegistryForTests(): void {
  placesOverride = null
  calendarLocalOverride = null
  calendarExternalOverride = null
  allowTestDoubles = false
}

/** Production order: Google (if READY) → Photon. Never curated/demo. */
export async function resolvePlacesProvider(): Promise<{
  provider: PlacesProvider | null
  health: ProviderHealth | null
  availability: ProviderAvailability
}> {
  if (placesOverride) {
    assertProviderAllowed(placesOverride)
    const health = await placesOverride.healthCheck()
    return { provider: placesOverride, health, availability: health.availability }
  }

  const candidates: PlacesProvider[] = [googlePlacesProvider, photonPlacesProvider]
  let pending: ProviderHealth | null = null
  for (const p of candidates) {
    if (p.isTestDouble) continue
    const health = await p.healthCheck()
    if (health.availability === 'READY') {
      return { provider: p, health, availability: 'READY' }
    }
    if (health.availability === 'PENDING_EXTERNAL_SETUP' && !pending) pending = health
  }
  if (pending) {
    // Photon should normally be READY; if we only have pending Google and Photon failed...
    return { provider: null, health: pending, availability: 'PENDING_EXTERNAL_SETUP' }
  }
  return {
    provider: null,
    health: {
      providerId: 'none',
      availability: 'UNAVAILABLE',
      message: '사용 가능한 Places Provider 없음',
      checkedAt: Date.now(),
    },
    availability: 'UNAVAILABLE',
  }
}

export function getLocalCalendarProvider(): CalendarProvider {
  const p = calendarLocalOverride || localCalendarProvider
  assertProviderAllowed(p)
  return p
}

export async function resolveExternalCalendarProvider(): Promise<{
  provider: CalendarProvider | null
  health: ProviderHealth
}> {
  if (calendarExternalOverride) {
    assertProviderAllowed(calendarExternalOverride)
    const health = await calendarExternalOverride.healthCheck()
    return { provider: health.availability === 'READY' ? calendarExternalOverride : null, health }
  }
  const health = await googleCalendarProvider.healthCheck()
  if (health.availability === 'READY') {
    return { provider: googleCalendarProvider, health }
  }
  return { provider: null, health }
}

export function resolveWeatherProvider(): WeatherProvider {
  return openMeteoWeatherProvider
}

export async function listProviderStatuses(): Promise<{
  weather: ProviderHealth
  places: ProviderHealth[]
  calendarLocal: ProviderHealth
  calendarExternal: ProviderHealth
}> {
  const places = await Promise.all(
    [googlePlacesProvider, photonPlacesProvider].map((p) => p.healthCheck()),
  )
  return {
    weather: await openMeteoWeatherProvider.healthCheck(),
    places,
    calendarLocal: await localCalendarProvider.healthCheck(),
    calendarExternal: await googleCalendarProvider.healthCheck(),
  }
}
