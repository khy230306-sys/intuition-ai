/**
 * Campus notifications via existing local alarm scheduler.
 * Never claims success unless scheduleAlarm actually runs.
 */

import { scheduleAlarm } from '../notify'
import { dDay } from './id'
import { loadCampusStore } from './storage'

const TRACK_KEY = 'aizio_campus_notify_track_v1'

type Track = Record<string, number>

function loadTrack(): Track {
  try {
    return JSON.parse(localStorage.getItem(TRACK_KEY) || '{}') as Track
  } catch {
    return {}
  }
}

function saveTrack(t: Track): void {
  localStorage.setItem(TRACK_KEY, JSON.stringify(t))
}

function already(key: string): boolean {
  const t = loadTrack()
  return Boolean(t[key])
}

function mark(key: string): void {
  const t = loadTrack()
  t[key] = Date.now()
  // prune old
  const cutoff = Date.now() - 60 * 86_400_000
  for (const k of Object.keys(t)) {
    if (t[k] < cutoff) delete t[k]
  }
  saveTrack(t)
}

function fireOnce(key: string, title: string, body: string, whenAt: number): boolean {
  if (already(key)) return false
  if (whenAt <= Date.now()) return false
  try {
    scheduleAlarm(title, body, whenAt)
    mark(key)
    return true
  } catch {
    return false
  }
}

/** Scan campus data and arm due notifications (idempotent). */
export function syncCampusNotifications(now = new Date()): { armed: number; skipped: number } {
  const store = loadCampusStore()
  const p = store.profile
  let armed = 0
  let skipped = 0

  for (const a of store.assignments) {
    if (!a.confirmed || !a.dueAt || a.status === 'DONE') continue
    const dd = dDay(a.dueAt, now)
    if (dd === null) continue
    const course = store.courses.find((c) => c.id === a.courseId)?.name || '과제'
    if (p.notifyAssignmentD3 && dd === 3) {
      const when = Date.now() + 3_000
      if (fireOnce(`asg_d3_${a.id}`, '과제 D-3', `${course}: ${a.title}`, when)) armed++
      else skipped++
    }
    if (p.notifyAssignmentD1 && dd === 1) {
      const when = Date.now() + 3_000
      if (fireOnce(`asg_d1_${a.id}`, '과제 D-1', `${course}: ${a.title}`, when)) armed++
      else skipped++
    }
  }

  for (const e of store.exams) {
    if (!e.confirmed || !e.at) continue
    const dd = dDay(e.at, now)
    if (dd === null) continue
    const course = store.courses.find((c) => c.id === e.courseId)?.name || '시험'
    if (p.notifyExamD7 && dd === 7) {
      if (fireOnce(`exm_d7_${e.id}`, '시험 D-7', `${course}: ${e.name}`, Date.now() + 3_000))
        armed++
      else skipped++
    }
    if (p.notifyExamD1 && dd === 1) {
      if (fireOnce(`exm_d1_${e.id}`, '시험 D-1', `${course}: ${e.name}`, Date.now() + 3_000))
        armed++
      else skipped++
    }
  }

  if (p.notifyClassStart) {
    const wd = now.getDay()
    for (const s of store.sessions.filter((x) => x.weekday === wd)) {
      const [hh, mm] = s.startTime.split(':').map(Number)
      const when = new Date(now)
      when.setHours(hh, mm, 0, 0)
      const whenAt = when.getTime() - 10 * 60_000
      const course = store.courses.find((c) => c.id === s.courseId)?.name || '수업'
      const key = `class_${s.id}_${when.toISOString().slice(0, 10)}`
      if (fireOnce(key, '수업 시작', `${course} ${s.startTime}`, whenAt)) armed++
      else skipped++
    }
  }

  return { armed, skipped }
}
