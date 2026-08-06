/**
 * Offline recovery helpers — local reads stay available; live APIs keep state.
 */

export type OfflineReadableDomain =
  | 'calendar'
  | 'family'
  | 'travel'
  | 'restaurant'
  | 'vision'
  | 'memory'
  | 'todo'

export function isBrowserOnline(): boolean {
  try {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false
  } catch {
    return true
  }
}

export function offlineReadAllowed(domain: OfflineReadableDomain): boolean {
  void domain
  return true
}

export function offlineLiveApiMessage(domain: OfflineReadableDomain | 'weather' | 'translation' | 'flight' | 'hotel'): string {
  return `오프라인입니다. ${domainLabel(domain)} 실시간 조회는 인터넷 연결 후 다시 시도할 수 있어요. 저장된 기록은 그대로 볼 수 있습니다.`
}

function domainLabel(domain: string): string {
  const map: Record<string, string> = {
    calendar: '일정',
    family: '가족',
    travel: '여행',
    restaurant: '맛집',
    vision: '카메라',
    memory: '기억',
    todo: '할 일',
    weather: '날씨',
    translation: '번역',
    flight: '항공',
    hotel: '호텔',
  }
  return map[domain] || '해당 기능'
}

export type OfflineCapabilityReport = {
  online: boolean
  readable: OfflineReadableDomain[]
  liveBlocked: string[]
}

export function offlineCapabilityReport(): OfflineCapabilityReport {
  const online = isBrowserOnline()
  const readable: OfflineReadableDomain[] = [
    'calendar',
    'family',
    'travel',
    'restaurant',
    'vision',
    'memory',
    'todo',
  ]
  return {
    online,
    readable,
    liveBlocked: online ? [] : ['weather', 'translation', 'flight', 'hotel', 'restaurant.search'],
  }
}
