/**
 * Life OS 2.0 coordinator — routes utterances to engines.
 * Does not replace Core Brain; used by lifeOS2 skill adapter.
 */

import { ensureLifeOs2Schema } from './repository'
import { observeFromUtterance } from './habits/habitEngine'
import {
  answerBusyToday,
  answerPriorityQuestion,
  formatFusedContextSummary,
  fuseContext,
} from './context-fusion/contextFusionEngine'
import { answerPredictionQuery } from './prediction/predictionEngine'
import {
  confirmHabit,
  formatHabitList,
  rejectHabit,
  suggestHabitCandidates,
} from './habits/habitEngine'
import {
  formatFocusHistory,
  formatFocusStatus,
  startFocus,
  stopFocus,
} from './focus/focusEngine'
import { handleRelationshipQuery } from './relationships/relationshipEngine'
import { handleKnowledgeQuery } from './knowledge/knowledgeEngine'
import { handleAutomationUtteranceAsync } from './automation/automationEngine2'
import { handleGoalCoachQuery } from './goal-coach/goalCoach'
import { handleCompanionQuery } from './companion/companionEngine'
import { formatProactivePolicyHelp } from './proactive/proactivePolicy'
import type { Los2HandleResult } from './types'
import { isLifeOs2Enabled } from './featureFlags'

export async function coordinateLifeOs2(text: string): Promise<Los2HandleResult | null> {
  ensureLifeOs2Schema()
  const t = text.trim()
  if (!t) return null

  // Soft habit observation (never blocks)
  try {
    observeFromUtterance(t)
  } catch {
    /* ignore */
  }

  // Companion
  const companion = handleCompanionQuery(t)
  if (companion) return { handled: true, text: companion, speakText: companion.split('\n')[0] }

  // Focus
  if (isLifeOs2Enabled('focusEnabled')) {
    if (/집중\s*끝|집중\s*종료|집중\s*취소/.test(t)) {
      const cancel = /취소/.test(t)
      const msg = stopFocus(cancel)
      return { handled: true, text: msg, speakText: msg.split('\n')[0] }
    }
    if (/집중\s*모드\s*시작|집중\s*시작|분\s*동안.+집중|집중할래|집중할게/.test(t)) {
      const msg = startFocus(t)
      return { handled: true, text: msg, speakText: msg.split('\n')[0] }
    }
    if (/오늘\s*집중\s*기록|집중\s*기록/.test(t)) {
      return { handled: true, text: formatFocusHistory() }
    }
    if (/집중\s*(상태|현황|중)?\s*$/.test(t) || /집중\s*어때/.test(t)) {
      return { handled: true, text: formatFocusStatus() }
    }
  }

  // Habits
  if (isLifeOs2Enabled('habitsEnabled')) {
    if (/습관\s*확인|습관\s*저장|습관\s*승인/.test(t)) {
      return { handled: true, text: confirmHabit() }
    }
    if (/습관\s*거절|습관\s*거부|습관\s*싫어/.test(t)) {
      return { handled: true, text: rejectHabit() }
    }
    if (/습관\s*보여|습관\s*목록|습관\s*후보/.test(t)) {
      return { handled: true, text: suggestHabitCandidates().text }
    }
    if (/습관$/.test(t)) {
      return { handled: true, text: formatHabitList() }
    }
  }

  // Context / priority
  if (isLifeOs2Enabled('contextFusionEnabled')) {
    if (/오늘\s*뭐\s*해야|지금\s*뭐\s*해야|현재\s*상황|컨텍스트/.test(t)) {
      const ctx = fuseContext({ force: true })
      return {
        handled: true,
        text: formatFusedContextSummary(ctx),
        cards: [{ kind: 'context', title: 'Context', body: formatFusedContextSummary(ctx) }],
      }
    }
    if (/가장\s*중요한\s*일|우선순위|뭐가\s*중요해/.test(t)) {
      return { handled: true, text: answerPriorityQuestion() }
    }
    if (/오늘\s*일정.*바쁘|바쁜가|바빠\??/.test(t)) {
      return { handled: true, text: answerBusyToday() }
    }
    if (/지금\s*출발해야/.test(t)) {
      return {
        handled: true,
        text: '출발 여부는 Navigation 이동시간이 있을 때만 판단합니다. 현재 ETA가 없어 「지금 출발해야 한다」고 단정하지 않습니다. 「길안내」로 확인해 주세요.',
      }
    }
  }

  // Predictions
  if (isLifeOs2Enabled('predictionEnabled')) {
    if (/예측|출발하면\s*여유|놓치기\s*쉬운|오래\s*멈춘\s*프로젝트|이번\s*주\s*목표\s*달성/.test(t)) {
      return { handled: true, text: answerPredictionQuery(t) }
    }
  }

  // Goal coach
  const coach = handleGoalCoachQuery(t)
  if (coach) return { handled: true, text: coach }

  // Relationships 2
  const rel = handleRelationshipQuery(t)
  if (rel) return { handled: true, text: rel }

  // Knowledge
  const kn = handleKnowledgeQuery(t)
  if (kn) return { handled: true, text: kn }

  // Automation
  const auto = await handleAutomationUtteranceAsync(t)
  if (auto) return { handled: true, text: auto }

  // Proactive policy help
  if (/프로액티브|제안\s*정책|추천\s*정책/.test(t)) {
    return { handled: true, text: formatProactivePolicyHelp() }
  }

  return null
}
