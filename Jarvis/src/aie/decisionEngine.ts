/**
 * Decision Engine — STEP1…STEP9: what to focus on first.
 * Pure ranking over Context + utterance; does not execute skills.
 */

import { assessEmergencyUtterance } from '../life-os/emergency/emergencyService'
import { getMusicSession } from '../music/musicSession'
import { compareSmartPriority } from './priority'
import type { AieContext, AieDecision, AieSmartPriority } from './types'

function looksLikeUserCommand(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return /(?:해\s*줘|해줘|틀어|열어|보여|알려|추가|삭제|예약|검색|번역|길\s*안내|재생|멈춰|설정)/i.test(t) || t.length >= 2
}

function hospitalCue(text: string, ctx: AieContext): boolean {
  const blob = `${text}\n${ctx.todaySchedule.join('\n')}`
  return /병원|진료|응급실|건강검진/i.test(blob)
}

function familyUrgent(text: string, ctx: AieContext): boolean {
  if (/가족\s*긴급|응급|사고|다쳤/i.test(text)) return true
  return ctx.familyEvents.some((e) => /긴급|병원|응급/i.test(e))
}

function pickSmartPriority(text: string, ctx: AieContext, base: AieSmartPriority): AieSmartPriority {
  const candidates: AieSmartPriority[] = [base]
  if (hospitalCue(text, ctx)) candidates.push('hospital_appointment')
  if (familyUrgent(text, ctx)) candidates.push('family_urgent')
  if (/긴급\s*알림|당장|즉시/i.test(text)) candidates.push('urgent_alert')
  if (looksLikeUserCommand(text)) candidates.push('user_command')
  candidates.sort(compareSmartPriority)
  return candidates[0]
}

/**
 * Decide the highest-priority step for this turn.
 */
export function decideNextFocus(input: {
  text: string
  context: AieContext
  /** True when an explicit user utterance is being processed this turn. */
  hasUserUtterance?: boolean
}): AieDecision {
  const text = input.text.trim()
  const ctx = input.context

  // STEP1 — emergency
  try {
    const em = assessEmergencyUtterance(text)
    if (em.showPanel || em.level === 'likely' || em.level === 'possible') {
      return {
        step: 'STEP1_EMERGENCY',
        reason: '긴급 상황 신호가 감지되었습니다.',
        focus: 'emergency',
        smartPriority: pickSmartPriority(text, ctx, 'urgent_alert'),
      }
    }
  } catch {
    /* emergency assess must never throw into think() */
  }

  // STEP2 — in-progress work (music playing, nav candidates)
  try {
    const music = getMusicSession()
    const musicBusy = music.status === 'playing' || music.status === 'searching' || music.status === 'ready'
    if (musicBusy && /멈춰|다음\s*곡|볼륨|일시\s*정지/i.test(text)) {
      return {
        step: 'STEP2_IN_PROGRESS',
        reason: '실행 중 음악 세션을 제어합니다.',
        focus: 'music',
        smartPriority: 'user_command',
      }
    }
    if (ctx.navigationState.hasPendingCandidates && /선택|첫\s*번째|두번째|2번|길\s*안내/i.test(text)) {
      return {
        step: 'STEP2_IN_PROGRESS',
        reason: '진행 중인 내비게이션 후보를 이어서 처리합니다.',
        focus: 'navigation',
        smartPriority: 'user_command',
      }
    }
  } catch {
    /* ignore */
  }

  // STEP3 — user command (normal path for almost all think() calls)
  if (input.hasUserUtterance !== false && looksLikeUserCommand(text)) {
    return {
      step: 'STEP3_USER_COMMAND',
      reason: '사용자 명령을 Core Brain / 레거시 파이프라인으로 전달합니다.',
      focus: 'user_command',
      smartPriority: pickSmartPriority(text, ctx, 'user_command'),
    }
  }

  // STEP4 — today schedule
  if (ctx.todaySchedule.length > 0 && /일정|스케줄|오늘\s*뭐|브리핑|할\s*일/i.test(text || '브리핑')) {
    return {
      step: 'STEP4_TODAY_SCHEDULE',
      reason: '오늘 일정·할 일이 있습니다.',
      focus: 'schedule',
      smartPriority: pickSmartPriority(text, ctx, 'user_command'),
    }
  }

  // STEP5 — project
  const stalled = ctx.projectProgress.find((p) => p.stalledDays >= 3)
  if (stalled || /프로젝트/i.test(text)) {
    return {
      step: 'STEP5_PROJECT',
      reason: stalled ? `프로젝트 「${stalled.name}」이(가) ${stalled.stalledDays}일째 정체입니다.` : '프로젝트 관련 요청',
      focus: 'project',
      smartPriority: 'user_command',
    }
  }

  // STEP6 — family
  if (ctx.familyEvents.length && /가족/i.test(text)) {
    return {
      step: 'STEP6_FAMILY',
      reason: '가족 컨텍스트가 있습니다.',
      focus: 'family',
      smartPriority: pickSmartPriority(text, ctx, 'user_command'),
    }
  }

  // STEP7 — routine
  if (ctx.routinesDue.length && /루틴|좋은\s*아침|잘\s*자|출근/i.test(text)) {
    return {
      step: 'STEP7_ROUTINE',
      reason: '루틴 트리거입니다.',
      focus: 'routine',
      smartPriority: 'user_command',
    }
  }

  // STEP8 — provider
  if (!ctx.providerState.anyConfigured && /대화|챗|AI|질문/i.test(text)) {
    return {
      step: 'STEP8_AI_PROVIDER',
      reason: 'AI Provider가 없어 로컬/오프라인 경로를 우선합니다.',
      focus: 'provider',
      smartPriority: 'user_command',
    }
  }

  // STEP9 — recommendation (idle / proactive)
  return {
    step: 'STEP9_RECOMMENDATION',
    reason: '명시적 명령이 약해 추천·브리핑 후보를 계산합니다.',
    focus: 'recommendation',
    smartPriority: 'recommendation',
  }
}
