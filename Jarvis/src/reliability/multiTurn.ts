/** Multi-turn reliability scenarios (20+). */

import type { MultiTurnScenario } from './types'

export const MULTI_TURN_SCENARIOS: MultiTurnScenario[] = [
  {
    id: 'mt-translation-a',
    name: 'EN translation session lifecycle',
    category: 'translation',
    setup: 'clear_all',
    steps: [
      { input: '지금부터 영어로 번역해줘', expectIntent: /translation\.session\.start/, expectText: /번역 모드/ },
      { input: '나 지금 출발해', expectText: /leave|leaving|I'm|I am/i, forbidText: /날씨를 확인/ },
      { input: '오늘 날씨가 정말 좋다', expectText: /weather|nice|today/i, forbidText: /날씨를 확인합니다/ },
      { input: '일본어로', expectText: /일본어/ },
      { input: '곧 도착해', forbidText: /날씨를 확인/ },
      { input: '번역 그만', expectText: /종료/ },
      { input: '오늘 날씨 알려줘', expectText: /날씨/ },
    ],
  },
  {
    id: 'mt-travel-osaka',
    name: 'Osaka travel plan multi-turn',
    category: 'travel',
    setup: 'clear_all',
    steps: [
      { input: '다음 달 오사카 가려고', expectText: /날짜|언제/ },
      { input: '10일부터 13일까지', expectText: /명/ },
      { input: '가족 3명', expectText: /출발/ },
      { input: '인천 출발', expectText: /DEMO|항공|대한|제주|피치|아시아나/i },
      { input: '두 번째가 좋아', expectText: /선택|항공|상세/ },
      { input: '호텔도 찾아줘', expectText: /호텔|DEMO/ },
      { input: '20만원 이하로', expectText: /호텔|DEMO|조건/ },
      { input: '첫 번째', expectText: /호텔|선택|상세/ },
      { input: '전체 얼마야?', expectText: /총|예상/ },
    ],
  },
  {
    id: 'mt-restaurant-samsan',
    name: 'Samsan family dinner',
    category: 'restaurant',
    setup: 'clear_all',
    steps: [
      { input: '오늘 저녁 가족들이랑 외식하려고', expectText: /지역/ },
      { input: '울산 삼산', expectText: /명/ },
      { input: '4명', expectText: /음식|한식/ },
      { input: '한식으로', expectText: /DEMO|식당|한식/ },
      { input: '주차되는 곳만', expectText: /주차|DEMO|식당/ },
      { input: '두 번째', expectText: /선택|상세|식당/ },
      { input: '7시 돼?', expectText: /예약|시간|가능|없/ },
      { input: '그럼 예약해줘', expectText: /예약 준비|DEMO|예약할까요|필요/ },
      { input: '응 예약해', expectText: /DEMO|전화|예약|확인|페이지/ },
    ],
  },
  {
    id: 'mt-weather-after-translate',
    name: 'Weather only after translation ends',
    category: 'translation',
    setup: 'clear_all',
    steps: [
      { input: '영어로 번역해줘', expectText: /번역/ },
      { input: '오늘 비 올 것 같아', forbidText: /날씨를 확인합니다/ },
      { input: '번역 종료', expectText: /종료/ },
      { input: '오늘 비 와?', expectText: /날씨|비|우산|기온|DEMO|조회|확인/ },
    ],
  },
  {
    id: 'mt-oneshot-collision',
    name: 'Oneshot translation never weather',
    category: 'translation',
    setup: 'clear_all',
    steps: [
      { input: '오늘 날씨가 좋다고 영어로 번역해줘', forbidText: /날씨를 확인합니다/ },
      { input: '오늘 날씨 알려줘', expectText: /날씨/ },
    ],
  },
  {
    id: 'mt-calendar-vs-translate',
    name: 'Calendar create vs translation',
    category: 'calendar',
    setup: 'clear_all',
    steps: [
      { input: '내일 병원 간다고 영어로 번역해줘', forbidText: /일정을 추가|등록했/ },
      { input: '내일 오후 3시에 병원 일정 추가해줘', expectIntent: /calendar\.create/ },
    ],
  },
  {
    id: 'mt-family-vs-translate',
    name: 'Family read vs translation',
    category: 'family',
    setup: 'clear_all',
    steps: [
      { input: '엄마 병원 일정 영어로 번역해줘', expectIntent: /translation/ },
      { input: '엄마 병원 일정 언제야?', expectIntent: /family\.schedule\.read/ },
    ],
  },
  {
    id: 'mt-flight-search-filter',
    name: 'Flight search then cheaper filter',
    category: 'travel',
    setup: 'clear_all',
    steps: [
      { input: '오사카 항공권 찾아줘', expectText: /편도|왕복|DEMO|항공|날짜|출발/ },
      { input: '왕복으로', expectText: /DEMO|항공|원|명|출발|날짜/ },
      { input: '더 싼 거 없어?', expectText: /DEMO|항공|원|조건|결과/ },
      { input: '직항만 보여줘', expectText: /직항|DEMO|항공|결과|조건/ },
    ],
  },
  {
    id: 'mt-restaurant-time-change',
    name: 'Restaurant time change after select',
    category: 'restaurant',
    setup: 'clear_all',
    steps: [
      // List browse returns results immediately (no party-size gate)
      { input: '울산 삼산 맛집', expectText: /DEMO|식당/ },
      { input: '첫 번째', expectText: /선택|상세/ },
      { input: '7시 반으로 해줘', expectText: /19:30|7:30|예약|가능|없|DEMO/ },
    ],
  },
  {
    id: 'mt-vision-vs-text-translate',
    name: 'Vision translation vs text',
    category: 'vision',
    setup: 'clear_all',
    steps: [
      { input: '이 사진 영어로 번역해줘', expectIntent: /vision\.translation/ },
      { input: '안녕하세요라고 영어로 번역해줘', expectIntent: /translation\.oneshot/ },
    ],
  },
  {
    id: 'mt-recipe-vs-restaurant',
    name: 'Recipe stays general',
    category: 'restaurant',
    setup: 'clear_all',
    steps: [
      { input: '김치찌개 만드는 법 알려줘', expectIntent: /general\.chat/ },
      { input: '삼산 한식 맛집', expectIntent: /restaurant\.search/ },
    ],
  },
  {
    id: 'mt-jeju-weather-vs-flight',
    name: 'Jeju weather vs flight',
    category: 'travel',
    setup: 'clear_all',
    steps: [
      { input: '제주도 날씨 알려줘', expectIntent: /weather\.query/ },
      { input: '제주도 비행기 알아봐줘', expectIntent: /travel\.flight/ },
    ],
  },
  {
    id: 'mt-lang-switch-in-session',
    name: 'Language switch inside translation',
    category: 'translation',
    setup: 'clear_all',
    steps: [
      { input: '지금부터 영어로 번역해줘', expectText: /영어/ },
      { input: '다시 영어로', expectText: /영어|번역/ },
      { input: '중국어로', expectText: /중국어|번역/ },
      { input: '번역 끝', expectText: /종료/ },
    ],
  },
  {
    id: 'mt-hotel-then-restaurant-trip',
    name: 'Travel hotel then restaurant ask',
    category: 'travel',
    setup: 'clear_all',
    steps: [
      { input: '다음 달 오사카 가려고', expectText: /날짜/ },
      { input: '10일부터 13일까지', expectText: /명/ },
      { input: '3명', expectText: /출발/ },
      { input: '인천 출발', expectText: /항공|DEMO/ },
      { input: '호텔도', expectText: /호텔|DEMO|찾아/ },
    ],
  },
  {
    id: 'mt-booking-weak-approval',
    name: 'Weak approval never books restaurant',
    category: 'restaurant',
    setup: 'clear_all',
    steps: [
      { input: '울산 삼산 맛집', expectText: /DEMO/ },
      { input: '첫 번째', expectText: /선택/ },
      { input: '예약해줘', expectText: /예약 준비|DEMO/ },
      { input: '좋네', expectText: /명확|응 예약해|자동으로 진행하지/ },
    ],
  },
  {
    id: 'mt-stop-only-in-mode',
    name: '그만 only ends translation when active',
    category: 'translation',
    setup: 'clear_all',
    steps: [
      { input: '그만', expectIntent: /general|clarify|translation\.session\.end/ },
      { input: '영어로 번역해줘', expectText: /번역/ },
      { input: '그만', expectText: /종료/ },
    ],
  },
  {
    id: 'mt-music-vs-translate',
    name: 'Music after translation end',
    category: 'music',
    setup: 'clear_all',
    steps: [
      { input: '영어로 번역해줘', expectText: /번역/ },
      { input: '번역 그만', expectText: /종료/ },
      { input: '음악 틀어줘', expectIntent: /music\.play/ },
    ],
  },
  {
    id: 'mt-memory-save',
    name: 'Memory save path',
    category: 'memory',
    setup: 'clear_all',
    steps: [
      { input: '이거 기억해줘 내 차는 파란색', expectIntent: /memory\.save/ },
    ],
  },
  {
    id: 'mt-camera-open',
    name: 'Camera open',
    category: 'vision',
    setup: 'clear_all',
    steps: [{ input: '카메라 열어줘', expectIntent: /vision\.open/ }],
  },
  {
    id: 'mt-todo-create',
    name: 'Todo create',
    category: 'calendar',
    setup: 'clear_all',
    steps: [{ input: '오늘 할 일 추가해줘', expectIntent: /todo\.create/ }],
  },
  {
    id: 'mt-travel-booking-prepare',
    name: 'Travel booking prepare soft path',
    category: 'travel',
    setup: 'clear_all',
    steps: [
      { input: '다음 주 금요일 제주 가는 비행기 찾아줘', expectText: /편도|왕복|DEMO|항공/ },
      { input: '편도', expectText: /DEMO|항공/ },
      { input: '첫 번째', expectText: /선택|항공/ },
      { input: '이걸로 예약해줘', expectText: /예약|DEMO|준비|Provider|결제/ },
    ],
  },
]

export function multiTurnCount(): number {
  return MULTI_TURN_SCENARIOS.length
}
