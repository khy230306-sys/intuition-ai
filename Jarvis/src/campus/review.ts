/**
 * Smart Review — deterministic priority scoring + optional AI explanation.
 */

import { dDay } from './id'
import { conceptStats } from './quiz'
import { loadCampusStore } from './storage'

export type ReviewItem = {
  id: string
  courseId: string
  courseName: string
  title: string
  minutes: number
  score: number
  reasons: string[]
}

function daysSince(iso: string | null | undefined, now = new Date()): number {
  if (!iso) return 999
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 999
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000))
}

export function buildSmartReview(limit = 5, now = new Date()): ReviewItem[] {
  const store = loadCampusStore()
  const items: ReviewItem[] = []

  for (const course of store.courses) {
    const exam = store.exams
      .filter((e) => e.courseId === course.id && e.confirmed && e.at)
      .map((e) => ({ e, d: dDay(e.at, now) }))
      .filter((x) => x.d !== null && (x.d as number) >= 0)
      .sort((a, b) => (a.d as number) - (b.d as number))[0]

    const stats = conceptStats(course.id)
    const weak = stats.filter((s) => s.total >= 1 && s.rate < 70).slice(0, 3)
    const lastStudy = store.studySessions.find((s) => s.courseId === course.id)
    const lastQuiz = store.attempts.find((a) => a.courseId === course.id)
    const lastLearnDays = Math.min(
      daysSince(lastStudy?.endedAt, now),
      daysSince(lastQuiz?.createdAt, now),
    )

    let score = 0
    const reasons: string[] = []

    if (exam) {
      const dd = exam.d as number
      score += Math.max(0, 40 - dd * 2)
      reasons.push(`${exam.e.name} D-${dd}`)
    }
    if (lastLearnDays >= 3) {
      score += Math.min(25, lastLearnDays * 3)
      reasons.push(`${lastLearnDays}일 전 학습`)
    }
    if (weak.length) {
      const avg = weak.reduce((a, b) => a + b.rate, 0) / weak.length
      score += Math.round((100 - avg) / 4)
      reasons.push(`약점: ${weak.map((w) => w.concept).join(', ')}`)
    }
    const openAsg = store.assignments.filter(
      (a) => a.courseId === course.id && a.confirmed && a.status !== 'DONE',
    )
    if (openAsg.length) {
      score += 8
      reasons.push(`과제 ${openAsg.length}개`)
    }

    if (score <= 0 && !store.materials.some((m) => m.courseId === course.id)) continue

    const focusConcept = weak[0]?.concept
    const title = focusConcept
      ? `${focusConcept}`
      : exam
        ? `${exam.e.name} 범위 복습`
        : `${course.name} 복습`
    const minutes = focusConcept ? 15 : exam && (exam.d as number) <= 7 ? 25 : 20

    items.push({
      id: `rev_${course.id}`,
      courseId: course.id,
      courseName: course.name,
      title,
      minutes,
      score,
      reasons,
    })
  }

  return items.sort((a, b) => b.score - a.score).slice(0, limit)
}
