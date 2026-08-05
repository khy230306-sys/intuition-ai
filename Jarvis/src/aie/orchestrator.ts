/**
 * AIE Orchestrator — thin layer above Core Brain.
 * prepare → (optional multi-task) → enrich answer with recommendations.
 * Never deletes or replaces Core Brain / Intent Router / Skills.
 */

import { planActions, formatActionPlanSummary } from './actionPlanner'
import { buildAieContext } from './contextEngine'
import { decideNextFocus } from './decisionEngine'
import { recordRecommendationsIgnored, recordSkillUse } from './learningEngine'
import {
  computeRecommendations,
  formatRecommendationsBlock,
  markRecommendationsPresented,
} from './recommendationEngine'
import type { AiePrepareInput, AiePrepareResult, AieRecommendation } from './types'

let lastRecKeys: string[] = []
let lastPrepareAt = 0

/**
 * Lightweight prepare — decision + action plan always;
 * full context / recommendations only when needed.
 */
export function aiePrepare(input: AiePrepareInput): AiePrepareResult {
  const text = input.text.trim()
  const now = Date.now()

  // Soft ignore signal when user issues a new command after recommendations
  if (lastRecKeys.length && now - lastPrepareAt > 2_000) {
    recordRecommendationsIgnored(lastRecKeys)
    lastRecKeys = []
  }
  lastPrepareAt = now

  const planned = planActions(text)
  const effectivePlan = input.skipMultiTask
    ? {
        original: text,
        multiTask: false as const,
        tasks: [
          {
            id: 'task_1',
            order: 0,
            kind: planned.tasks[0]?.kind || ('chat' as const),
            text,
            reason: planned.tasks[0]?.reason || '단일 작업',
          },
        ],
      }
    : planned

  // Cached context — TTL/debounce inside buildAieContext
  const context = buildAieContext({
    activeView: input.activeView,
    history: input.history,
  })

  const decision = decideNextFocus({
    text,
    context,
    hasUserUtterance: true,
  })

  if (decision.focus && decision.focus !== 'recommendation') {
    recordSkillUse(decision.focus)
  }

  const recommendations: AieRecommendation[] =
    input.skipRecommend || effectivePlan.multiTask ? [] : computeRecommendations(context)

  return {
    decision,
    plan: effectivePlan,
    context,
    recommendations,
    shouldRunMultiTask: effectivePlan.multiTask && effectivePlan.tasks.length >= 2,
  }
}

export function aieEnrichAnswer(
  baseText: string,
  prepare: AiePrepareResult,
  opts?: { appendPlan?: boolean; appendRecs?: boolean },
): string {
  let text = baseText
  if (opts?.appendPlan !== false && prepare.plan.multiTask) {
    const summary = formatActionPlanSummary(prepare.plan)
    if (summary) text = `${summary}\n\n${text}`
  }
  if (opts?.appendRecs !== false && prepare.recommendations.length) {
    const block = formatRecommendationsBlock(prepare.recommendations)
    if (block) {
      text = `${text}${block}`
      markRecommendationsPresented(prepare.recommendations)
      lastRecKeys = prepare.recommendations.map((r) => r.signalKey)
    }
  }
  return text
}

export function aieFormatMultiTaskCombined(
  planSummary: string,
  parts: Array<{ label: string; text: string }>,
): string {
  const body = parts.map((p, i) => `【${i + 1}. ${p.label}】\n${p.text}`).join('\n\n')
  return planSummary ? `${planSummary}\n\n${body}` : body
}
