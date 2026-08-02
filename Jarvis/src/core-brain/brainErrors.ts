import type { BrainErrorCode } from './types'

export class CoreBrainError extends Error {
  readonly code: BrainErrorCode
  constructor(code: BrainErrorCode, message: string) {
    super(message)
    this.name = 'CoreBrainError'
    this.code = code
  }
}

export function userFacingBrainError(code: BrainErrorCode, localeHint = 'ko'): string {
  const ko: Record<BrainErrorCode, string> = {
    invalid_input: '요청을 이해하지 못했어요. 조금 다르게 말해 주세요.',
    intent_failed: '요청을 분류하지 못했어요. 다시 한 번 말씀해 주세요.',
    no_skill_available: '현재 이 기능은 연결되어 있지 않습니다.',
    skill_timeout: '요청 시간이 초과되었습니다. 다시 시도해 주세요.',
    skill_failed: '기능을 실행하는 중 문제가 생겼습니다. 다시 시도해 주세요.',
    ai_unavailable: 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    network_offline: '인터넷 연결이 없어 이 요청을 처리할 수 없습니다.',
    user_action_required: '계속하려면 화면에서 확인이 필요합니다.',
    unsafe_action: '이 요청은 보안상 자동으로 실행할 수 없습니다.',
    cancelled: '요청이 취소되었습니다.',
    unexpected_error: '예상하지 못한 오류가 발생했습니다. 다시 시도해 주세요.',
  }
  if (localeHint.startsWith('en')) {
    const en: Partial<Record<BrainErrorCode, string>> = {
      no_skill_available: 'This feature is not connected yet.',
      network_offline: 'You appear to be offline.',
      unsafe_action: 'This action cannot be run automatically.',
      skill_timeout: 'The request timed out. Please try again.',
    }
    return en[code] || ko[code]
  }
  return ko[code]
}
