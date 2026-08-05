import type { FusedContext } from '../context-fusion/contextTypes'
import type { Prediction } from './predictionTypes'

/** Pure rules — no invented travel times. */
export function ruleStalledProjects(ctx: FusedContext): Omit<Prediction, 'id' | 'createdAt'>[] {
  const out: Omit<Prediction, 'id' | 'createdAt'>[] = []
  for (const p of ctx.projects) {
    if (p.status !== 'active' || p.stalledDays < 3) continue
    out.push({
      type: 'stalled_project',
      title: `프로젝트 「${p.name}」이(가) ${p.stalledDays}일째 멈춰 있을 수 있습니다.`,
      reason: `마지막 업데이트 기준 ${p.stalledDays}일이 지났습니다. 확정이 아니라 가능성입니다.`,
      confidence: Math.min(0.9, 0.55 + p.stalledDays * 0.05),
      severity: p.stalledDays >= 7 ? 'warning' : 'info',
      validUntil: new Date(Date.now() + 12 * 3600_000).toISOString(),
      recommendedAction: { label: '프로젝트 상태 보기', textHint: `${p.name} 프로젝트 상태` },
      sourceIds: [`project:${p.name}`],
    })
  }
  return out
}

export function ruleGoalDelay(ctx: FusedContext): Omit<Prediction, 'id' | 'createdAt'>[] {
  const out: Omit<Prediction, 'id' | 'createdAt'>[] = []
  for (const g of ctx.goals) {
    if (g.status !== 'active') continue
    if (g.progress > 0 && g.progress < 0.3) {
      out.push({
        type: 'goal_delay',
        title: `목표 「${g.title}」 진행이 더딜 수 있습니다.`,
        reason: `현재 진행률 ${Math.round(g.progress * 100)}% (마일스톤·기록 기반).`,
        confidence: 0.6,
        severity: 'info',
        validUntil: new Date(Date.now() + 24 * 3600_000).toISOString(),
        recommendedAction: { label: '다음 행동', textHint: `${g.title} 다음 행동` },
        sourceIds: [`goal:${g.title}`],
      })
    }
  }
  return out
}

export function ruleReminderVolume(ctx: FusedContext): Omit<Prediction, 'id' | 'createdAt'>[] {
  if (ctx.today.reminders.length < 2) return []
  return [
    {
      type: 'missed_todo',
      title: '놓치기 쉬운 할 일이 있을 수 있습니다.',
      reason: `미완료 할 일·알림 ${ctx.today.reminders.length}건이 등록되어 있습니다.`,
      confidence: 0.55,
      severity: 'info',
      validUntil: new Date(Date.now() + 8 * 3600_000).toISOString(),
      recommendedAction: { label: '할 일 목록', textHint: '할 일 목록' },
      sourceIds: ctx.today.reminders.slice(0, 3).map((t, i) => `reminder:${i}:${t}`),
    },
  ]
}

/**
 * Departure prediction only when Navigation supplies ETA.
 * Without ETA we refuse to invent travel time.
 */
export function ruleDeparture(ctx: FusedContext, navEtaMinutes: number | null): Omit<Prediction, 'id' | 'createdAt'>[] {
  if (navEtaMinutes == null || !Number.isFinite(navEtaMinutes)) return []
  const event = ctx.today.events[0]
  if (!event) return []
  return [
    {
      type: 'departure',
      title: '출발 시간이 가까워지고 있을 수 있습니다.',
      reason: `Navigation 예상 이동 ${navEtaMinutes}분 · 관련 일정 후보: ${event}`,
      confidence: 0.7,
      severity: 'warning',
      validUntil: new Date(Date.now() + 2 * 3600_000).toISOString(),
      recommendedAction: { label: '길안내', textHint: '길안내' },
      sourceIds: ['nav:eta', `event:${event}`],
    },
  ]
}
