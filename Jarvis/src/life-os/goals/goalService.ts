import { appendAudit } from '../auditLog'
import { emitLifeEvent } from '../lifeEventBus'
import { addTimelineEvent } from '../timeline/timelineService'
import { lifeId, nowIso } from '../types'
import { loadGoals, saveGoals } from './goalRepository'
import type { GoalMilestone, GoalRecord, GoalStatus } from './goalTypes'

export function computeGoalProgress(goal: GoalRecord): number {
  if (goal.status === 'completed') return 1
  if (!goal.milestones.length) return goal.progress || 0
  const done = goal.milestones.filter((m) => m.done).length
  return Math.round((done / goal.milestones.length) * 100) / 100
}

export function createGoal(title: string, opts?: Partial<GoalRecord>): GoalRecord {
  const now = nowIso()
  const goal: GoalRecord = {
    id: lifeId('goal'),
    title: title.trim().slice(0, 120) || '새 목표',
    description: opts?.description || '',
    category: opts?.category || 'personal',
    status: 'active',
    priority: opts?.priority || 'medium',
    targetDate: opts?.targetDate ?? null,
    progress: 0,
    milestones: opts?.milestones || [],
    relatedProjectIds: opts?.relatedProjectIds || [],
    notes: [],
    createdFrom: 'conversation',
    createdAt: now,
    updatedAt: now,
  }
  const items = loadGoals()
  items.unshift(goal)
  saveGoals(items)
  emitLifeEvent('goal.changed', { id: goal.id })
  appendAudit('goal.create', goal.title)
  addTimelineEvent({
    type: 'goal',
    title: `목표 생성: ${goal.title}`,
    summary: goal.description || goal.title,
    sourceId: goal.id,
    sourceType: 'goal',
    importance: 0.7,
  })
  return goal
}

export function planMilestones(goalId: string, titles: string[]): GoalRecord | null {
  const items = loadGoals()
  const g = items.find((x) => x.id === goalId)
  if (!g) return null
  const now = nowIso()
  const ms: GoalMilestone[] = titles.slice(0, 12).map((t) => ({
    id: lifeId('ms'),
    title: t.slice(0, 100),
    done: false,
    createdAt: now,
    completedAt: null,
  }))
  g.milestones = ms
  g.progress = computeGoalProgress(g)
  g.updatedAt = now
  saveGoals(items)
  emitLifeEvent('goal.changed', { id: g.id })
  return g
}

/** Simple Korean heuristic plan when user asks to break down a goal. */
export function autoPlanGoal(goal: GoalRecord): string[] {
  const base = goal.title
  return [
    `${base} — 범위·성공 기준 정의`,
    `${base} — 핵심 기능/단계 목록`,
    `${base} — 첫 실행 가능한 한 가지`,
    `${base} — 중간 점검`,
    `${base} — 완료 확인`,
  ]
}

export function updateGoalStatus(goalId: string, status: GoalStatus): GoalRecord | null {
  const items = loadGoals()
  const g = items.find((x) => x.id === goalId)
  if (!g) return null
  g.status = status
  if (status === 'completed') {
    g.progress = 1
    g.milestones = g.milestones.map((m) =>
      m.done ? m : { ...m, done: true, completedAt: nowIso() },
    )
  }
  g.progress = computeGoalProgress(g)
  g.updatedAt = nowIso()
  saveGoals(items)
  emitLifeEvent('goal.changed', { id: g.id, status })
  if (status === 'completed') {
    addTimelineEvent({
      type: 'goal',
      title: `목표 완료: ${g.title}`,
      summary: g.title,
      sourceId: g.id,
      sourceType: 'goal',
      importance: 0.85,
    })
  }
  return g
}

export function completeMilestone(goalId: string, milestoneId: string): GoalRecord | null {
  const items = loadGoals()
  const g = items.find((x) => x.id === goalId)
  if (!g) return null
  const m = g.milestones.find((x) => x.id === milestoneId)
  if (!m) return null
  m.done = true
  m.completedAt = nowIso()
  g.progress = computeGoalProgress(g)
  g.updatedAt = nowIso()
  saveGoals(items)
  return g
}

export function nextActions(limit = 5): string[] {
  return loadGoals()
    .filter((g) => g.status === 'active')
    .flatMap((g) => {
      const next = g.milestones.find((m) => !m.done)
      return next ? [`[${g.title}] ${next.title}`] : g.progress < 1 ? [`[${g.title}] 다음 단계 정의하기`] : []
    })
    .slice(0, limit)
}

export function formatGoals(): string {
  const items = loadGoals()
  if (!items.length) return '등록된 목표가 없습니다. 「내 목표는 …」처럼 말해 주세요.'
  return [
    '【목표】',
    ...items.slice(0, 15).map((g) => {
      const pct = Math.round(computeGoalProgress(g) * 100)
      return `• ${g.title} · ${g.status} · ${pct}%`
    }),
  ].join('\n')
}

export function findGoalByTitleHint(hint: string): GoalRecord | null {
  const q = hint.trim().toLowerCase()
  if (!q) return loadGoals().find((g) => g.status === 'active') || null
  return (
    loadGoals().find((g) => g.title.toLowerCase().includes(q) || q.includes(g.title.toLowerCase())) ||
    null
  )
}
