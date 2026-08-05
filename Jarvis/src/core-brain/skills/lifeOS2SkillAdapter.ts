/**
 * Life OS 2.0 skill — lazy-loaded; returns text + lifeCards via brainPatch.
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

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const text = ctx.request.normalizedText || ctx.request.text
  try {
    const { coordinateLifeOs2 } = await import('../../life-os-2/lifeCoordinator')
    const result = await coordinateLifeOs2(text)
    if (!result?.handled) {
      return {
        success: false,
        status: 'failed',
        data: {},
        message: 'Life OS 2.0이 이 요청을 처리하지 못했습니다.',
        speakText: '처리할 수 없어요.',
        error: { code: 'skill_failed' },
      }
    }
    return {
      success: true,
      status: 'completed',
      data: { lifeCards: result.lifeCards || [] },
      message: result.text,
      speakText: result.speakText || result.text.split('\n')[0]?.slice(0, 160),
      brainPatch: {
        text: result.text,
        speak: true,
        lifeCards: result.lifeCards,
      },
      error: null,
    }
  } catch (e) {
    return {
      success: false,
      status: 'failed',
      data: {},
      message: e instanceof Error ? e.message : 'Life OS 2.0 오류',
      speakText: '오류가 났어요.',
      error: { code: 'skill_failed' },
    }
  }
}
