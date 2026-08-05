/**
 * Life OS 2.0 coordinator — routes utterances to engines + card payloads.
 */

import { ensureLifeOs2Schema } from './repository'
import { observeFromUtterance } from './habits/habitEngine'
import {
  answerBusyToday,
  answerPriorityQuestion,
  formatFusedContextSummary,
  fuseContext,
} from './context-fusion/contextFusionEngine'
import { answerPredictionQuery, generatePredictions } from './prediction/predictionEngine'
import {
  confirmHabit,
  formatHabitList,
  rejectHabit,
  suggestHabitCandidates,
} from './habits/habitEngine'
import {
  formatFocusHistory,
  formatFocusStatus,
  getActiveFocus,
  startFocus,
  stopFocus,
} from './focus/focusEngine'
import { handleRelationshipQuery } from './relationships/relationshipEngine'
import { handleKnowledgeQuery } from './knowledge/knowledgeEngine'
import { searchKnowledge } from './knowledge/knowledgeSearch'
import { handleAutomationUtteranceAsync, getPendingAutomationPlan } from './automation/automationEngine2'
import { handleGoalCoachQuery } from './goal-coach/goalCoach'
import { buildCoachAdvice, findGoal } from './goal-coach/goalCoach'
import { handleCompanionQuery } from './companion/companionEngine'
import { formatProactivePolicyHelp } from './proactive/proactivePolicy'
import type { Los2HandleResult } from './types'
import { isLifeOs2Enabled } from './featureFlags'
import {
  buildAutomationPlanCard,
  buildAutomationResultCard,
  buildCompanionCard,
  buildContextCard,
  buildFocusCard,
  buildGoalCoachCard,
  buildHabitCandidateCard,
  buildKnowledgeCard,
  buildPredictionCards,
  buildUnavailableCard,
  buildWarningCard,
} from './ui/cardBuilders'
import { loadAutomations } from './automation/automationRunner'
import type { AutomationRun } from './automation/automationTypes'

function ok(text: string, lifeCards?: Los2HandleResult['lifeCards']): Los2HandleResult {
  return { handled: true, text, speakText: text.split('\n')[0], lifeCards }
}

