import { addReminder, loadReminders } from '../../storage'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'create_todo' || ctx.intent === 'list_todo' || ctx.intent === 'update_todo'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  if (ctx.intent === 'update_todo') {
    return {
      success: false,
      status: 'unavailable',
      data: {},
      message: '할 일 완료/수정은 생활 탭에서 직접 처리할 수 있습니다. 음성으로 상태를 바꾸는 기능은 아직 연결되지 않았습니다.',
      error: { code: 'no_skill_available' },
    }
  }

  if (ctx.intent === 'list_todo') {
    const items = loadReminders().filter((r) => !r.done)
    return {
      success: true,
      status: 'completed',
      data: { count: items.length },
      message: items.length ? items.map((r, i) => `${i + 1}. ${r.text}`).join('\n') : '남은 할 일이 없습니다.',
      speakText: items.length ? `할 일 ${items.length}개예요.` : '남은 할 일이 없어요.',
      uiActions: [{ type: 'OPEN_ROUTE', payload: { view: 'life' } }],
      brainPatch: { view: 'life' },
      error: null,
    }
  }

  const text = ctx.request.normalizedText || ctx.request.text
  const item =
    (typeof ctx.entities.item === 'string' && ctx.entities.item) ||
    text
      .replace(/^(?:리마인더|할\s*일|기억시켜)\s*/i, '')
      .replace(/\s*(?:기억시켜|할\s*일에\s*넣어)$/i, '')
      .trim()
  if (!item || /목록|보여|리스트/.test(item)) {
    return {
      success: false,
      status: 'needs_user_action',
      data: {},
      message: '추가할 할 일을 말해 주세요. 예: 「할 일 우유 사기」',
      error: { code: 'user_action_required' },
    }
  }
  const created = addReminder(item)
  return {
    success: true,
    status: 'completed',
    data: { id: created.id },
    message: `할 일 추가: ${created.text}`,
    speakText: '할 일을 추가했어요.',
    error: null,
  }
}
