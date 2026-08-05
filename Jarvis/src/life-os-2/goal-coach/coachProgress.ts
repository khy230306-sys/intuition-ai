import { loadGoals } from '../../life-os/goals/goalRepository'
import { computeGoalProgress, nextActions } from '../../life-os/goals/goalService'
import type { GoalRecord } from '../../life-os/goals/goalTypes'

export function findGoal(hint?: string): GoalRecord | null {
  const goals = loadGoals()
  if (!hint) return goals.find((g) => g.status === 'active') || goals[0] || null
  const q = hint.toLowerCase()
  return goals.find((g) => g.title.toLowerCase().includes(q)) || null
}

export function progressBasis(goal: GoalRecord): string {
  if (goal.milestones?.length) {
    const done = goal.milestones.filter((m) => m.done).length
    return `마일스톤 ${done}/${goal.milestones.length} 완료`
  }
  return `기록된 progress 필드 ${Math.round((goal.progress || 0) * 100)}% (임의 생성 아님)`
}

export function stallReason(goal: GoalRecord): string | null {
  if (goal.status === 'paused' || goal.status === 'cancelled') {
    return `목표가 ${goal.status} 상태라 재촉하지 않습니다.`
  }
  const p = computeGoalProgress(goal)
  if (goal.status === 'active' && p < 0.3) {
    const updated = Date.parse(goal.updatedAt)
    const days = Number.isFinite(updated) ? Math.floor((Date.now() - updated) / 86_400_000) : 0
    if (days >= 5) return `최근 업데이트로부터 약 ${days}일 — 정체 가능성이 있습니다.`
  }
  return null
}

export { computeGoalProgress, nextActions }
