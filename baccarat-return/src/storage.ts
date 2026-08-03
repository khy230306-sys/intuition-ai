import type { SessionRecord } from './types'

const KEY = 'baccarat_return_sessions_v1'
const PATTERN_KEY = 'baccarat_return_last_pattern_v1'

export function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SessionRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessions(sessions: SessionRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 100)))
}

export function addSession(record: SessionRecord): SessionRecord[] {
  const next = [record, ...loadSessions()].slice(0, 100)
  saveSessions(next)
  return next
}

export function clearSessions(): void {
  localStorage.removeItem(KEY)
}

export function saveLastPattern(pattern: string): void {
  localStorage.setItem(PATTERN_KEY, pattern)
}

export function loadLastPattern(): string {
  return localStorage.getItem(PATTERN_KEY) ?? ''
}
