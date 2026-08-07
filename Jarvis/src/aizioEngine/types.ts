/**
 * AIZIO Core Engine V1 types.
 * Orchestrates REAL tools only — never DEMO travel/restaurant catalogs.
 */

export type EngineTurnKind =
  | 'weather'
  | 'place_seek'
  | 'select'
  | 'calendar_write'
  | 'cancel'
  | 'none'

export type EnginePlaceCandidate = {
  rank: number
  id: string
  title: string
  subtitle?: string
  mapsQuery: string
  source: 'photon' | 'catalog' | 'curated'
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
}

export type EngineSession = {
  id: string
  updatedAt: number
  city?: string
  weather?: EngineWeatherSnapshot
  places: EnginePlaceCandidate[]
  placesQuery?: string
  selected?: EnginePlaceCandidate
  lastCalendar?: EngineCalendarWrite
  /** Last verified tool outcomes for the session */
  lastVerified?: {
    weather?: boolean
    places?: boolean
    select?: boolean
    calendar?: boolean
  }
}

export type EngineResult = {
  text: string
  speak?: boolean
  action?: () => void | Promise<void>
  session: EngineSession
}
