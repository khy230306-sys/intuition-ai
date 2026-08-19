import { campusId, nowIso } from './id'
import { loadCampusStore, updateCampusStore } from './storage'
import type { StudySession } from './types'

export function logStudySession(input: {
  courseId: string
  minutes: number
  mode: StudySession['mode']
  startedAt?: string
  endedAt?: string
}): StudySession {
  const endedAt = input.endedAt || nowIso()
  const startedAt =
    input.startedAt ||
    new Date(Date.parse(endedAt) - Math.max(1, input.minutes) * 60_000).toISOString()
  const item: StudySession = {
    id: campusId('std'),
    courseId: input.courseId,
    minutes: Math.max(1, Math.round(input.minutes)),
    mode: input.mode,
    startedAt,
    endedAt,
  }
  updateCampusStore((s) => {
    s.studySessions.unshift(item)
    s.studySessions = s.studySessions.slice(0, 500)
  })
  return item
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function focusStats(now = new Date()) {
  const store = loadCampusStore()
  const day0 = startOfDay(now)
  const week0 = day0 - now.getDay() * 86_400_000
  let today = 0
  let week = 0
  const byCourse = new Map<string, number>()
  for (const s of store.studySessions) {
    const t = Date.parse(s.endedAt)
    if (Number.isNaN(t)) continue
    if (t >= day0) today += s.minutes
    if (t >= week0) week += s.minutes
    byCourse.set(s.courseId, (byCourse.get(s.courseId) || 0) + s.minutes)
  }
  const courseRows = [...byCourse.entries()]
    .map(([courseId, minutes]) => ({
      courseId,
      name: store.courses.find((c) => c.id === courseId)?.name || '과목',
      minutes,
    }))
    .sort((a, b) => b.minutes - a.minutes)
  return { today, week, byCourse: courseRows }
}
