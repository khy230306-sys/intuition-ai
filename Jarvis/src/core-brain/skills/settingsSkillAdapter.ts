import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'change_setting'
}

export async function execute(_ctx: SkillContext): Promise<SkillResult> {
  return {
    success: true,
    status: 'completed',
    data: { view: 'settings' },
    message: '설정 화면을 엽니다. API 키·언어·음성 옵션을 확인할 수 있어요.',
    speakText: '설정을 열게요.',
    uiActions: [{ type: 'OPEN_ROUTE', payload: { view: 'settings' } }],
    brainPatch: { view: 'settings', speak: true },
    error: null,
  }
}
