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
    switch (err.kind) {
      case 'offline':
        return '인터넷 연결이 없어 AI 서버에 연결할 수 없습니다. 로컬 명령은 「도움말」을 참고하세요.'
      case 'network':
        return 'AI 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      case 'auth':
        return 'AI 인증 설정이 필요합니다. 설정에서 API 키를 확인해 주세요.'
      case 'rate_limit':
        return 'AI 사용량 또는 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
      case 'timeout':
        return 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.'
      case 'cancelled':
        return '요청이 취소되었습니다.'
      case 'bad_response':
        return 'AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.'
      case 'config':
        return 'AI 설정이 비어 있습니다. 설정에 API 키를 넣어 주세요.'
      case 'unavailable':
        return '현재 AI를 일시적으로 사용할 수 없습니다.'
      default:
        return 'AI 처리 중 오류가 발생했습니다. 로컬 명령은 「도움말」을 참고하세요.'
    }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return '인터넷 연결이 없어 AI 서버에 연결할 수 없습니다. 로컬 명령은 「도움말」을 참고하세요.'
  }
  return 'AI 처리 중 오류가 발생했습니다. 로컬 명령은 「도움말」을 참고하세요.'
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
