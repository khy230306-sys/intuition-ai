/**
 * AIZIO Core Engine types (V1.2).
 */

import type { SessionContext } from './context'
import type { ToolResult } from './toolResult'

export type EngineTurnKind =
  | 'weather'
  | 'place_seek'
  | 'select'
  | 'place_hours'
  | 'calendar_write'
  | 'cancel'
  | 'none'

/** Place candidate shown to user — REAL requires providerPlaceId + geo/address. */
export type EnginePlaceCandidate = {
  rank: number
  id: string
  title: string
  subtitle?: string
  mapsQuery: string
  source: 'photon' | 'google_places' | 'test_places' | 'catalog' | 'curated'
  provider?: string
  providerPlaceId?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  category?: string
  rating?: number | null
  reviewCount?: number | null
  mapsUrl?: string
  fetchedAt?: number
  rawSourceAvailable?: boolean
  attributions?: string[]
}

export type EngineWeatherSnapshot = {
  city: string
  dayLabel: '오늘' | '내일' | '모레' | '지금'
  label: string
  tempC: number | null
  precipProb: number | null
  rainingLikely: boolean
  source: string
  fetchedAt: number
}

export type EngineCalendarWrite = {
  title: string
  whenAt: number
  whenLabel: string
  reminderId: string
  verified: boolean
  /** local = AIZIO 내부 일정, external = Google 등 */
  calendarKind: 'local' | 'external'
  provider: string
  externalEventId?: string
}

export type EngineSession = {
  id: string
  updatedAt: number
  context: SessionContext
  city?: string
  weather?: EngineWeatherSnapshot
  places: EnginePlaceCandidate[]
  placesQuery?: string
  selected?: EnginePlaceCandidate
  lastCalendar?: EngineCalendarWrite
  lastVerified?: {
    weather?: boolean
    places?: boolean
    select?: boolean
    calendar?: boolean
  }
  lastToolResults?: Record<string, ToolResult>
}

export type EngineResult = {
  text: string
  speak?: boolean
  action?: () => void | Promise<void>
  session: EngineSession
}
