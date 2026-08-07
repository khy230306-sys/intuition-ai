/**
 * Golden Command Set — 200+ real-usage Korean utterances.
 * Metadata only in metrics; full inputs live in test fixtures.
 */

import type { GoldenCase } from './types'

function g(
  category: string,
  input: string,
  expectedIntent: string | RegExp,
  opts?: Partial<GoldenCase>,
): GoldenCase {
  return {
    id: `${category}-${input.slice(0, 24)}`,
    category,
    input,
    expectedIntent,
    forbiddenActions: opts?.forbiddenActions || [],
    expectedAction: opts?.expectedAction,
    expectedModeTransition: opts?.expectedModeTransition,
    requiredEntities: opts?.requiredEntities,
  }
}

const GENERAL: GoldenCase[] = [
  '안녕',
  '안녕하세요',
  '고마워',
  '수고했어',
  '잘 자',
  '심심해',
  '오늘 기분이 좋아',
  '뭐 하고 있어',
  '너는 누구야',
  '도움이 필요해',
  '농담 해봐',
  '명언 알려줘',
  '오늘 하루 정리해줘',
  '오늘 뭐하지',
  '심심한데 얘기하자',
  '하이',
  '헬로',
  '좋은 아침',
  '저녁 먹었어',
  '그냥 대화하자',
].map((s) => g('general', s, /general\.chat|clarify/))

const TRANSLATION: GoldenCase[] = [
  g('translation', '지금부터 영어로 번역해줘', 'translation.session.start', {
    forbiddenActions: ['weather', 'calendar'],
    expectedModeTransition: 'translation',
  }),
  g('translation', '영어로 번역해줘', 'translation.session.start', { forbiddenActions: ['weather'] }),
  g('translation', '일본어로 번역해줘', 'translation.session.start'),
  g('translation', '중국어로 번역해줘', 'translation.session.start'),
  g('translation', '한국어로 번역해줘', 'translation.session.start'),
  g('translation', '앞으로 영어로 번역해줘', 'translation.session.start'),
  g('translation', '이제부터 일본어로 번역해줘', 'translation.session.start'),
  g('translation', '번역 시작', 'translation.session.start'),
  g('translation', '번역 모드', 'translation.session.start'),
  g('translation', '통역해줘', 'translation.session.start'),
  g('translation', '통역 시작', 'translation.session.start'),
  g('translation', '영어 통역해줘', 'translation.session.start'),
  g('translation', '영어로 바꿔줘', 'translation.session.start'),
  g('translation', '영어 번역', 'translation.session.start'),
  g('translation', '베트남어로 번역해줘', 'translation.session.start'),
  g('translation', '스페인어로 번역해줘', 'translation.session.start'),
  g('translation', '프랑스어로 번역해줘', 'translation.session.start'),
  g('translation', '독일어로 번역해줘', 'translation.session.start'),
  g('translation', '태국어로 번역해줘', 'translation.session.start'),
  g('translation', '나는 지금 집에 간다고 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['weather', 'calendar'],
  }),
  g('translation', '오늘 날씨가 좋다고 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['weather'],
  }),
  g('translation', '"오늘 날씨 어때?"를 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['weather'],
  }),
  g('translation', '내일 병원 간다고 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['calendar', 'weather'],
  }),
  g('translation', '엄마 병원 일정 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['family', 'calendar'],
  }),
  g('translation', '식당 예약 얘기를 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['restaurant'],
  }),
  g('translation', '날씨 때문에 늦었어라고 영어로 번역해줘', 'translation.oneshot', {
    forbiddenActions: ['weather'],
  }),
  g('translation', '이 문장을 일본어로 번역해줘', /translation\./),
  g('translation', 'Hello를 한국어로 번역해줘', 'translation.oneshot'),
  g('translation', '「안녕하세요」를 일본어로 번역해줘', 'translation.oneshot'),
  g('translation', '계속 영어로 번역해줘', 'translation.session.start'),
]

