import { handleTranslate, wantsTranslate } from '../../translateBrain'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'translate' || wantsTranslate(ctx.request.normalizedText || ctx.request.text)
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  try {
    const text = ctx.request.normalizedText || ctx.request.text
    const reply = await handleTranslate(text)
    if (!reply) {
      return {
        success: false,
        status: 'unavailable',
        data: {},
        message: '번역 요청으로 인식하지 못했습니다. 예: 「이 문장을 일본어로 번역해줘」',
        error: { code: 'no_skill_available' },
      }
    }
    return {
      success: true,
      status: 'completed',
      data: { targetLanguage: ctx.entities.targetLanguage },
      message: reply.text,
      speakText: reply.text.slice(0, 160),
      brainPatch: reply,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      data: {},
      message: '번역을 실행하지 못했습니다.',
      error: { code: 'skill_failed', detail: err instanceof Error ? err.message : String(err) },
    }
  }
}
