import { loadCampusStore } from './storage'
import { wrongQuestionsForCourse } from './quiz'

export type CampusSearchHit = {
  kind: 'course' | 'note' | 'assignment' | 'exam' | 'material' | 'quiz_wrong'
  id: string
  title: string
  subtitle: string
  courseId?: string
}

export function searchCampus(query: string, limit = 30): CampusSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const store = loadCampusStore()
  const hits: CampusSearchHit[] = []
  const courseName = (id: string) => store.courses.find((c) => c.id === id)?.name || ''

  for (const c of store.courses) {
    if (c.name.toLowerCase().includes(q) || c.professor.toLowerCase().includes(q)) {
      hits.push({
        kind: 'course',
        id: c.id,
        title: c.name,
        subtitle: c.professor || '과목',
        courseId: c.id,
      })
    }
  }
  for (const m of store.materials) {
    if (
      m.name.toLowerCase().includes(q) ||
      m.textExtract.toLowerCase().includes(q)
    ) {
      hits.push({
        kind: 'material',
        id: m.id,
        title: m.name,
        subtitle: `${courseName(m.courseId)} 강의자료`,
        courseId: m.courseId,
      })
    }
  }
  for (const n of store.notes) {
    const blob = [n.title, n.threeLine, n.fullSummary, ...n.concepts].join(' ').toLowerCase()
    if (blob.includes(q)) {
      hits.push({
        kind: 'note',
        id: n.id,
        title: n.title || '강의 노트',
        subtitle: `${courseName(n.courseId)} 요약`,
        courseId: n.courseId,
      })
    }
  }
  for (const a of store.assignments) {
    if (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    ) {
      hits.push({
        kind: 'assignment',
        id: a.id,
        title: a.title,
        subtitle: `${courseName(a.courseId)} 과제`,
        courseId: a.courseId,
      })
    }
  }
  for (const e of store.exams) {
    if (e.name.toLowerCase().includes(q) || e.scope.toLowerCase().includes(q)) {
      hits.push({
        kind: 'exam',
        id: e.id,
        title: e.name,
        subtitle: `${courseName(e.courseId)} 시험`,
        courseId: e.courseId,
      })
    }
  }
  for (const c of store.courses) {
    for (const wq of wrongQuestionsForCourse(c.id)) {
      if (wq.prompt.toLowerCase().includes(q) || wq.concepts.some((x) => x.toLowerCase().includes(q))) {
        hits.push({
          kind: 'quiz_wrong',
          id: wq.id,
          title: wq.prompt.slice(0, 80),
          subtitle: `${c.name} Quiz 오답`,
          courseId: c.id,
        })
      }
    }
  }
  return hits.slice(0, limit)
}
