/**
 * Provider Registry — Engine resolves providers here, never hardcodes vendors.
 */

import { localCalendarProvider } from './calendar/localCalendarProvider'
import { googleCalendarProvider } from './calendar/googleCalendarProvider'
import { resetCostGuardForTests } from './costGuard'
import { isProductionRuntime } from './env'
import { googlePlacesProvider, resetGooglePlacesLiveVerifyForTests } from './places/googlePlacesProvider'
import { photonPlacesProvider } from './places/photonPlacesProvider'
import {
  familySeekSelectionIntent,
  selectPlacesProvider,
  setSelectionPlacesOverride,
  type PlacesSelection,
} from './selection'
import type {
  CalendarProvider,
  PlacesProvider,
  ProviderAvailability,
  ProviderHealth,
} from './types'
import {
  openMeteoWeatherProvider,
  type WeatherProvider,
} from './weather/openMeteoWeatherProvider'

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
  setSelectionPlacesOverride(p)
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
  calendarLocalOverride = null
  calendarExternalOverride = null
  allowTestDoubles = false
  setSelectionPlacesOverride(null)
  resetCostGuardForTests()
  resetGooglePlacesLiveVerifyForTests()
}

/**
 * Capability-based Places resolution (family seek default intent).
 * Falls back to Photon with degraded/missingCapabilities when Google not READY.
 */
export async function resolvePlacesProvider(): Promise<
  PlacesSelection & {
    provider: PlacesProvider | null
    health: ProviderHealth | null
    availability: ProviderAvailability
  }
> {
  return selectPlacesProvider(familySeekSelectionIntent())
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
