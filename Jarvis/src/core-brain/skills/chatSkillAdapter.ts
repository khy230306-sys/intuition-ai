import type { SkillContext, SkillResult } from '../types'

/**
 * Chat skill deliberately does not call the cloud AI here.
 * Core Brain returns fallback_legacy so the existing `think` pipeline
 * (invest/life/geo/AI) stays intact.
 */
export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'general_chat' || ctx.intent === 'ask_information' || ctx.intent === 'summarize' || ctx.intent === 'unknown'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  return {
    success: true,
    status: 'completed',
    data: { defer: 'legacy_think', intent: ctx.intent },
    message: '',
    speakText: '',
    error: null,
  }
}