const WEATHER: GoldenCase[] = [
  '오늘 날씨 알려줘',
  '지금 날씨 어때?',
  '내일 비 와?',
  '이번 주 날씨',
  '서울 날씨',
  '울산 오늘 기온',
  '오늘 우산 필요해?',
  '날씨 알려줘',
  '미세먼지 어때?',
  '내일 우산 챙길까',
  '부산 날씨 어때',
  '제주 날씨 알려줘',
  '모레 비 오나',
  '오늘 기온 알려줘',
  '내일 날씨 어때요',
  '인천 날씨',
  '대구 오늘 날씨',
  '지금 비 와?',
  '우산 필요해?',
  '오늘 날씨 확인',
].map((s) => g('weather', s, 'weather.query', { forbiddenActions: ['translation'] }))

const CALENDAR: GoldenCase[] = [
  g('calendar', '내일 오후 3시에 병원 일정 추가해줘', 'calendar.create', {
    forbiddenActions: ['translation', 'weather'],
  }),
  g('calendar', '병원 일정 추가해줘', 'calendar.create'),
  g('calendar', '회의 일정 잡아줘', 'calendar.create'),
  g('calendar', '오늘 일정 알려줘', 'calendar.read'),
  g('calendar', '내일 일정 있어?', 'calendar.read'),
  g('calendar', '친구 일정 보여줘', 'calendar.read'),
  g('calendar', '30분 뒤에 전화하라고 알려줘', 'reminder.create'),
  g('calendar', '오늘 할 일 추가해줘', 'todo.create'),
  g('calendar', '할 일 등록해줘', 'todo.create'),
  g('calendar', '모레 미팅 일정 등록해줘', 'calendar.create'),
  g('calendar', '다음 주 월요일 일정 추가해줘', /calendar\./),
  g('calendar', '치과 예약 일정 넣어줘', 'calendar.create'),
  g('calendar', '이번 주 일정 보여줘', /calendar\./),
  g('calendar', '다가오는 일정 알려줘', /calendar\./),
  g('calendar', '알림 만들어줘 한 시간 뒤', /reminder|todo/),
  g('calendar', '내일 오전 10시 회의 잡아줘', 'calendar.create'),
  g('calendar', '일정 추가해줘 금요일 점심', /calendar\./),
  g('calendar', '할 일 추가 장보기', /todo/),
  g('calendar', '할 일 장보기 추가', /todo/),
  g('calendar', '할 일 우유 사기 추가', /todo/),
  g('calendar', '오늘 할 일 운동 추가', /todo/),
  g('calendar', '내일 할 일 병원 전화 추가', /todo/),
  g('calendar', '리마인더 설정해줘', /reminder/),
  g('calendar', '캘린더에 넣어줘 생일', /calendar\./),
  g('calendar', '내일 병원', /calendar|general|clarify/),
  g('calendar', '스케줄 보여줘', /calendar|general/),
  g('calendar', '오늘 약속 있어?', /calendar|general/),
  g('calendar', '모레 일정 확인해줘', /calendar/),
  g('calendar', '주간 일정 요약', /calendar|general/),
  g('calendar', '회의 잡아줘 내일 2시', 'calendar.create'),
  g('calendar', '투두 추가해줘', /todo/),
  g('calendar', '체크리스트에 넣어줘', /todo|general/),
  g('calendar', '알림 추가 약 먹기', /reminder|todo|general/),
  g('calendar', '내일 일정 추가 운동', /calendar/),
]

