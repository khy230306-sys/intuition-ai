import type { GoalRecord } from '../../life-os/goals/goalTypes'
import { computeGoalProgress, nextActions, progressBasis, stallReason } from './coachProgress'
import type { CoachAdvice } from './coachTypes'

export function buildCoachAdvice(goal: GoalRecord): CoachAdvice {
  const progress = computeGoalProgress(goal)
  const actions = nextActions(5).slice(0, 3)
  // Prefer goal-specific next actions from milestones
  const fromMs = (goal.milestones || [])
    .filter((m) => !m.done)
    .slice(0, 3)
    .map((m) => m.title)
  const next = (fromMs.length ? fromMs : actions).slice(0, 3)
  const stall = stallReason(goal)
  const warnings: string[] = []
  if (next.length >= 3) warnings.push('한 번에 너무 많은 계획을 잡지 마세요. 다음 한 가지부터.')
  if (goal.status === 'paused') warnings.push('일시중지된 목표입니다 — 재촉하지 않습니다.')

  const weekPlan =
    goal.status === 'paused' || goal.status === 'cancelled'
      ? []
      : next.map((a, i) => `${i + 1}일차 후보: ${a}`)

  return {
    goalTitle: goal.title,
    status: goal.status,
    progress,
    progressBasis: progressBasis(goal),
    nextActions: next,
    stallReason: stall,
    weekPlan,
    warnings,
  }
}

export function formatCoachAdvice(a: CoachAdvice): string {
  const lines = [
    `【Goal Coach · ${a.goalTitle}】`,
    `상태: ${a.status} · 진행률 ${Math.round(a.progress * 100)}%`,
    `근거: ${a.progressBasis}`,
  ]
  if (a.nextActions.length) {
    lines.push(`다음 한 가지: ${a.nextActions[0]}`)
    if (a.nextActions.length > 1) {
      lines.push('추가 후보:')
      lines.push(...a.nextActions.slice(1).map((x) => `• ${x}`))
    }
  } else {
    lines.push('다음 행동: (없음)')
  }
  if (a.stallReason) lines.push(`정체 신호: ${a.stallReason}`)
  if (a.weekPlan.length) {
    lines.push('이번 주 계획 후보:')
    lines.push(...a.weekPlan.map((w) => `• ${w}`))
  }
  if (a.warnings.length) lines.push(...a.warnings.map((w) => `주의: ${w}`))
  return lines.join('\n')
}
