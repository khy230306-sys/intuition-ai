import type { CoreIntent, SafetyLevel } from './types'
import { CoreBrainError } from './brainErrors'

/** Level 3 phrases — never auto-execute in Core Brain. */
const LEVEL3 =
  /결제|결제해|송금|이체|계좌\s*이체|카드\s*번호|비밀번호|패스워드|api\s*key|오토\s*배팅|자동\s*주문|주문\s*결제|계정\s*삭제|회원\s*탈퇴|파일\s*전부\s*삭제|전체\s*삭제\s*해/i

const INTENT_LEVEL: Partial<Record<CoreIntent, SafetyLevel>> = {
  general_chat: 1,
  ask_information: 1,
  summarize: 1,
  translate: 1,
  play_music: 1,
  control_music: 1,
  search_note: 1,
  list_todo: 1,
  list_calendar: 1,
  project_status: 1,
  app_navigation: 1,
  help: 1,
  create_note: 2,
  create_todo: 2,
  update_todo: 2,
  create_calendar_event: 2,
  change_setting: 2,
  project_planning: 2,
  unknown: 1,
}

export function safetyLevelForIntent(intent: CoreIntent): SafetyLevel {
  return INTENT_LEVEL[intent] ?? 1
}

export function assertSafeToExecute(text: string, intent: CoreIntent): void {
  if (LEVEL3.test(text)) {
    throw new CoreBrainError('unsafe_action', 'Blocked level-3 action')
  }
  if (safetyLevelForIntent(intent) >= 3) {
    throw new CoreBrainError('unsafe_action', 'Intent marked level-3')
  }
}

/** Allowlist for OPEN_EXTERNAL_URL ui actions. */
export function isAllowedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const host = u.hostname.toLowerCase()
    const allow = [
      'www.youtube.com',
      'youtube.com',
      'music.youtube.com',
      'open.spotify.com',
      'music.apple.com',
      'www.google.com',
      'maps.google.com',
      'translate.google.com',
      'jarvis-app.shipstatic.com',
    ]
    return allow.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}
