import { campusId, dDay, nowIso } from './id'
import { loadCampusStore, updateCampusStore } from './storage'
import type { Exam } from './types'

export function createExam(input: {
  courseId: string
  name: string
  at?: string | null
  durationMinutes?: number
  scope?: string
  place?: string
  memo?: string
  source?: 'user' | 'ai_candidate'
  confirmed?: boolean
}): Exam {
  const now = nowIso()
  const item: Exam = {
    id: campusId('exm'),
    courseId: input.courseId,
    name: input.name.trim().slice(0, 80),
    at: input.at || null,
    durationMinutes: input.durationMinutes || 0,
    scope: (input.scope || '').trim().slice(0, 1000),
    place: (input.place || '').trim().slice(0, 80),
    memo: (input.memo || '').trim().slice(0, 1000),
    source: input.source || 'user',
    confirmed: input.confirmed !== false,
    createdAt: now,
    updatedAt: now,
  }
  updateCampusStore((s) => {
    s.exams.unshift(item)
  })
  return item
}

export function updateExam(
  id: string,
  patch: Partial<
    Pick<Exam, 'name' | 'at' | 'durationMinutes' | 'scope' | 'place' | 'memo' | 'confirmed'>
  >,
): Exam | null {
  let out: Exam | null = null
  updateCampusStore((s) => {
    const idx = s.exams.findIndex((e) => e.id === id)
    if (idx < 0) return
    s.exams[idx] = { ...s.exams[idx], ...patch, updatedAt: nowIso() }
    out = s.exams[idx]
  })
  return out
}

export function deleteExam(id: string): boolean {
  let ok = false
  updateCampusStore((s) => {
    const before = s.exams.length
    s.exams = s.exams.filter((e) => e.id !== id)
    ok = s.exams.length < before
  })
  return ok
}

export function upcomingExams(limit = 20) {
  const store = loadCampusStore()
  return store.exams
    .filter((e) => e.confirmed)
    .map((e) => ({
      exam: e,
      course: store.courses.find((c) => c.id === e.courseId) || null,
      dDay: dDay(e.at),
    }))
    .filter((x) => x.dDay === null || x.dDay >= 0)
    .sort((a, b) => (a.dDay ?? 9999) - (b.dDay ?? 9999))
    .slice(0, limit)
}
