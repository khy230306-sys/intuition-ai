/**
 * Travel intent detection for AizioCommandRouter + agent.
 * Must not steal pure weather / web-search / translation.
 */

import { isHowToOrAdviceUtterance } from '../commandRouter/howto'

export type TravelIntentId =
  | 'TRAVEL_PLAN'
  | 'FLIGHT_SEARCH'
  | 'FLIGHT_SELECT'
  | 'FLIGHT_DETAILS'
  | 'HOTEL_SEARCH'
  | 'HOTEL_SELECT'
  | 'HOTEL_DETAILS'
  | 'TRIP_SUMMARY'
  | 'TRIP_SAVE'
  | 'TRIP_CALENDAR_ADD'
  | 'BOOKING_PREPARE'
  | 'BOOKING_CONFIRM'
  | 'BOOKING_STATUS'
  | 'BOOKING_CANCEL'
  | 'TRAVEL_UNKNOWN'
  | null

export function isTravelUtterance(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/번역|통역|translate/i.test(t)) return false
  if (isHowToOrAdviceUtterance(t)) return false
  if (/날씨\s*(알려|어때)|오늘\s*날씨/.test(t) && !/(비행|항공|호텔|여행)/.test(t)) return false
  return (
    /(비행기|항공권|항공편|비행\s*편|항공\s*찾|비행\s*찾|직항)/.test(t) ||
    /(호텔|숙소|리조트)/.test(t) ||
    /(여행\s*준비|여행\s*계획|가족여행|\d+박\d+일|여행\s*알아)/.test(t) ||
    /(오사카|제주|도쿄|부산).*(가려고|여행|비행|항공|호텔|직항)/.test(t) ||
    /(가려고).*(오사카|제주|도쿄|부산)/.test(t) ||
    /(이걸로\s*예약|예약해\s*줘|예약\s*취소|일정에\s*저장)/.test(t) ||
    /(직항만|더\s*싼\s*거|첫\s*번째랑|두\s*번째가\s*좋아)/.test(t)
  )
}

export function detectTravelIntent(text: string, hasSession = false): TravelIntentId {
  const t = text.trim()
  if (!t) return null
  if (/번역|통역/i.test(t)) return null
  // How-to / tip / advice are not booking/search intents
  if (isHowToOrAdviceUtterance(t) || /가격이\s*왜/.test(t)) return null
  // Weather wins when clear weather-only
  if (/날씨\s*(알려|어때)|오늘\s*날씨\s*알려/.test(t) && !/(비행|항공|호텔|여행)/.test(t)) return null

  if (/예약\s*취소/.test(t)) return 'BOOKING_CANCEL'
  if (/예약\s*상태/.test(t)) return 'BOOKING_STATUS'
  if (/^(응|네|예)\s*(예약|진행)/.test(t) || /예약\s*(진행|확정)\s*해/.test(t)) return 'BOOKING_CONFIRM'
  if (/이걸로\s*예약|예약해\s*줘/.test(t)) return 'BOOKING_PREPARE'
  if (/일정에\s*(저장|추가)/.test(t)) return 'TRIP_CALENDAR_ADD'
  if (/총\s*(얼마|비용)|전체\s*얼마|이번\s*여행\s*총/.test(t)) return 'TRIP_SUMMARY'
  if (/여행\s*저장|트립\s*저장/.test(t)) return 'TRIP_SAVE'

  if (/(여행\s*준비|여행\s*계획|가족여행|\d+박\d*일|박\d+일)|가려고/.test(t) && /(오사카|제주|도쿄|부산|여행|가족)/.test(t)) {
    return 'TRAVEL_PLAN'
  }
  if (/(호텔|숙소|리조트)/.test(t) && !/(비행|항공|직항)/.test(t)) return 'HOTEL_SEARCH'
  if (/(비행기|항공권|항공편|비행|항공|직항)/.test(t)) return 'FLIGHT_SEARCH'

  if (hasSession) {
    if (/두\s*번째|첫\s*번째|세\s*번째|[1-5]\s*번/.test(t) && /호텔/.test(t)) return 'HOTEL_SELECT'
    if (/두\s*번째|첫\s*번째|세\s*번째|[1-5]\s*번|번째로\s*할게|번째가\s*좋아/.test(t)) return 'FLIGHT_SELECT'
    if (/자세히|상세/.test(t) && /호텔/.test(t)) return 'HOTEL_DETAILS'
    if (/자세히|상세/.test(t)) return 'FLIGHT_DETAILS'
    if (/비교/.test(t)) return 'FLIGHT_DETAILS'
    if (isTravelUtterance(t)) return 'TRAVEL_UNKNOWN'
  }

  if (isTravelUtterance(t)) return 'TRAVEL_UNKNOWN'
  return null
}
