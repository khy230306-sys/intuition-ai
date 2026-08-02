import { handleRelationshipText, wantsRelationshipSkill } from '../../relationship'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  const text = ctx.request.normalizedText || ctx.request.text
  return (
    wantsRelationshipSkill(text) ||
    ctx.intent === 'remember_relationship' ||
    ctx.intent === 'update_relationship' ||
    ctx.intent === 'forget_relationship' ||
    ctx.intent === 'list_relationships'
  )
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const text = ctx.request.normalizedText || ctx.request.text
  const reply = handleRelationshipText(text)
  if (!reply?.handled) {
    return {
      success: false,
      status: 'unavailable',
      data: {},
      message: '관계 기억으로 처리하지 못했어요.',
      error: { code: 'no_skill_available' },
    }
  }
  return {
    success: true,
    status: 'completed',
    data: {},
    message: reply.text,
    speakText: reply.speakText || reply.text.slice(0, 120),
    brainPatch: { text: reply.text, speak: true },
    error: null,
  }
}
