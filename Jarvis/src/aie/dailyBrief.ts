/**
 * Daily Brief — compose from real Context + existing morningBriefing data.
 * Does not invent weather, commute ETA, or schedule items.
 */

import { morningBriefing } from '../smart'
import { loadSettings } from '../storage'
import { formatTodayBrief } from '../life-os/lifeContext'
import { isLifeFeatureEnabled } from '../life-os/featureFlags'
import { formatFusedContextSummary, fuseContext, isLifeOs2Enabled } from '../life-os-2/lifeOS2'
import { buildAieContext, formatAieContextBlock } from './contextEngine'
import { computeRecommendations, formatRecommendationsBlock } from './recommendationEngine'
import type { AieContext } from './types'

export type DailyBriefOptions = {
  includeLegacyMorning?: boolean
  includeLifeOsBrief?: boolean
  includeRecommendations?: boolean
  context?: AieContext
}

/**
 * AIE Daily Brief — realtime Context based.
 * Commute ETA / live weather are only included when already present in context cache.
 */
export function buildAieDailyBrief(opts?: DailyBriefOptions): string {
  const settings = loadSettings()
  const name = settings.displayName
  const ctx = opts?.context || buildAieContext({ force: true })
  const hour = new Date().getHours()
  const greet = hour < 12 ? '좋은 아침입니다' : hour < 18 ? '안녕하세요' : '좋은 저녁입니다'

  const sections: string[] = [`${greet}, ${name}.`, `【AIE Daily Brief】`, `지금 ${ctx.date} ${ctx.time} (${ctx.timezone})`]

  // Today schedule
  sections.push('')
  sections.push('— 오늘 일정·할 일 —')
  if (ctx.todaySchedule.length) {
    sections.push(...ctx.todaySchedule.map((s, i) => `${i + 1}. ${s}`))
  } else {
    sections.push('(등록된 항목 없음)')
  }

  // Goals
  sections.push('')
  sections.push('— 오늘 목표 —')
  if (ctx.goalProgress.length) {
    sections.push(
      ...ctx.goalProgress.map((g) => `• ${g.title} · ${Math.round(g.progress * 100)}%`),
    )
  } else {
    sections.push('(활성 목표 없음)')
  }

  // Projects
  sections.push('')
  sections.push('— 프로젝트 —')
  if (ctx.projectProgress.length) {
    sections.push(
      ...ctx.projectProgress.map((p) => {
        const stall = p.stalledDays >= 3 ? ` · ${p.stalledDays}일 정체` : ''
        return `• ${p.name} · ${Math.round(p.progress * 100)}%${stall}`
      }),
    )
  } else {
    sections.push('(활성 프로젝트 없음)')
  }

  // Family
  sections.push('')
  sections.push('— 가족 —')
  if (ctx.familyEvents.length) {
    sections.push(...ctx.familyEvents.map((e) => `• ${e}`))
  } else {
    sections.push('(로컬 가족 프로필/공지 없음)')
  }

  // Weather — only if cached
  sections.push('')
  sections.push('— 날씨 —')
  sections.push(ctx.weather || '(캐시된 날씨 없음 · 「오늘 날씨」로 확인)')

  // Commute — never invent
  sections.push('')
  sections.push('— 출근·이동 —')
  sections.push('(예상 시간은 실시간 교통 API 연동 시에만 표시 · 현재 미연결)')

  if (opts?.includeRecommendations !== false) {
    const recs = computeRecommendations(ctx)
    const block = formatRecommendationsBlock(recs)
    if (block) sections.push(block)
    else {
      sections.push('')
      sections.push('— 오늘 추천 —')
      sections.push(
        isProactiveOffMessage(),
      )
    }
  }

  if (opts?.includeLifeOsBrief !== false) {
    try {
      sections.push('')
      sections.push(formatTodayBrief())
    } catch {
      /* optional */
    }
  }

  if (opts?.includeLegacyMorning) {
    try {
      sections.push('')
      sections.push('— 기존 모닝 브리핑 —')
      sections.push(morningBriefing())
    } catch {
      /* optional */
    }
  }

  // Life OS 2.0 Context Fusion snippet (flag-gated; never replaces AIE)
  try {
    if (isLifeOs2Enabled('contextFusionEnabled')) {
      const fused = formatFusedContextSummary(fuseContext({ force: false }) || undefined)
      if (fused) {
        sections.push('')
        sections.push(fused)
      }
    }
  } catch {
    /* Life OS 2 optional */
  }

  sections.push('')
  sections.push(formatAieContextBlock(ctx))

  return sections.join('\n')
}

function isProactiveOffMessage(): string {
  if (!isLifeFeatureEnabled('proactiveSuggestionsEnabled')) {
    return '(추천 OFF · Life OS 설정에서 프로액티브 추천을 켤 수 있습니다)'
  }
  return '(추천 후보 없음)'
}

/** Shorter brief for chat replies (default path for 「브리핑」). */
export function buildAieDailyBriefChat(): string {
  return buildAieDailyBrief({
    includeLegacyMorning: false,
    includeLifeOsBrief: true,
    includeRecommendations: true,
  })
}
