/** Standard error codes — shown in Reliability Center only. */

export const ERROR_CODES = {
  'ROUTER-001': '명령 라우팅 실패',
  'ROUTER-LOW-CONFIDENCE': '의도 확신도 부족',
  'TRANSLATE-001': '번역 실행 실패',
  'WEATHER-001': '날씨 조회 실패',
  'CALENDAR-001': '일정 처리 실패',
  'FAMILY-001': '가족 기능 실패',
  'VISION-001': '카메라/비전 실패',
  'TRAVEL-001': '여행 처리 실패',
  'FLIGHT-001': '항공 검색 실패',
  'HOTEL-001': '호텔 검색 실패',
  'RESTAURANT-001': '맛집 검색/예약 실패',
  'PROVIDER-TIMEOUT': '서비스 응답 시간 초과',
  'PROVIDER-SCHEMA': '응답 형식 오류',
  'STORAGE-001': '로컬 저장 실패',
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export function userFacingError(_code: ErrorCode | string, fallback: string): string {
  void _code
  return fallback
}

export function describeErrorCode(code: string): string {
  return (ERROR_CODES as Record<string, string>)[code] || code
}
