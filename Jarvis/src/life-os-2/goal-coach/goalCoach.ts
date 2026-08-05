import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { findGoal } from './coachProgress'
import { buildCoachAdvice, formatCoachAdvice } from './coachPlanner'

export function handleGoalCoachQuery(text: string): string | null {
  if (!isLifeOs2Enabled('goalCoachEnabled')) return null
  if (
    !/목표/.test(text) &&
    !/다음\s*한\s*가지|이번\s*주\s*계획|왜\s*진행|코칭|먼저\s*해야/.test(text)
  ) {
    return null
  }
  // Avoid stealing simple create/list unless coaching cues
  if (/내\s*목표는|목표\s*목록|목표\s*추가/.test(text) && !/상황|코칭|다음|왜|계획/.test(text)) {
    return null
  }

  const hint =
    text.match(/「(.+?)」/)?.[1] ||
    text.match(/([가-힣A-Za-z0-9]{2,40})\s*(?:출시\s*)?목표/)?.[1] ||
    text.match(/목표\s*([가-힣A-Za-z0-9]{2,40})/)?.[1]

  const goal = findGoal(hint)
  if (!goal) return '코칭할 목표가 없습니다. 먼저 목표를 등록해 주세요.'

  const advice = buildCoachAdvice(goal)
  emitLifeOs2Event('coach.session', { goal: goal.title })
  return formatCoachAdvice(advice)
}

export { buildCoachAdvice, formatCoachAdvice, findGoal }
