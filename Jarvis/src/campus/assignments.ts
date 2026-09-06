import { campusId, dDay, nowIso } from './id'
import { loadCampusStore, updateCampusStore } from './storage'
import type { Assignment, AssignmentPriority, AssignmentStatus } from './types'

export function createAssignment(input: {
  courseId: string
  title: string
  description?: string
  dueAt?: string | null
  priority?: AssignmentPriority
  memo?: string
  source?: 'user' | 'ai_candidate'
  confirmed?: boolean
}): Assignment {
  const now = nowIso()
  const item: Assignment = {
    id: campusId('asg'),
    courseId: input.courseId,
    title: input.title.trim().slice(0, 120),
    description: (input.description || '').trim().slice(0, 2000),
    dueAt: input.dueAt || null,
    priority: input.priority || 'medium',
    status: 'TODO',
    memo: (input.memo || '').trim().slice(0, 1000),
    attachmentNames: [],
    source: input.source || 'user',
    confirmed: input.confirmed !== false,
    createdAt: now,
    updatedAt: now,
  }
  updateCampusStore((s) => {
    s.assignments.unshift(item)
  })
  return item
}

export function updateAssignment(
  id: string,
  patch: Partial<
    Pick<
      Assignment,
      'title' | 'description' | 'dueAt' | 'priority' | 'status' | 'memo' | 'confirmed'
    >
  >,
): Assignment | null {
  let out: Assignment | null = null
  updateCampusStore((s) => {
    const idx = s.assignments.findIndex((a) => a.id === id)
    if (idx < 0) return
    s.assignments[idx] = { ...s.assignments[idx], ...patch, updatedAt: nowIso() }
    out = s.assignments[idx]
  })
  return out
}

export function deleteAssignment(id: string): boolean {
  let ok = false
  updateCampusStore((s) => {
    const before = s.assignments.length
    s.assignments = s.assignments.filter((a) => a.id !== id)
    ok = s.assignments.length < before
  })
  return ok
}

export function setAssignmentStatus(id: string, status: AssignmentStatus): Assignment | null {
  return updateAssignment(id, { status })
}

export function upcomingAssignments(limit = 20) {
  const store = loadCampusStore()
  return store.assignments
    .filter((a) => a.confirmed && a.status !== 'DONE')
    .map((a) => ({
      assignment: a,
      course: store.courses.find((c) => c.id === a.courseId) || null,
      dDay: dDay(a.dueAt),
    }))
    .sort((a, b) => {
      const da = a.dDay ?? 9999
      const db = b.dDay ?? 9999
      return da - db
    })
    .slice(0, limit)
}

export function thisWeekAssignments(now = new Date()) {
  const end = new Date(now)
  end.setDate(end.getDate() + (7 - end.getDay()))
  end.setHours(23, 59, 59, 999)
  return upcomingAssignments(50).filter((x) => {
    if (x.dDay === null) return true
    return x.dDay >= 0 && x.dDay <= 7
  })
}
