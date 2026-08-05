/**
 * Life OS 2.0 skill — lazy-loaded by Skill Registry.
 * Orchestrates life-os-2 engines; does not replace Life OS 1.x skill.
 */

import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

const INTENTS = new Set([
  'ask_current_context',
  'ask_priority',
  'ask_prediction',
  'show_habits',
  'confirm_habit',
  'reject_habit',
  'start_focus',
  'stop_focus',
  'focus_status',
  'save_relationship_ext',
  'search_relationship_ext',
  'search_knowledge',
  'create_automation',
  'run_automation',
  'stop_automation',
  'goal_coaching',
  'morning_brief',
  'evening_summary',
  'show_recommendations',
])

export function canHandle(ctx: SkillContext): boolean {
  return INTENTS.has(ctx.intent)
}

function ok(message: string): SkillResult {
  return {
    success: true,
    status: 'completed',
    data: {},
    message,
    speakText: message.split('\n')[0]?.slice(0, 160),
    error: null,
  }
}

function fail(message: string): SkillResult {
  return {
    success: false,
    status: 'failed',
    data: {},
    message,
    speakText: message.slice(0, 120),
    error: { code: 'skill_failed' },
  }
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const text = ctx.request.normalizedText || ctx.request.text
  try {
    const { coordinateLifeOs2 } = await import('../../life-os-2/lifeCoordinator')
    const result = await coordinateLifeOs2(text)
    if (!result?.handled) {
      return fail('Life OS 2.0이 이 요청을 처리하지 못했습니다.')
    }
    return ok(result.text)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Life OS 2.0 오류')
  }
}
