/**
 * Feature truth registry — classification for audit + UI gating.
 * Status is evidence-based (see docs/AIZIO_FEATURE_TRUTH_AUDIT.md).
 */

export type TruthStatus = 'REAL' | 'PARTIAL' | 'FAKE' | 'BROKEN'

export type FeatureTruth = {
  id: string
  title: string
  status: TruthStatus
  /** Hide from More hub / quick-action picker (still routable for hash → unavailable UI). */
  hideFromUserMenu?: boolean
  notes: string
}

/** Features that must not appear as working product surfaces. */
export const FAKE_MENU_IDS = new Set(['travel', 'restaurant'])

export const FEATURE_TRUTH: FeatureTruth[] = [
  {
    id: 'chat-llm',
    title: '대화 / LLM',
    status: 'PARTIAL',
    notes: 'API 키 있으면 hybrid LLM; 없으면 로컬 스킬·규칙 응답',
  },
  {
    id: 'weather',
    title: '날씨',
    status: 'PARTIAL',
    notes: '홈 Open-Meteo 실조회; 채팅은 캐시 또는 Google 검색 열기',
  },
  {
    id: 'fx',
    title: '환율',
    status: 'PARTIAL',
    notes: '실 API + 오프라인 시 라벨된 fallback 환율',
  },
  {
    id: 'stocks',
    title: '주식',
    status: 'PARTIAL',
    notes: 'Yahoo/스냅샷 + localStorage 관심종목',
  },
  {
    id: 'navigation',
    title: '길안내',
    status: 'PARTIAL',
    notes: 'Photon/Nominatim/OSRM 또는 근사·외부 지도 URL',
  },
  {
    id: 'translate',
    title: '번역',
    status: 'REAL',
    notes: 'MyMemory API + 오프라인 사전 캐시',
  },
  {
    id: 'news',
    title: '뉴스',
    status: 'PARTIAL',
    notes: '인앱 피드 없음 — Google 검색 열기',
  },
  {
    id: 'music',
    title: '음악',
    status: 'REAL',
    notes: 'YouTube 검색 URL 오픈 (가짜 트랙 목록 없음)',
  },
  {
    id: 'calendar-life',
    title: '일정·할일·알림',
    status: 'REAL',
    notes: 'localStorage + Notification/타이머',
  },
  {
    id: 'family',
    title: '가족/멤버',
    status: 'REAL',
    notes: 'localStorage + MQTT P2P',
  },
  {
    id: 'friends',
    title: '친구',
    status: 'REAL',
    notes: 'localStorage + MQTT P2P',
  },
  {
    id: 'travel',
    title: '여행·항공·호텔',
    status: 'FAKE',
    hideFromUserMenu: true,
    notes: '기본 DEMO 시드 목록; Live 어댑터는 throw stub',
  },
  {
    id: 'restaurant',
    title: '맛집·예약',
    status: 'FAKE',
    hideFromUserMenu: true,
    notes: '기본 DEMO 시드 식당; External provider stub',
  },
  {
    id: 'ai-camera',
    title: 'AI 카메라',
    status: 'PARTIAL',
    notes: '키 있으면 실 Vision; 없으면 데모 fallback(차단 대상)',
  },
  {
    id: 'push',
    title: '푸시 알림',
    status: 'PARTIAL',
    notes: '서버 URL/VAPID 필요; 미설정 시 로컬 알림만',
  },
  {
    id: 'lifeos',
    title: 'Life OS / DNA',
    status: 'REAL',
    notes: '로컬 저장소 전용',
  },
  {
    id: 'customers',
    title: '손님관리',
    status: 'REAL',
    notes: 'localStorage CRM',
  },
  {
    id: 'games',
    title: '게임·로또·주사위',
    status: 'REAL',
    notes: '오프라인/로컬 RNG (엔터테인먼트)',
  },
  {
    id: 'encyclopedia',
    title: '百科/사전',
    status: 'REAL',
    notes: 'Wikipedia/Wiktionary REST',
  },
  {
    id: 'expense',
    title: '가계부',
    status: 'REAL',
    notes: 'localStorage',
  },
  {
    id: 'actions',
    title: '빠른 실행',
    status: 'REAL',
    notes: '외부 앱/웹 스킴',
  },
  {
    id: 'lifestyle',
    title: '라이프스타일 추천',
    status: 'REAL',
    notes: '아이디어+지도/검색 열기 (가짜 랭킹 없음)',
  },
  {
    id: 'backup',
    title: '백업·진단',
    status: 'REAL',
    notes: '로컬 JSON 백업 / release health',
  },
  {
    id: 'i18n',
    title: '앱 언어',
    status: 'PARTIAL',
    notes: '일부 UI 키만 다국어',
  },
  {
    id: 'travel-live-adapters',
    title: 'Travel Live Providers',
    status: 'BROKEN',
    notes: 'Duffel/Amadeus/Expedia 클래스가 live search에서 throw',
  },
  {
    id: 'restaurant-external',
    title: 'Restaurant External Provider',
    status: 'BROKEN',
    notes: 'ExternalRestaurantProvider stub throw',
  },
]

export function isHiddenFromUserMenu(featureId: string): boolean {
  return FAKE_MENU_IDS.has(featureId)
}

export function truthById(id: string): FeatureTruth | undefined {
  return FEATURE_TRUTH.find((f) => f.id === id)
}
