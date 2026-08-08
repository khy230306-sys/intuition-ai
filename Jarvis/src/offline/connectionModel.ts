/**
 * Connection + feature capability model for AIZIO Anywhere / Flight Mode.
 * Keep this thin — do not rewrite the whole app around it.
 */

export type ConnectionKind = 'ONLINE' | 'OFFLINE' | 'CAPTIVE_PORTAL' | 'DEGRADED'

export type FeatureNetworkNeed = 'LOCAL_AVAILABLE' | 'NETWORK_REQUIRED' | 'NETWORK_OPTIONAL'

export type FeatureCapabilityId =
  | 'chat_local'
  | 'calendar'
  | 'todo'
  | 'notes'
  | 'settings'
  | 'memory'
  | 'offline_dict'
  | 'weather'
  | 'places'
  | 'ai_llm'
  | 'maps_tiles'
  | 'music_stream'
  | 'flight_hotel'
  | 'push_sync'

const FEATURE_NEED: Record<FeatureCapabilityId, FeatureNetworkNeed> = {
  chat_local: 'LOCAL_AVAILABLE',
  calendar: 'LOCAL_AVAILABLE',
  todo: 'LOCAL_AVAILABLE',
  notes: 'LOCAL_AVAILABLE',
  settings: 'LOCAL_AVAILABLE',
  memory: 'LOCAL_AVAILABLE',
  offline_dict: 'LOCAL_AVAILABLE',
  weather: 'NETWORK_REQUIRED',
  places: 'NETWORK_REQUIRED',
  ai_llm: 'NETWORK_REQUIRED',
  maps_tiles: 'NETWORK_REQUIRED',
  music_stream: 'NETWORK_REQUIRED',
  flight_hotel: 'NETWORK_REQUIRED',
  push_sync: 'NETWORK_OPTIONAL',
}

export function featureNetworkNeed(id: FeatureCapabilityId): FeatureNetworkNeed {
  return FEATURE_NEED[id]
}

export function featureUsableOffline(id: FeatureCapabilityId): boolean {
  return FEATURE_NEED[id] === 'LOCAL_AVAILABLE'
}

export function connectionAllowsNetwork(kind: ConnectionKind): boolean {
  return kind === 'ONLINE' || kind === 'DEGRADED'
}

/** Map probe outcomes → connection kind (captive = "online" browser but health fails oddly). */
export function classifyConnection(input: {
  navigatorOnline: boolean
  healthOk: boolean | null
  healthStatus?: number
}): ConnectionKind {
  if (!input.navigatorOnline) return 'OFFLINE'
  if (input.healthOk === true) return 'ONLINE'
  if (input.healthOk === false) {
    // HTTP 200 HTML login walls often look like ok; our probe expects JSON build-meta.
    // Non-JSON / unexpected status → captive or degraded.
    const st = input.healthStatus
    if (st === 204 || st === 511 || st === 302 || st === 200) return 'CAPTIVE_PORTAL'
    return 'DEGRADED'
  }
  return 'DEGRADED'
}

export function connectionLabelKo(kind: ConnectionKind): string {
  switch (kind) {
    case 'ONLINE':
      return '온라인'
    case 'DEGRADED':
      return '제한된 연결'
    case 'CAPTIVE_PORTAL':
      return '로그인 필요 네트워크'
    case 'OFFLINE':
    default:
      return '오프라인 모드'
  }
}

export function offlineUserMessage(feature: FeatureCapabilityId): string {
  switch (feature) {
    case 'weather':
      return '현재 인터넷 연결이 없어 최신 날씨를 확인할 수 없어요. 연결되면 바로 확인할 수 있습니다.'
    case 'places':
      return '현재 인터넷 연결이 없어 장소를 검색할 수 없어요. 연결 후 다시 시도해 주세요.'
    case 'ai_llm':
      return '현재 오프라인이라 온라인 AI를 쓸 수 없어요. 일정·메모·할 일·저장된 대화는 그대로 이용할 수 있습니다.'
    case 'flight_hotel':
      return '현재 오프라인이라 실시간 항공·호텔 검색을 할 수 없어요. 저장된 여행 정보는 볼 수 있습니다.'
    case 'maps_tiles':
      return '현재 오프라인이라 새 지도를 불러올 수 없어요.'
    case 'music_stream':
      return '현재 오프라인이라 음악 스트리밍을 열 수 없어요.'
    case 'push_sync':
      return '오프라인이라 동기화는 연결 후 이어서 진행됩니다.'
    default:
      return '현재 오프라인이라 이 기능은 제한됩니다. 로컬에 저장된 데이터는 사용할 수 있습니다.'
  }
}
