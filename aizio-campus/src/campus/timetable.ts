import { campusId, nowIso, timeToMinutes } from './id'
import { loadCampusStore, updateCampusStore } from './storage'
import type { ClassSession, Course, Weekday } from './types'

export type SessionConflict = {
  a: ClassSession
  b: ClassSession
  courseA: string
  courseB: string
}

export function sessionsOverlap(a: ClassSession, b: ClassSession): boolean {
  if (a.weekday !== b.weekday) return false
  const a0 = timeToMinutes(a.startTime)
  const a1 = timeToMinutes(a.endTime)
  const b0 = timeToMinutes(b.startTime)
  const b1 = timeToMinutes(b.endTime)
  if ([a0, a1, b0, b1].some((n) => Number.isNaN(n))) return false
  return a0 < b1 && b0 < a1
}

export function findConflicts(sessions: ClassSession[], courses: Course[]): SessionConflict[] {
  const name = (id: string) => courses.find((c) => c.id === id)?.name || '과목'
  const out: SessionConflict[] = []
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (sessionsOverlap(sessions[i], sessions[j])) {
        out.push({
          a: sessions[i],
          b: sessions[j],
          courseA: name(sessions[i].courseId),
          courseB: name(sessions[j].courseId),
        })
      }
    }
  }
  return out
}

export function addClassSession(input: {
  courseId: string
  weekday: Weekday
  startTime: string
  endTime: string
  room?: string
}): { session: ClassSession; conflicts: SessionConflict[] } {
  const now = nowIso()
  const session: ClassSession = {
    id: campusId('ses'),
    courseId: input.courseId,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room || '',
    createdAt: now,
    updatedAt: now,
  }
  let conflicts: SessionConflict[] = []
  updateCampusStore((s) => {
    s.sessions.push(session)
    conflicts = findConflicts(s.sessions, s.courses)
  })
  return { session, conflicts }
}

export function updateClassSession(
  id: string,
  patch: Partial<Pick<ClassSession, 'weekday' | 'startTime' | 'endTime' | 'room' | 'courseId'>>,
): { session: ClassSession | null; conflicts: SessionConflict[] } {
  let session: ClassSession | null = null
  let conflicts: SessionConflict[] = []
  updateCampusStore((s) => {
    const idx = s.sessions.findIndex((x) => x.id === id)
    if (idx < 0) return
    s.sessions[idx] = { ...s.sessions[idx], ...patch, updatedAt: nowIso() }
    session = s.sessions[idx]
    conflicts = findConflicts(s.sessions, s.courses)
  })
  return { session, conflicts }
}

export function deleteClassSession(id: string): boolean {
  let ok = false
  updateCampusStore((s) => {
    const before = s.sessions.length
    s.sessions = s.sessions.filter((x) => x.id !== id)
    ok = s.sessions.length < before
  })
  return ok
}

export function todaySessions(now = new Date()) {
  const store = loadCampusStore()
  const wd = now.getDay() as Weekday
  return store.sessions
    .filter((s) => s.weekday === wd)
    .map((s) => ({
      session: s,
      course: store.courses.find((c) => c.id === s.courseId) || null,
    }))
    .filter((x) => x.course)
    .sort((a, b) => timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime))
}

export function weekSessions() {
  const store = loadCampusStore()
  return store.sessions
    .map((s) => ({
      session: s,
      course: store.courses.find((c) => c.id === s.courseId) || null,
    }))
    .filter((x) => x.course)
    .sort(
      (a, b) =>
        a.session.weekday - b.session.weekday ||
        timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime),
    )
}
