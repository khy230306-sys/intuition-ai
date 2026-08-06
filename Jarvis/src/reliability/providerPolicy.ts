/**
 * Provider timeout / retry policy.
 * Auto-retry only for idempotent reads. Never auto-retry booking/payment/create.
 */

export type ProviderKind =
  | 'translation'
  | 'weather'
  | 'flight'
  | 'hotel'
  | 'restaurant'
  | 'vision'
  | 'calendar'
  | 'generic'

const TIMEOUT_MS: Record<ProviderKind, number> = {
  translation: 12_000,
  weather: 10_000,
  flight: 15_000,
  hotel: 15_000,
  restaurant: 12_000,
  vision: 20_000,
  calendar: 8_000,
  generic: 12_000,
}

export function providerTimeoutMs(kind: ProviderKind): number {
  return TIMEOUT_MS[kind] || TIMEOUT_MS.generic
}

/** Idempotent read/search only — never booking confirm / payment / create */
export function isIdempotentProviderOp(op: string): boolean {
  const o = op.toLowerCase()
  if (/(confirm|book|pay|create|write|reserve|결제|예약\s*확정)/.test(o)) return false
  return /(search|query|read|list|details|availability|lookup|translate|forecast)/.test(o)
}

export function shouldAutoRetry(op: string, attempt: number, maxAttempts = 2): boolean {
  if (attempt >= maxAttempts) return false
  return isIdempotentProviderOp(op)
}

export async function withProviderTimeout<T>(
  kind: ProviderKind,
  fn: () => Promise<T>,
  ms = providerTimeoutMs(kind),
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('PROVIDER-TIMEOUT')), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export type ProviderFailurePolicy = {
  keepSession: boolean
  allowGeneralChatFallback: boolean
  userMessage: string
  errorCode: string
}

/** On provider failure: keep mode/session, never silently switch to GENERAL_CHAT. */
export function providerFailurePolicy(
  domain: 'translation' | 'weather' | 'travel' | 'flight' | 'hotel' | 'restaurant',
): ProviderFailurePolicy {
  if (domain === 'translation') {
    return {
      keepSession: true,
      allowGeneralChatFallback: false,
      userMessage: '번역 연결에 실패했습니다. 번역 모드는 유지되어 있으니 다시 시도해 주세요.',
      errorCode: 'TRANSLATE-001',
    }
  }
  if (domain === 'weather') {
    return {
      keepSession: true,
      allowGeneralChatFallback: false,
      userMessage: '날씨 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
      errorCode: 'WEATHER-001',
    }
  }
  if (domain === 'flight') {
    return {
      keepSession: true,
      allowGeneralChatFallback: false,
      userMessage: '항공편 검색 연결에 실패했습니다. 조건은 그대로 저장되어 있어 다시 시도할 수 있습니다.',
      errorCode: 'FLIGHT-001',
    }
  }
  if (domain === 'hotel') {
    return {
      keepSession: true,
      allowGeneralChatFallback: false,
      userMessage: '호텔 검색 연결에 실패했습니다. 조건은 그대로 저장되어 있어 다시 시도할 수 있습니다.',
      errorCode: 'HOTEL-001',
    }
  }
  if (domain === 'restaurant') {
    return {
      keepSession: true,
      allowGeneralChatFallback: false,
      userMessage: '맛집 검색 연결에 실패했습니다. 조건은 그대로 저장되어 있어 다시 시도할 수 있습니다.',
      errorCode: 'RESTAURANT-001',
    }
  }
  return {
    keepSession: true,
    allowGeneralChatFallback: false,
    userMessage: '여행 검색 연결에 실패했습니다. 조건은 그대로 저장되어 있어 다시 시도할 수 있습니다.',
    errorCode: 'TRAVEL-001',
  }
}
