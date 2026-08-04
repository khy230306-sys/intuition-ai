import type { View } from '../../types'
import type { SkillContext, SkillResult } from '../types'

const VIEWS: View[] = [
  'chat',
  'invest',
  'life',
  'family',
  'friends',
  'games',
  'actions',
  'settings',
  'global',
  'customers',
  'navigation',
]

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'app_navigation'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const raw = ctx.entities.view
  const view = typeof raw === 'string' && (VIEWS as string[]).includes(raw) ? (raw as View) : null
  if (!view) {
    return {
      success: false,
      status: 'needs_user_action',
      data: {},
      message: '이동할 메뉴를 말해 주세요. 예: 「설정 열어줘」 · 「가족 화면 가줘」',
      error: { code: 'user_action_required' },
    }
  }
  const labels: Record<View, string> = {
    chat: '대화',
    invest: '투자',
    life: '생활',
    family: '가족',
    friends: '친구',
    games: '게임',
    actions: '액션',
    settings: '설정',
    global: '글로벌',
    customers: '손님관리',
    navigation: '길안내',
  }
  return {
    success: true,
    status: 'completed',
    data: { view },
    message: `${labels[view]} 화면을 엽니다.`,
    speakText: `${labels[view]}로 이동할게요.`,
    uiActions: [{ type: 'OPEN_ROUTE', payload: { view } }],
    brainPatch: { view, speak: true },
    error: null,
  }
}
