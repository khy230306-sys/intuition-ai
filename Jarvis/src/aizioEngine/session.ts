import { emptyContext, type SessionContext } from './context'
import type { EngineSession } from './types'

const KEY = 'aizio_core_engine_session_v1'
const TTL_MS = 45 * 60_000

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `eng_${Date.now().toString(36)}`
}

/** Sync flat V1 fields from structured context. */
export function syncFlatFromContext(session: EngineSession): EngineSession {
  const c = session.context || emptyContext()
  return {
    ...session,
    context: c,
    city: c.city,
    weather: c.weather,
    places: c.places || [],
    placesQuery: c.placesQuery,
    selected: c.selected,
    lastToolResults: c.lastTools,
  }
}

function migrateSession(raw: EngineSession): EngineSession {
  if (raw.context?.places) {
    return syncFlatFromContext(raw)
  }
  // V1 → V1.1
  const context: SessionContext = {
    ...emptyContext(),
    goal: raw.selected || raw.places?.length ? 'outings_plan' : raw.weather ? 'weather_only' : 'idle',
    city: raw.city,
    weather: raw.weather,
    places: raw.places || [],
    placesQuery: raw.placesQuery,
    selected: raw.selected,
    selectedRank: raw.selected?.rank,
    lastTools: raw.lastToolResults || {},
  }
  return syncFlatFromContext({ ...raw, context })
}

export function loadEngineSession(): EngineSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as EngineSession
    if (!s?.id || Date.now() - (s.updatedAt || 0) > TTL_MS) {
      clearEngineSession()
      return null
    }
    return migrateSession(s)
  } catch {
    return null
  }
}

export function saveEngineSession(session: EngineSession): EngineSession {
  const next = syncFlatFromContext({ ...session, updatedAt: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearEngineSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function ensureEngineSession(partial?: Partial<EngineSession>): EngineSession {
  const cur = loadEngineSession()
  if (cur) {
    const context: SessionContext = {
      ...cur.context,
      ...(partial?.context || {}),
      places: partial?.context?.places ?? partial?.places ?? cur.context.places,
      lastTools: partial?.context?.lastTools ?? cur.context.lastTools,
      dateTime: partial?.context?.dateTime ?? cur.context.dateTime,
    }
    // Apply flat overrides into context
    if (partial?.city !== undefined) context.city = partial.city
    if (partial?.weather !== undefined) context.weather = partial.weather
    if (partial?.places !== undefined) context.places = partial.places
    if (partial?.placesQuery !== undefined) context.placesQuery = partial.placesQuery
    if (partial?.selected !== undefined) {
      context.selected = partial.selected
      context.selectedRank = partial.selected?.rank
    }
    return saveEngineSession({
      ...cur,
      ...partial,
      context,
      lastVerified: partial?.lastVerified
        ? { ...cur.lastVerified, ...partial.lastVerified }
        : cur.lastVerified,
    })
  }
  const context: SessionContext = {
    ...emptyContext(),
    ...(partial?.context || {}),
    city: partial?.city ?? partial?.context?.city,
    weather: partial?.weather ?? partial?.context?.weather,
    places: partial?.places ?? partial?.context?.places ?? [],
    placesQuery: partial?.placesQuery,
    selected: partial?.selected,
    selectedRank: partial?.selected?.rank,
  }
  return saveEngineSession({
    id: newId(),
    updatedAt: Date.now(),
    places: context.places,
    context,
    ...partial,
  })
}

export function getSessionContext(session: EngineSession | null): SessionContext {
  return session?.context || emptyContext()
}

/** Test helper */
export function resetEngineSessionForTests(): void {
  clearEngineSession()
}
