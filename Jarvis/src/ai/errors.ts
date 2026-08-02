export type AiErrorKind =
  | 'offline'
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'cancelled'
  | 'bad_response'
  | 'unavailable'
  | 'config'
  | 'unknown'

export class AiError extends Error {
  readonly kind: AiErrorKind
  readonly status?: number
  readonly retryable: boolean

  constructor(kind: AiErrorKind, message: string, opts?: { status?: number; retryable?: boolean; cause?: unknown }) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
    this.status = opts?.status
    this.retryable = opts?.retryable ?? false
    if (opts?.cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = opts.cause
    }
  }
}

export function userFacingAiError(err: unknown): string {
  if (err instanceof AiError) {
    const msg = err.message || ''
    if (msg.includes('현재 AI가 연결되지 않았습니다') || msg.includes('기본 기능은')) {
      return msg
    }
    switch (err.kind) {
      case 'offline':
        return '인터넷 연결이 없어 AI 답변을 받을 수 없습니다. 일정·메모·알림 등 기본 기능은 계속 사용할 수 있습니다.'
      case 'network':
        return 'AI 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      case 'auth':
        if (/결제|payment|billing|credit/i.test(msg)) {
          return '이 제공자는 결제 설정이 필요합니다.'
        }
        return 'API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.'
      case 'rate_limit':
        if (/무료|quota|daily|한도/i.test(msg)) {
          return '오늘 사용할 수 있는 무료 AI 한도를 모두 사용했습니다. 다른 무료 AI로 전환하거나 나중에 다시 시도해 주세요.'
        }
        return '요청이 너무 많습니다. 잠시 후 자동으로 다시 시도합니다.'
      case 'timeout':
        return 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.'
      case 'cancelled':
        return '요청이 취소되었습니다.'
      case 'bad_response':
        return 'AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.'
      case 'config':
        return msg.length > 10
          ? msg
          : 'AI 제공자 설정이 필요합니다. 설정에서 무료 AI를 연결하거나 기본 기능만 사용할 수 있습니다.'
      case 'unavailable':
        return msg.length > 10
          ? msg
          : '현재 연결된 AI를 사용할 수 없습니다. 기본 기능은 정상적으로 사용할 수 있습니다.'
      default:
        return 'AI 처리 중 오류가 발생했습니다. 일정·메모·알림 등 기본 기능은 계속 사용할 수 있습니다.'
    }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return '인터넷 연결이 없어 AI 답변을 받을 수 없습니다. 일정·메모·알림 등 기본 기능은 계속 사용할 수 있습니다.'
  }
  return 'AI 처리 중 오류가 발생했습니다. 일정·메모·알림 등 기본 기능은 계속 사용할 수 있습니다.'
}

/** Strip secrets from diagnostic strings. */
export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9]{10,}/g, 'sk-[REDACTED]')
    .replace(/api[_-]?key["']?\s*[:=]\s*["'][^"']+["']/gi, 'api_key=[REDACTED]')
}

export function classifyHttpError(status: number, body = ''): AiError {
  const slice = redactSecrets(body).slice(0, 180)
  if (status === 401 || status === 403) {
    return new AiError('auth', `API 인증 오류 (${status})`, { status, retryable: false })
  }
  if (status === 429) {
    return new AiError('rate_limit', `사용량 초과 (${status})`, { status, retryable: true })
  }
  if (status >= 500) {
    return new AiError('unavailable', `AI 서버 오류 (${status})${slice ? `: ${slice}` : ''}`, {
      status,
      retryable: true,
    })
  }
  if (status >= 400) {
    return new AiError('bad_response', `요청 오류 (${status})${slice ? `: ${slice}` : ''}`, {
      status,
      retryable: false,
    })
  }
  return new AiError('unknown', `API 오류 (${status})`, { status, retryable: false })
}
