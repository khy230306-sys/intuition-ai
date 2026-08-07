/**
 * Provider contracts for AIZIO Core Engine V1.3+.
 * Engine must not hardcode vendor details — only these interfaces + capabilities.
 */

import type { ProviderCapability, ProviderTier } from './capabilities'

export type { ProviderCapability, ProviderTier }

export type ProviderAvailability =
  | 'READY'
  | 'PENDING_EXTERNAL_SETUP'
  | 'DEGRADED'
  | 'UNAVAILABLE'

export type ProviderHealth = {
  providerId: string
  availability: ProviderAvailability
  message: string
  checkedAt: number
  /** True only after a successful live external probe/call. */
  liveVerified?: boolean
}

/** Normalized place from any PlacesProvider. */
export type ProviderPlace = {
  provider: string
  providerPlaceId: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  category?: string
  /** Only when provider returned it — never invent. */
  rating?: number | null
  reviewCount?: number | null
  mapsUrl?: string
  navigationQuery: string
  fetchedAt: number
  rawSourceAvailable: boolean
  /** Google attribution strings — preserve when present. */
  attributions?: string[]
  photoNames?: string[]
}

export type PlacesSearchInput = {
  query: string
  city?: string
  limit?: number
  signal?: AbortSignal
  latitude?: number
  longitude?: number
  radiusMeters?: number
}

export type PlacesSearchOutput = {
  places: ProviderPlace[]
  providerRequestId: string
  provider: string
}

export type NearbySearchInput = {
  latitude: number
  longitude: number
  radiusMeters?: number
  includedTypes?: string[]
  limit?: number
  signal?: AbortSignal
}

export interface PlacesProvider {
  readonly id: string
  readonly label: string
  readonly tier: ProviderTier
  readonly capabilities: readonly ProviderCapability[]
  /** Test doubles must return true — blocked in production. */
  readonly isTestDouble?: boolean
  healthCheck(): Promise<ProviderHealth>
  searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchOutput>
  nearbySearch?(input: NearbySearchInput): Promise<PlacesSearchOutput>
  getPlaceDetails?(providerPlaceId: string, signal?: AbortSignal): Promise<ProviderPlace | null>
}

export type CalendarEventInput = {
  title: string
  whenAt: number
  whenLabel: string
  description?: string
  location?: string
}

export type CalendarEvent = {
  provider: string
  eventId: string
  title: string
  whenAt: number
  whenLabel: string
  location?: string
  calendarKind: 'local' | 'external'
}

export type CalendarAuthStatus = {
  status: 'pending_setup' | 'disconnected' | 'connected' | 'expired'
  clientIdConfigured: boolean
  message: string
}

export interface CalendarProvider {
  readonly id: string
  readonly label: string
  readonly kind: 'local' | 'external'
  readonly isTestDouble?: boolean
  healthCheck(): Promise<ProviderHealth>
  listEvents?(fromMs?: number, toMs?: number): Promise<CalendarEvent[]>
  createEvent(input: CalendarEventInput): Promise<CalendarEvent>
  updateEvent?(eventId: string, patch: Partial<CalendarEventInput>): Promise<CalendarEvent>
  deleteEvent?(eventId: string): Promise<{ ok: boolean; message: string }>
  getEvent(eventId: string): Promise<CalendarEvent | null>
  /** External OAuth connectors */
  authorize?(): Promise<{ ok: boolean; authUrl?: string; error?: string }>
  getAuthStatus?(): CalendarAuthStatus
  revoke?(): Promise<{ ok: boolean; message: string }>
}

export interface WeatherProviderHealth {
  providerId: string
  availability: ProviderAvailability
  message: string
}
