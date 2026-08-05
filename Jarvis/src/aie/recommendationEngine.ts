/**
 * Recommendation Engine — proactive candidates from Context.
 * Gated by life flag `proactiveSuggestionsEnabled` (default OFF).
 */

import { isLifeFeatureEnabled } from '../life-os/featureFlags'
import { filterByLearning, recordRecommendationShown } from './learningEngine'
import type { AieContext, AieRecommendation } from './types'

function rid(kind: string, key: string): string {
  return `rec_${kind}_${key}`.replace(/\s+/g, '_').slice(0, 80)
}

export function computeRecommendations(ctx: AieContext, opts?: { force?: boolean }): AieRecommendation[] {
  if (!opts?.force && !isLifeFeatureEnabled('proactiveSuggestionsEnabled')) {
    return []
  }

  const out: AieRecommendation[] = []

  if (ctx.todaySchedule.length > 0) {
    out.push({
      id: rid('schedule', 'today'),
      kind: 'schedule',
      message: `오늘 일정·할 일이 ${ctx.todaySchedule.length}건 있습니다.`,
      priority: 70,
      sourceStep: 'STEP4_TODAY_SCHEDULE',
      signalKey: 'schedule_today',
    })
  }

  for (const p of ctx.projectProgress) {
    if (p.stalledDays >= 3) {
      out.push({
        id: rid('project', p.name),
        kind: 'project',
        message: `프로젝트 「${p.name}」이(가) ${p.stalledDays}일째 멈춰 있습니다.`,
        priority: 65,
        sourceStep: 'STEP5_PROJECT',
        signalKey: `project_stall_${p.name}`,
      })
    }
  }

  for (const g of ctx.goalProgress) {
    if (g.progress > 0 && g.progress < 0.35) {
      out.push({
        id: rid('goal', g.title),
        kind: 'goal',
        message: `목표 「${g.title}」 진행률이 낮습니다 (${Math.round(g.progress * 100)}%).`,
        priority: 55,
        sourceStep: 'STEP9_RECOMMENDATION',
        signalKey: `goal_low_${g.title}`,
      })
    }
  }

  if (ctx.familyEvents.length > 0) {
    out.push({
      id: rid('family', 'events'),
      kind: 'family',
      message: '가족 관련 프로필·공지가 있습니다. 확인해 볼까요?',
      priority: 50,
      sourceStep: 'STEP6_FAMILY',
      signalKey: 'family_events',
    })
  }

  if (!ctx.network.online) {
    out.push({
      id: rid('network', 'offline'),
      kind: 'network',
      message: '오프라인입니다. 로컬 기능(일정·메모·음악 세션 복구)을 우선 사용합니다.',
      priority: 80,
      sourceStep: 'STEP8_AI_PROVIDER',
      signalKey: 'offline',
    })
  } else if (!ctx.providerState.anyConfigured) {
    out.push({
      id: rid('provider', 'none'),
      kind: 'provider',
      message: 'AI Provider가 없습니다. 설정에서 무료 AI를 연결하면 자유 대화가 가능해집니다.',
      priority: 40,
      sourceStep: 'STEP8_AI_PROVIDER',
      signalKey: 'provider_none',
    })
  }

  // Soft departure cue — only if schedule text mentions time-ish words (no invented ETA)
  if (ctx.todaySchedule.some((s) => /출발|병원|미팅|회의|출근/i.test(s))) {
    out.push({
      id: rid('schedule', 'depart'),
      kind: 'schedule',
      message: '출발·이동이 포함된 일정이 있습니다. 필요하면 길안내를 요청하세요.',
      priority: 60,
      sourceStep: 'STEP4_TODAY_SCHEDULE',
      signalKey: 'schedule_depart',
    })
  }

  const filtered = filterByLearning(out).slice(0, 4)
  return filtered
}

export function formatRecommendationsBlock(recs: AieRecommendation[]): string {
  if (!recs.length) return ''
  return ['', '— AIE 추천 —', ...recs.map((r) => `• ${r.message}`)].join('\n')
}

export function markRecommendationsPresented(recs: AieRecommendation[]): void {
  recordRecommendationShown(recs)
}