const FAMILY: GoldenCase[] = [
  g('family', '엄마 병원 일정 언제야?', 'family.schedule.read'),
  g('family', '이번 주 가족 일정 알려줘', 'family.schedule.read'),
  g('family', '한영이 내일 4시 반 하원 일정 추가해줘', 'family.schedule.create'),
  g('family', '아이 준비물 보여줘', 'family.schedule.read'),
  g('family', '예방접종 일정 있어?', 'family.schedule.read'),
  g('family', '엄마 병원 일정 추가해줘', 'family.schedule.create'),
  g('family', '아빠 병원 언제야?', 'family.schedule.read'),
  g('family', '하원 알림 추가해줘', 'family.schedule.create'),
  g('family', '아들 등교 일정 등록해줘', /family\.schedule/),
  g('family', '딸 학원 일정 알려줘', /family\.schedule|general/),
  g('family', '가족 일정 보여줘', /family\.schedule/),
  g('family', '와이프 병원 일정 추가', /family\.schedule/),
  g('family', '아이 하원 시간 알려줘', /family\.schedule|general/),
  g('family', '이번 주 하원 일정', /family\.schedule|general/),
  g('family', '예방접종 추가해줘', /family\.schedule/),
  g('family', '엄마 일정 있어?', /family\.schedule/),
  g('family', '아빠 일정 추가해줘 내일', /family\.schedule/),
  g('family', '가족 스케줄 확인', /family|general/),
  g('family', '아이 준비물 체크', /family|general/),
  g('family', '하원 일정 잡아줘', /family\.schedule/),
]

const VISION: GoldenCase[] = [
  g('vision', '이 사진 영어로 번역해줘', 'vision.translation', { forbiddenActions: ['weather'] }),
  g('vision', '카메라로 메뉴판 번역해줘', 'vision.translation'),
  g('vision', '사진 번역해줘', 'vision.translation'),
  g('vision', '메뉴판 사진 영어로 번역해줘', 'vision.translation'),
  g('vision', '이 사진 번역해줘', 'vision.translation'),
  g('vision', '카메라 열어줘', 'vision.open'),
  g('vision', '이 문서 읽어줘', 'vision.open'),
  g('vision', '사진 분석해줘', 'vision.open'),
  g('vision', 'OCR 해줘', 'vision.open'),
  g('vision', '문서 읽어줘', 'vision.open'),
  g('vision', '안내문 번역해줘', /vision\./),
  g('vision', '이미지 번역해줘', /vision\./),
  g('vision', '카메라 켜줘', /vision\./),
  g('vision', '사진 찍어 분석해줘', /vision\./),
  g('vision', '이 이미지 읽어줘', /vision\./),
]

const TRAVEL: GoldenCase[] = [
  g('travel', '다음 주 금요일 제주 가는 비행기 찾아줘', 'travel.flight.search', {
    forbiddenActions: ['weather', 'restaurant'],
  }),
  g('travel', '서울에서 부산 가장 싼 비행기', 'travel.flight.search'),
  g('travel', '내일 도쿄 가는 직항', 'travel.flight.search'),
  g('travel', '오사카 왕복 항공권 찾아줘', 'travel.flight.search'),
  g('travel', '다음 달에 오사카 3박4일 가족여행 준비해줘', 'travel.plan'),
  g('travel', '제주 호텔 알아봐줘', 'travel.hotel.search'),
  g('travel', '바다 보이는 호텔', /travel\.hotel|travel\./),
  g('travel', '제주도 비행기 알아봐줘', 'travel.flight.search'),
  g('travel', '인천에서 오사카 비행기', 'travel.flight.search'),
  g('travel', '김포 제주 항공편', /travel\.flight/),
  g('travel', '호텔도 같이 알아봐', /travel\./),
  g('travel', '비행기 찾아줘', /travel\.flight/),
  g('travel', '항공권 검색해줘 부산', /travel\.flight/),
  g('travel', '오사카 호텔 찾아줘', /travel\.hotel/),
  g('travel', '여행 준비 도와줘', /travel\./),
  g('travel', '다음 달 오사카 가려고', /travel\./),
  g('travel', '제주도 여행 일정 추천해줘', /travel\./),
  g('travel', '수영장 있는 호텔', /travel\.hotel|restaurant/),
  g('travel', '1박 20만원 이하 호텔', /travel\.hotel/),
  g('travel', '왕복 항공 찾아줘', /travel\.flight/),
  g('travel', '도쿄 직항 항공권', /travel\.flight/),
  g('travel', '부산행 비행기 제일 싼 거', /travel\.flight/),
  g('travel', '여행 총 얼마야?', /travel\.trip|travel\./),
  g('travel', '일정에 저장해줘', /travel\.trip|restaurant|calendar/),
  g('travel', '이걸로 예약해줘', /travel\.booking|restaurant\.booking|travel\./),
]

