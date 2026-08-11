import { campusId, nowIso } from './id'
import { loadCampusStore, updateCampusStore } from './storage'
import { COURSE_COLORS, type Course, type LetterGrade, type Semester } from './types'

export function ensureActiveSemester(opts?: {
  year?: number
  term?: 1 | 2 | 'summer' | 'winter'
  label?: string
}): Semester {
  const store = loadCampusStore()
  const active = store.semesters.find((s) => s.active)
  if (active && !opts?.year && !opts?.term) return active

  const year = opts?.year ?? new Date().getFullYear()
  const month = new Date().getMonth() + 1
  const term = opts?.term ?? (month >= 8 || month <= 1 ? 2 : 1)
  const label = opts?.label || `${year}년 ${term === 1 ? '1' : term === 2 ? '2' : term}학기`
  const now = nowIso()

  let created: Semester | null = null
  updateCampusStore((s) => {
    const existing = s.semesters.find(
      (x) => x.year === year && x.term === term,
    )
    if (existing) {
      for (const x of s.semesters) x.active = x.id === existing.id
      existing.active = true
      existing.updatedAt = now
      created = existing
      return
    }
    const sem: Semester = {
      id: campusId('sem'),
      year,
      term,
      label,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    for (const x of s.semesters) x.active = false
    s.semesters.unshift(sem)
    created = sem
  })
  return created!
}

export function getActiveSemester(): Semester | null {
  return loadCampusStore().semesters.find((s) => s.active) || null
}

export function createCourse(input: {
  name: string
  professor?: string
  room?: string
  color?: string
  credits?: number
  memo?: string
  semesterId?: string
}): Course {
  const sem = input.semesterId
    ? loadCampusStore().semesters.find((s) => s.id === input.semesterId)
    : ensureActiveSemester()
  if (!sem) throw new Error('학기가 없습니다.')
  const store = loadCampusStore()
  const color =
    input.color || COURSE_COLORS[store.courses.length % COURSE_COLORS.length]
  const now = nowIso()
  const course: Course = {
    id: campusId('crs'),
    semesterId: sem.id,
    name: input.name.trim().slice(0, 80),
    professor: (input.professor || '').trim().slice(0, 60),
    room: (input.room || '').trim().slice(0, 40),
    color,
    credits: Number(input.credits) || 0,
    memo: (input.memo || '').trim().slice(0, 500),
    grade: '',
    createdAt: now,
    updatedAt: now,
  }
  updateCampusStore((s) => {
    s.courses.unshift(course)
  })
  return course
}

export function updateCourse(
  id: string,
  patch: Partial<
    Pick<Course, 'name' | 'professor' | 'room' | 'color' | 'credits' | 'memo' | 'grade'>
  >,
): Course | null {
  let out: Course | null = null
  updateCampusStore((s) => {
    const idx = s.courses.findIndex((c) => c.id === id)
    if (idx < 0) return
    const next = { ...s.courses[idx], ...patch, updatedAt: nowIso() }
    if (patch.grade !== undefined) next.grade = patch.grade as LetterGrade | ''
    if (patch.credits !== undefined) next.credits = Number(patch.credits) || 0
    if (patch.name) next.name = patch.name.trim().slice(0, 80)
    s.courses[idx] = next
    out = next
  })
  return out
}

export function deleteCourse(id: string): boolean {
  let ok = false
  updateCampusStore((s) => {
    const before = s.courses.length
    s.courses = s.courses.filter((c) => c.id !== id)
    s.sessions = s.sessions.filter((x) => x.courseId !== id)
    s.materials = s.materials.filter((x) => x.courseId !== id)
    s.assignments = s.assignments.filter((x) => x.courseId !== id)
    s.exams = s.exams.filter((x) => x.courseId !== id)
    ok = s.courses.length < before
  })
  return ok
}

export function findCourseByName(hint: string): Course | null {
  const q = hint.trim().toLowerCase()
  if (!q) return null
  const courses = loadCampusStore().courses
  return (
    courses.find((c) => c.name.toLowerCase() === q) ||
    courses.find((c) => c.name.toLowerCase().includes(q)) ||
    null
  )
}

export function listCourses(semesterId?: string): Course[] {
  const store = loadCampusStore()
  const sid = semesterId || store.semesters.find((s) => s.active)?.id
  if (!sid) return store.courses
  return store.courses.filter((c) => c.semesterId === sid)
}