export async function coordinateLifeOs2(text: string): Promise<Los2HandleResult | null> {
  ensureLifeOs2Schema()
  const t = text.trim()
  if (!t) return null

  try {
    observeFromUtterance(t)
  } catch {
    /* ignore */
  }

  // Companion
  if (isLifeOs2Enabled('companionEnabled')) {
    const companion = handleCompanionQuery(t)
    if (companion) {
      const kind = /저녁|이브닝|evening/i.test(t) ? 'evening' : 'morning'
      if (/컴패니언\s*(켜|꺼)/.test(t)) return ok(companion)
      return ok(companion, [buildCompanionCard(kind, companion)])
    }
  }

  // Focus
  if (isLifeOs2Enabled('focusEnabled')) {
    if (/집중\s*끝|집중\s*종료|집중\s*취소/.test(t)) {
      const cancel = /취소/.test(t)
      const before = getActiveFocus()
      const msg = stopFocus(cancel)
      const mins = Number(msg.match(/기록\s*(\d+)\s*분/)?.[1] || 0)
      const card = before
        ? buildFocusCard(
            {
              ...before,
              status: cancel ? 'cancelled' : 'completed',
              endedAt: new Date().toISOString(),
              completedMinutes: mins || before.completedMinutes,
            },
            'ended',
          )
        : buildFocusCard(null, 'ended')
      return ok(msg, [card])
    }
    if (/집중\s*모드\s*시작|집중\s*시작|분\s*동안.+집중|집중할래|집중할게/.test(t)) {
      const msg = startFocus(t)
      const session = getActiveFocus()
      return ok(msg, [buildFocusCard(session, 'active')])
    }
    if (/오늘\s*집중\s*기록|집중\s*기록/.test(t)) {
      return ok(formatFocusHistory(), [buildFocusCard(getActiveFocus(), 'status')])
    }
    if (/집중\s*(상태|현황|중)?\s*$/.test(t) || /집중\s*어때/.test(t)) {
      return ok(formatFocusStatus(), [buildFocusCard(getActiveFocus(), 'status')])
    }
  }

  // Habits
  if (isLifeOs2Enabled('habitsEnabled')) {
    if (/습관\s*확인|습관\s*저장|습관\s*승인/.test(t)) {
      return ok(confirmHabit())
    }
    if (/습관\s*거절|습관\s*거부|습관\s*싫어|다시\s*제안하지/.test(t)) {
      return ok(rejectHabit())
    }
    if (/습관\s*보여|습관\s*목록|습관\s*후보|출근\s*Routine\s*후보|출근\s*루틴\s*후보/.test(t)) {
      const { text: body, habits } = suggestHabitCandidates()
      const cards = habits.filter((h) => h.status === 'candidate').slice(0, 1).map(buildHabitCandidateCard)
      return ok(body, cards.length ? cards : undefined)
    }
    if (/습관$/.test(t)) {
      return ok(formatHabitList())
    }
  }

  // Context / priority
  if (isLifeOs2Enabled('contextFusionEnabled')) {
    if (/오늘\s*뭐\s*해야|지금\s*뭐\s*해야|현재\s*상황|컨텍스트/.test(t)) {
      const ctx = fuseContext({ force: true })
      if (!ctx) return ok(buildUnavailableCard('Context', 'Context Fusion이 꺼져 있습니다.').summary, [
        buildUnavailableCard('Context', 'Context Fusion이 꺼져 있습니다.'),
      ])
      return ok(formatFusedContextSummary(ctx), [buildContextCard(ctx, 'summary')])
    }
    if (/가장\s*중요한\s*일|우선순위|뭐가\s*중요해/.test(t)) {
      const ctx = fuseContext({ force: true })
      return ok(answerPriorityQuestion(ctx), ctx ? [buildContextCard(ctx, 'priority')] : undefined)
    }
    if (/오늘\s*일정.*바쁘|바쁜가|바빠\??/.test(t) || /일정이\s*바빠/.test(t)) {
      const ctx = fuseContext({ force: true })
      return ok(answerBusyToday(ctx), ctx ? [buildContextCard(ctx, 'busy')] : undefined)
    }
    if (/지금\s*출발해야/.test(t)) {
      const card = buildWarningCard(
        '출발 판단',
        '실시간 이동시간은 현재 연결되지 않았습니다. Navigation ETA가 있을 때만 판단합니다.',
      )
      return ok(card.summary, [card])
    }
  }

  // Predictions
  if (isLifeOs2Enabled('predictionEnabled')) {
    if (/예측|출발하면\s*여유|놓치기\s*쉬운|오래\s*멈춘\s*프로젝트|이번\s*주\s*목표\s*달성/.test(t)) {
      const textOut = answerPredictionQuery(t)
      const preds = generatePredictions({ navEtaMinutes: null })
      const cards = preds.length ? buildPredictionCards(preds) : [buildUnavailableCard('예측', textOut)]
      return ok(textOut, cards)
    }
  }

  // Goal coach
  if (isLifeOs2Enabled('goalCoachEnabled')) {
    const coach = handleGoalCoachQuery(t)
    if (coach) {
      const hint =
        t.match(/「(.+?)」/)?.[1] ||
        t.match(/([가-힣A-Za-z0-9]{2,40})\s*(?:출시\s*)?목표/)?.[1]
      const goal = findGoal(hint)
      const cards = goal ? [buildGoalCoachCard(buildCoachAdvice(goal))] : undefined
      return ok(coach, cards)
    }
  }

  // Relationships 2
  const rel = handleRelationshipQuery(t)
  if (rel) return ok(rel)

  // Knowledge
  if (isLifeOs2Enabled('knowledgeEngineEnabled')) {
    const kn = handleKnowledgeQuery(t)
    if (kn) {
      let query = t.replace(/찾아줘|검색해줘|지식\s*검색|관련|내용|보여줘/g, '').trim()
      if (query.length < 2) query = t
      const items = searchKnowledge({ query, reindex: false })
      return ok(kn, [buildKnowledgeCard(query, items)])
    }
  }

  // Automation
  if (isLifeOs2Enabled('automation2Enabled')) {
    const auto = await handleAutomationUtteranceAsync(t)
    if (auto) {
      if (/【자동화 실행 계획/.test(auto) || /자동화 실행 계획/.test(auto)) {
        const plan = getPendingAutomationPlan()
        return ok(auto, plan ? [buildAutomationPlanCard(plan, auto)] : undefined)
      }
      if (/【자동화 실행/.test(auto)) {
        const overall = /partial/.test(auto) ? 'partial' : /failed|실패/.test(auto) ? 'failed' : 'success'
        const fakeRun: AutomationRun = {
          id: 'ui',
          automationId: loadAutomations()[0]?.id || '',
          at: new Date().toISOString(),
          results: [],
          overall: overall as AutomationRun['overall'],
        }
        // Prefer parsing lines into result card via text; keep simple result card
        return ok(auto, [
          {
            ...buildAutomationResultCard(fakeRun),
            items: auto
              .split('\n')
              .filter((l) => l.startsWith('•'))
              .map((l, i) => ({ id: `l${i}`, label: l.replace(/^•\s*/, '') })),
            summary:
              overall === 'partial'
                ? '일부만 성공했습니다. 전체를 성공으로 표시하지 않습니다.'
                : auto.split('\n')[0] || auto,
          },
        ])
      }
      return ok(auto)
    }
  }

  if (/프로액티브|제안\s*정책|추천\s*정책/.test(t)) {
    return ok(formatProactivePolicyHelp())
  }

  return null
}
