/**
 * Feature-level crash isolation — one domain failure must not blank the app.
 */

export type IsolatedFeature =
  | 'chat'
  | 'router'
  | 'translation'
  | 'calendar'
  | 'family'
  | 'vision'
  | 'travel'
  | 'restaurant'
  | 'provider'

export type IsolationResult<T> =
  | { ok: true; value: T; feature: IsolatedFeature }
  | { ok: false; feature: IsolatedFeature; errorCode: string; userMessage: string }

const FALLBACK: Record<IsolatedFeature, string> = {
  chat: '대화 처리 중 문제가 생겼어요. 다시 말해 주세요.',
  router: '명령을 이해하지 못했어요. 다시 한 번 말씀해 주세요.',
  translation: '번역 처리 중 문제가 생겼어요. 번역 모드는 유지됩니다.',
  calendar: '일정 처리 중 문제가 생겼어요. 저장된 일정은 그대로입니다.',
  family: '가족 기능 처리 중 문제가 생겼어요.',
  vision: '카메라/비전 처리 중 문제가 생겼어요.',
  travel: '여행 기능 처리 중 문제가 생겼어요. 조건은 저장되어 있습니다.',
  restaurant: '맛집 기능 처리 중 문제가 생겼어요. 조건은 저장되어 있습니다.',
  provider: '외부 서비스 연결에 실패했습니다. 다시 시도할 수 있어요.',
}

export async function isolateFeature<T>(
  feature: IsolatedFeature,
  fn: () => Promise<T> | T,
): Promise<IsolationResult<T>> {
  try {
    const value = await fn()
    return { ok: true, value, feature }
  } catch {
    return {
      ok: false,
      feature,
      errorCode: 'ROUTER-001',
      userMessage: FALLBACK[feature],
    }
  }
}

export function isolationUserMessage(feature: IsolatedFeature): string {
  return FALLBACK[feature]
}
