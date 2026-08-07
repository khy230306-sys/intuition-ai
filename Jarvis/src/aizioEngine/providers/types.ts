/**
 * Provider contracts for AIZIO Core Engine V1.2+.
 * Engine must not hardcode vendor details — only these interfaces.
 */

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
  rating?: number | null
  reviewCount?: number | null
  mapsUrl?: string
  navigationQuery: string
  fetchedAt: number
  rawSourceAvailable: boolean
}

export type PlacesSearchInput = {
  query: string
  city?: string
  limit?: number
  signal?: AbortSignal
}

export type PlacesSearchOutput = {
  places: ProviderPlace[]
  providerRequestId: string
  provider: string
}

export interface PlacesProvider {
  readonly id: string
  readonly label: string
  /** Test doubles must return true — blocked in production. */
  readonly isTestDouble?: boolean
  healthCheck(): Promise<ProviderHealth>
  searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchOutput>
  getPlaceDetails?(providerPlaceId: string): Promise<ProviderPlace | null>
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
}

export interface WeatherProviderHealth {
  providerId: string
  availability: ProviderAvailability
  message: string
}
