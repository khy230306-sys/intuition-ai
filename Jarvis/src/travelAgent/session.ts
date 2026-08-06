import { TravelSessionSchema, type TravelSession, type TravelerSummary } from './schema'

const KEY = 'aizio_travel_session_v1'

function newId(): string {
  return `trv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function defaultTravelers(adults = 1): TravelerSummary {
  return { adults, children: 0, infants: 0, total: adults }
}

export function createTravelSession(partial?: Partial<TravelSession>): TravelSession {
  const now = Date.now()
  const session: TravelSession = TravelSessionSchema.parse({
    id: newId(),
    status: 'planning',
    travelers: defaultTravelers(1),
    tripType: 'unknown',
    cabinClass: 'economy',
    flightSearchResults: [],
    hotelSearchResults: [],
    bookingStatus: 'NOT_STARTED',
    demo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  })
  saveTravelSession(session)
  return session
}

export function loadTravelSession(): TravelSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return TravelSessionSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveTravelSession(session: TravelSession): TravelSession {
  const next = TravelSessionSchema.parse({ ...session, updatedAt: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function updateTravelSession(patch: Partial<TravelSession>): TravelSession {
  const cur = loadTravelSession() || createTravelSession()
  return saveTravelSession({ ...cur, ...patch })
}

export function clearTravelSession(): void {
  localStorage.removeItem(KEY)
}

export function hasActiveTravelSession(): boolean {
  const s = loadTravelSession()
  return Boolean(s && s.status !== 'cancelled' && s.status !== 'booked')
}
