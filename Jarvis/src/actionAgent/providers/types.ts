import type { ActionResult, SearchAvailability, SearchResultItem, TaskSlots } from '../types'

export type ProviderErrorCode =
  | 'NEEDS_PROVIDER'
  | 'SEARCH_UNAVAILABLE'
  | 'INVALID_SLOTS'
  | 'NETWORK'
  | 'PROVIDER_ERROR'

export type ProviderSearchRequest = {
  slots: TaskSlots
  /** When true (vitest / explicit), adapters may return fixtures */
  allowFixtures?: boolean
}

export type ProviderSearchResponse = {
  availability: SearchAvailability
  results: SearchResultItem[]
  message: string
  errorCode?: ProviderErrorCode
}

export interface FlightProvider {
  id: string
  search(req: ProviderSearchRequest): Promise<ProviderSearchResponse>
}

export interface HotelProvider {
  id: string
  search(req: ProviderSearchRequest): Promise<ProviderSearchResponse>
}

export interface RestaurantProvider {
  id: string
  search(req: ProviderSearchRequest): Promise<ProviderSearchResponse>
}

export interface CalendarProvider {
  id: string
  createFromSelection(req: {
    slots: TaskSlots
    result?: SearchResultItem
    allowWrite?: boolean
  }): Promise<ActionResult>
}

export interface ReminderProvider {
  id: string
  createFromSelection(req: {
    slots: TaskSlots
    result?: SearchResultItem
    offsetMinutes?: number
    allowWrite?: boolean
  }): Promise<ActionResult>
}