const RESTAURANT: GoldenCase[] = [
  g('restaurant', '오늘 저녁 맛집 찾아줘', 'restaurant.search', {
    forbiddenActions: ['travel.flight'],
  }),
  g('restaurant', '울산 삼산 맛집', 'restaurant.search'),
  g('restaurant', '7시에 네 명 예약 가능한 한식집', 'restaurant.search'),
  g('restaurant', '주차되는 식당', /restaurant\./),
  g('restaurant', '아이랑 갈 만한 곳', /restaurant\./),
  g('restaurant', '조용한 곳', /restaurant\.|general\.chat|clarify/),
  g('restaurant', '룸 있는 식당', /restaurant\./),
  g('restaurant', '삼산 맛집 알려줘', 'restaurant.search'),
  g('restaurant', '맛집 추천해줘', /restaurant\.search|general/),
  g('restaurant', '오늘 저녁 뭐 먹을까?', /restaurant\.search|general/),
  g('restaurant', '한식집 찾아줘 삼산', 'restaurant.search'),
  g('restaurant', '고깃집 예약 가능한 곳', /restaurant\./),
  g('restaurant', '가족 외식 식당', /restaurant\./),
  g('restaurant', '부모님 모시고 갈 한식집', /restaurant\./),
  g('restaurant', '예약 가능한 식당 울산', /restaurant\./),
  g('restaurant', '평점 높은 맛집', /restaurant\./),
  g('restaurant', '가까운 맛집', /restaurant\./),
  g('restaurant', '카페 추천해줘 삼산', /restaurant\./),
  g('restaurant', '일식집 찾아줘', /restaurant\./),
  g('restaurant', '중식 맛집', /restaurant\./),
  g('restaurant', '스테이크집 예약', /restaurant\./),
  g('restaurant', '네 명 저녁 식당', /restaurant\./),
  g('restaurant', '7시 예약 식당', /restaurant\./),
  g('restaurant', '주차되는 한식집', /restaurant\./),
  g('restaurant', '아이랑 가기 좋은 식당', /restaurant\./),
]

const MEMORY_OTHER: GoldenCase[] = [
  g('memory', '이거 기억해줘 내 차는 파란색', 'memory.save'),
  g('memory', '기억해줘 비밀번호는 비밀', 'memory.save'),
  g('memory', '내가 전에 말한 거 찾아줘', 'memory.read'),
  g('music', '음악 틀어줘', 'music.play'),
  g('music', '잔잔한 노래 재생해줘', 'music.play'),
  g('music', '플레이리스트 틀어줘', 'music.play'),
  g('general', '호텔 예약하는 법 알려줘', /general\.chat|clarify/),
  g('travel', '호텔 예약해줘', /travel\.hotel|travel\.booking|travel\./),
  g('general', '김치찌개 만드는 법 알려줘', 'general.chat'),
  g('general', '비행기표 가격이 왜 비싸?', /general\.chat|travel\./),
  g('general', '브리핑', /general|calendar|clarify/),
  g('general', '도움말', /general|clarify|app/),
  g('general', '설정 열어줘', /app\.control|general|clarify/),
  g('vision', '카메라', /vision|general/),
  g('general', '대화 삭제해줘', /general|app|clarify/),
]

export const GOLDEN_COMMAND_SET: GoldenCase[] = [
  ...GENERAL,
  ...TRANSLATION,
  ...WEATHER,
  ...CALENDAR,
  ...FAMILY,
  ...VISION,
  ...TRAVEL,
  ...RESTAURANT,
  ...MEMORY_OTHER,
]

export function goldenSetStats(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of GOLDEN_COMMAND_SET) {
    out[c.category] = (out[c.category] || 0) + 1
  }
  out.total = GOLDEN_COMMAND_SET.length
  return out
}
