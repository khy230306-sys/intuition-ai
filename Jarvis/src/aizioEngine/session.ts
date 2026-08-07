import type { EngineSession } from './types'

const KEY = 'aizio_core_engine_session_v1'
const TTL_MS = 45 * 60_000

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `eng_${Date.now().toString(36)}`
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
    return s
  } catch {
    return null
  }
}

export function saveEngineSession(session: EngineSession): EngineSession {
  const next = { ...session, updatedAt: Date.now() }
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
    return saveEngineSession({ ...cur, ...partial, places: partial?.places ?? cur.places })
  }
  return saveEngineSession({
    id: newId(),
    updatedAt: Date.now(),
    places: [],
    ...partial,
  })
}

/** Test helper */
export function resetEngineSessionForTests(): void {
  clearEngineSession()
}
