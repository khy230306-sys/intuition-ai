import { AiError, classifyHttpError, redactSecrets, type AiErrorKind } from '../ai/errors'

export type HybridErrorCode =
  | 'missing_key'
  | 'invalid_key'
  | 'quota'
  | 'rate_limit'
  | 'payment_required'
  | 'model_unavailable'
  | 'network'
  | 'offline'
  | 'server'
  | 'cancelled'
  | 'all_failed'
  | 'unknown'

export function classifyProviderBody(status: number, body = ''): AiError {
  const lower = body.toLowerCase()
  const base = classifyHttpError(status, body)

  if (status === 402 || /payment|billing|insufficient.?credit|credit.?balance/i.test(lower)) {
    return new AiError('auth', `결제 또는 크레딧이 필요합니다 (${status})`, {
      status,
      retryable: false,
    })
  }

  if (
    /quota|resource.?exhausted|free.?tier|daily.?limit|rate.?limit.?exceeded|usage.?limit/i.test(
      lower,
    )
  ) {
    if (status === 429 || /rate.?limit/i.test(lower)) {
      return new AiError('rate_limit', `속도 제한 또는 무료 한도 (${status})`, {
        status,
        retryable: true,
      })
    }
    return new AiError('rate_limit', `무료 사용량 한도 (${status})`, { status, retryable: true })
  }

  if (status === 404 || /model.?not.?found|no longer available|unknown model/i.test(lower)) {
    return new AiError('unavailable', `모델을 사용할 수 없습니다 (${status})`, {
      status,
      retryable: true,
    })
  }

  return base
}

export function hybridUserMessage(code: HybridErrorCode): string {
  switch (code) {
    case 'missing_key':
      return 'AI 제공자 설정이 필요합니다. 설정에서 무료 AI를 연결하거나 기본 기능만 사용할 수 있습니다.'
    case 'invalid_key':
      return 'API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.'
    case 'quota':
      return '오늘 사용할 수 있는 무료 AI 한도를 모두 사용했습니다. 다른 무료 AI로 전환하거나 나중에 다시 시도해 주세요.'
    case 'rate_limit':
      return '요청이 너무 많습니다. 잠시 후 자동으로 다시 시도합니다.'
    case 'payment_required':
      return '이 제공자는 결제 설정이 필요합니다.'
    case 'model_unavailable':
      return '선택한 모델을 현재 사용할 수 없습니다. 다른 모델을 선택해 주세요.'
    case 'network':
      return 'AI 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    case 'offline':
      return '인터넷 연결이 없어 AI 답변을 받을 수 없습니다. 일정·메모·알림 등 기본 기능은 계속 사용할 수 있습니다.'
    case 'server':
      return 'AI 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
    case 'cancelled':
      return '요청이 취소되었습니다.'
    case 'all_failed':
      return '현재 연결된 AI를 사용할 수 없습니다. 기본 기능은 정상적으로 사용할 수 있습니다.'
    default:
      return 'AI 처리 중 오류가 발생했습니다. 일정·메모·알림 등 기본 기능은 계속 사용할 수 있습니다.'
  }
}

export function mapAiErrorToHybrid(err: unknown): HybridErrorCode {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (!(err instanceof AiError)) return 'unknown'
  const kind: AiErrorKind = err.kind
  const msg = err.message.toLowerCase()
  if (kind === 'cancelled') return 'cancelled'
  if (kind === 'offline') return 'offline'
  if (kind === 'network') return 'network'
  if (kind === 'config') return 'missing_key'
  if (kind === 'auth') {
    if (/결제|payment|billing|credit/i.test(msg)) return 'payment_required'
    return 'invalid_key'
  }
  if (kind === 'rate_limit') {
    if (/무료|quota|daily|한도/i.test(msg) && !/속도|rate/i.test(msg)) return 'quota'
    if (/quota|free.?tier|daily/i.test(msg)) return 'quota'
    return 'rate_limit'
  }
  if (kind === 'unavailable' && /모델/i.test(msg)) return 'model_unavailable'
  if (kind === 'unavailable') return 'server'
  return 'unknown'
}

export function userFacingHybridError(err: unknown): string {
  return hybridUserMessage(mapAiErrorToHybrid(err))
}

export function safeErrorLog(err: unknown): string {
  if (err instanceof Error) return redactSecrets(err.message)
  return redactSecrets(String(err))
}

/** Errors safe to try the next free provider. */
export function isFallbackableError(err: unknown): boolean {
  if (!(err instanceof AiError)) return false
  if (err.kind === 'cancelled' || err.kind === 'config') return false
  if (err.kind === 'auth' && /결제|payment|billing/i.test(err.message)) return false
  // Invalid key on one provider — try next configured free provider
  if (err.kind === 'auth') return true
  if (err.kind === 'offline') return false
  return (
    err.kind === 'network' ||
    err.kind === 'rate_limit' ||
    err.kind === 'unavailable' ||
    err.kind === 'timeout' ||
    (err.kind === 'bad_response' && Boolean(err.status && err.status >= 500))
  )
}
