import { campusId, nowIso } from './id'
import { conceptStats } from './quiz'
import { loadCampusStore, updateCampusStore } from './storage'
import type { StudyPlan, StudyPlanBlock, StudyPlanBlockStatus } from './types'

/** Deterministic study plan skeleton from exam + weakness. */
export function buildDeterministicStudyPlan(input: {
  courseId: string
  examId?: string
  days: number
}): StudyPlan {
  const store = loadCampusStore()
  const course = store.courses.find((c) => c.id === input.courseId)
  if (!course) throw new Error('과목을 찾을 수 없습니다.')
  const exam =
    (input.examId && store.exams.find((e) => e.id === input.examId)) ||
    store.exams.find((e) => e.courseId === input.courseId && e.confirmed)
  const days = Math.max(1, Math.min(30, Math.round(input.days)))
  const weak = conceptStats(input.courseId).filter((c) => c.total > 0)
  const topics =
    weak.length > 0
      ? weak.map((w) => w.concept)
      : exam?.scope
        ? exam.scope.split(/[,/·\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 8)
        : [`${course.name} 핵심`, `${course.name} 문제풀이`, `${course.name} 오답`]

  const blocks: StudyPlanBlock[] = []
  for (let d = 0; d < days; d++) {
    const topic = topics[d % topics.length]
    blocks.push({
      id: campusId('blk'),
      title: topic,
      courseId: course.id,
      minutes: d === days - 1 ? 40 : 25,
      status: 'pending',
      dayOffset: d,
    })
    if (d % 2 === 1) {
      blocks.push({
        id: campusId('blk'),
        title: `${topic} 퀴즈`,
        courseId: course.id,
        minutes: 15,
        status: 'pending',
        dayOffset: d,
      })
    }
  }

  const plan: StudyPlan = {
    id: campusId('pln'),
    courseId: course.id,
    examId: exam?.id || '',
    title: `${course.name} ${days}일 계획`,
    days,
    blocks,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  updateCampusStore((s) => {
    s.studyPlans.unshift(plan)
  })
  return plan
}

export function setStudyPlanBlockStatus(
  planId: string,
  blockId: string,
  status: StudyPlanBlockStatus,
): StudyPlan | null {
  let out: StudyPlan | null = null
  updateCampusStore((s) => {
    const p = s.studyPlans.find((x) => x.id === planId)
    if (!p) return
    const b = p.blocks.find((x) => x.id === blockId)
    if (!b) return
    b.status = status
    p.updatedAt = nowIso()
    out = p
  })
  return out
}

export function formatStudyPlan(plan: StudyPlan): string {
  const lines = [`【${plan.title}】`, `기간: ${plan.days}일`]
  for (let d = 0; d < plan.days; d++) {
    const dayBlocks = plan.blocks.filter((b) => b.dayOffset === d)
    if (!dayBlocks.length) continue
    lines.push(`D${d + 1}`)
    for (const b of dayBlocks) {
      const mark = b.status === 'done' ? '✓' : b.status === 'deferred' ? '→' : '·'
      lines.push(`  ${mark} ${b.title} (${b.minutes}분)`)
    }
  }
  return lines.join('\n')
}
