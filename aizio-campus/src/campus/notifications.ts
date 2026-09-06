/**
 * Campus notifications via local alarm scheduler.
 * Schedules absolute fire times from due dates (not only "today == D-3").
 * Never claims success unless scheduleAlarm actually runs and permission allows showing.
 */

import { getNotificationPermission, scheduleAlarm } from '../notify'
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
  return Boolean(loadTrack()[key])
}

function mark(key: string): void {
  const t = loadTrack()
  t[key] = Date.now()
  const cutoff = Date.now() - 60 * 86_400_000
  for (const k of Object.keys(t)) {
    if (t[k] < cutoff) delete t[k]
  }
  saveTrack(t)
}

/** Fire at local 09:00 on (targetDate - daysBefore). */
function remindAt(targetIso: string, daysBefore: number, hour = 9): number | null {
  const t = new Date(targetIso)
  if (Number.isNaN(t.getTime())) return null
  const day = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  day.setDate(day.getDate() - daysBefore)
  day.setHours(hour, 0, 0, 0)
  return day.getTime()
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

export type NotifySyncResult = {
  armed: number
  skipped: number
  permission: NotificationPermission | 'unsupported'
  willShow: boolean
}

export function notifyFlashSummary(r: NotifySyncResult): string {
  const base = `알림 예약 ${r.armed} · 스킵 ${r.skipped}`
  if (r.willShow) return base
  if (r.permission === 'unsupported') return `${base} · 이 브라우저는 알림을 지원하지 않습니다`
  if (r.permission === 'denied') return `${base} · 알림 권한이 거부됨 (표시 안 됨)`
  return `${base} · 알림 권한 필요 (아직 표시되지 않을 수 있음)`
}

/** Scan campus data and arm due notifications (idempotent). */
export function syncCampusNotifications(now = new Date()): NotifySyncResult {
  const store = loadCampusStore()
  const p = store.profile
  let armed = 0
  let skipped = 0
  const permission = getNotificationPermission()
  const willShow = permission === 'granted'

  for (const a of store.assignments) {
    if (!a.confirmed || !a.dueAt || a.status === 'DONE') continue
    const course = store.courses.find((c) => c.id === a.courseId)?.name || '과제'
    if (p.notifyAssignmentD3) {
      const when = remindAt(a.dueAt, 3)
      if (when && fireOnce(`asg_d3_${a.id}`, '과제 D-3', `${course}: ${a.title}`, when)) armed++
      else skipped++
    }
    if (p.notifyAssignmentD1) {
      const when = remindAt(a.dueAt, 1)
      if (when && fireOnce(`asg_d1_${a.id}`, '과제 D-1', `${course}: ${a.title}`, when)) armed++
      else skipped++
    }
  }

  for (const e of store.exams) {
    if (!e.confirmed || !e.at) continue
    const course = store.courses.find((c) => c.id === e.courseId)?.name || '시험'
    if (p.notifyExamD7) {
      const when = remindAt(e.at, 7)
      if (when && fireOnce(`exm_d7_${e.id}`, '시험 D-7', `${course}: ${e.name}`, when)) armed++
      else skipped++
    }
    if (p.notifyExamD1) {
      const when = remindAt(e.at, 1)
      if (when && fireOnce(`exm_d1_${e.id}`, '시험 D-1', `${course}: ${e.name}`, when)) armed++
      else skipped++
    }
  }

  if (p.notifyClassStart) {
    // Arm for next 7 days of sessions
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(now)
      day.setDate(day.getDate() + offset)
      const wd = day.getDay()
      for (const s of store.sessions.filter((x) => x.weekday === wd)) {
        const [hh, mm] = s.startTime.split(':').map(Number)
        const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, 0, 0)
        const whenAt = when.getTime() - 10 * 60_000
        const course = store.courses.find((c) => c.id === s.courseId)?.name || '수업'
        const key = `class_${s.id}_${when.toISOString().slice(0, 10)}`
        if (fireOnce(key, '수업 시작', `${course} ${s.startTime}`, whenAt)) armed++
        else skipped++
      }
    }
  }

  return { armed, skipped, permission, willShow }
}
