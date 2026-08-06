import { RestaurantSessionSchema, type RestaurantSession } from './schema'

const KEY = 'aizio_restaurant_session_v1'

function newId(): string {
  return `rst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function createRestaurantSession(partial?: Partial<RestaurantSession>): RestaurantSession {
  const now = Date.now()
  const session = RestaurantSessionSchema.parse({
    id: newId(),
    results: [],
    status: 'searching',
    reservationStatus: 'NOT_STARTED',
    demo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  })
  saveRestaurantSession(session)
  return session
}

export function loadRestaurantSession(): RestaurantSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return RestaurantSessionSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveRestaurantSession(session: RestaurantSession): RestaurantSession {
  const next = RestaurantSessionSchema.parse({ ...session, updatedAt: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearRestaurantSession(): void {
  localStorage.removeItem(KEY)
}

export function hasActiveRestaurantSession(): boolean {
  const s = loadRestaurantSession()
  return Boolean(s && s.status !== 'cancelled' && s.status !== 'reserved')
}
