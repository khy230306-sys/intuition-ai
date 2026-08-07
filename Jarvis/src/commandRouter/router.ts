/**
 * AizioCommandRouter — single authority for chat command intent.
 * Priority (high → low):
 * active mode → app control → translation → calendar → reminder → todo →
 * family → camera → memory → music → weather → search/tools → general chat
 *
 * WEATHER must never win over translation when 번역/통역 cues exist.
 */

import {
  detectRestaurantIntent,
  isRecipeOrCooking,
  isRestaurantUtterance,
} from '../restaurantAgent/detect'
import { hasActiveRestaurantSession } from '../restaurantAgent/session'
import { detectTravelIntent, isTravelUtterance } from '../travelAgent/detect'
import { hasActiveTravelSession } from '../travelAgent/session'
import { findTargetLanguage, langName } from './languages'
import { normalizeCommandInput } from './normalize'
import { getActiveMode, getTranslationSession } from './session'
import type { AizioIntent, CommandRouterInput, CommandRouterResult } from './types'
import { pushRouteDiag } from './diagnostics'
import { isClearWeatherQuery } from './weatherQuery'
import { isHowToOrAdviceUtterance } from './howto'
import { isTodoCreateUtterance } from '../life/todoShopping'

export { isClearWeatherQuery }

function mapTravelIntent(id: NonNullable<ReturnType<typeof detectTravelIntent>>): AizioIntent {
  const table: Record<string, AizioIntent> = {
    TRAVEL_PLAN: 'travel.plan',
    FLIGHT_SEARCH: 'travel.flight.search',
    FLIGHT_SELECT: 'travel.flight.select',
    FLIGHT_DETAILS: 'travel.flight.details',
    HOTEL_SEARCH: 'travel.hotel.search',
    HOTEL_SELECT: 'travel.hotel.select',
    HOTEL_DETAILS: 'travel.hotel.details',
    TRIP_SUMMARY: 'travel.trip.summary',
    TRIP_SAVE: 'travel.trip.save',
    TRIP_CALENDAR_ADD: 'travel.trip.calendar_add',
    BOOKING_PREPARE: 'travel.booking.prepare',
    BOOKING_CONFIRM: 'travel.booking.confirm',
    BOOKING_STATUS: 'travel.booking.status',
    BOOKING_CANCEL: 'travel.booking.cancel',
    TRAVEL_UNKNOWN: 'travel.unknown',
  }
  return table[id] || 'travel.unknown'
}

function mapRestaurantIntent(id: NonNullable<ReturnType<typeof detectRestaurantIntent>>): AizioIntent {
  const table: Record<string, AizioIntent> = {
    RESTAURANT_SEARCH: 'restaurant.search',
    RESTAURANT_DETAILS: 'restaurant.details',
    RESTAURANT_FILTER: 'restaurant.filter',
    RESTAURANT_SELECT: 'restaurant.select',
    RESTAURANT_AVAILABILITY: 'restaurant.availability',
    RESTAURANT_BOOKING_PREPARE: 'restaurant.booking.prepare',
    RESTAURANT_BOOKING_CONFIRM: 'restaurant.booking.confirm',
    RESTAURANT_BOOKING_STATUS: 'restaurant.booking.status',
    RESTAURANT_BOOKING_CANCEL: 'restaurant.booking.cancel',
  }
  return table[id] || 'restaurant.search'
}

function result(
  partial: Omit<CommandRouterResult, 'requiresAI' | 'requiresConfirmation' | 'missingFields' | 'blockedActions'> &
    Partial<Pick<CommandRouterResult, 'requiresAI' | 'requiresConfirmation' | 'missingFields' | 'blockedActions'>>,
): CommandRouterResult {
  return {
    requiresAI: false,
    requiresConfirmation: false,
    missingFields: [],
    blockedActions: partial.forbiddenActions || [],
    ...partial,
  }
}

export function isTranslationStop(text: string): boolean {
  const t = text.trim()
  return (
    /^(번역|통역)\s*(그만|종료|중지|끝|꺼|끄)/i.test(t) ||
    /번역\s*모드\s*(꺼|끄|종료|그만)/i.test(t) ||
    /이제\s*번역\s*하지\s*마|번역하지\s*마/i.test(t) ||
    /일반\s*대화로\s*돌아/i.test(t) ||
    /번역\s*끝$/i.test(t) ||
    (/^(그만|종료|끝)$/i.test(t) && getTranslationSession().enabled)
  )
}

export function isTranslationStart(text: string): boolean {
  const t = text.trim()
  // Task resume / travel continue must never open translation mode
  if (/아까\s*(여행|비행기|호텔|작업)|여행\s*계속|비행기\s*계속|이어서\s*(알아|해)/.test(t)) {
    return false
  }
  if (!/번역|통역|translate|interpre/i.test(t) && !/지금부터|이제부터|앞으로|계속/.test(t)) {
    // bare "영어 번역" / "번역 시작" / "영어로 바꿔줘"
    if (/^(영어|일본어|중국어|베트남어|스페인어|프랑스어|독일어|태국어|한국어|베트남말|일본말)\s*(번역|통역)$/i.test(t))
      return true
    if (/^(번역|통역)\s*(시작|모드|하기)$/i.test(t)) return true
    if (/^(실시간\s*)?(번역|통역)\s*모드/i.test(t)) return true
    if (/^(영어|일본어|중국어|베트남어)\s*(로|으로)\s*(바꿔|말해)/i.test(t)) return true
    return false
  }
  if (isTranslationStop(t)) return false
  if (isVisionTranslation(t)) return false
  // Continuous cues — bare 「계속」 alone is not enough (avoids 「아까 여행 계속」)
  if (
    /지금부터|이제부터|앞으로|번역\s*모드|통역\s*모드|번역\s*시작|통역\s*시작|번역하기|통역하기|translate\s+to|start\s+translati/i.test(
      t,
    ) ||
    (/계속/.test(t) && /번역|통역|영어|일본어|중국어|베트남어|translate|interpre/i.test(t))
  ) {
    return true
  }
  // 「영어로 번역해줘」 with no payload content → session start (must end; trailing text = oneshot)
  if (
    /^(?:[가-힣A-Za-z\-]+(?:어|말)\s*)?(?:로|으로)\s*(?:번역|통역)(?:\s*해(?:\s*줘|주세요)?|\s*하기)?\s*$/i.test(t) ||
    /^(?:영어|일본어|중국어|베트남어|스페인어|프랑스어|독일어|태국어)\s*(?:로|으로)\s*(?:번역|통역|말해|바꿔)(?:\s*해(?:\s*줘|주세요)?)?\s*$/i.test(
      t,
    )
  ) {
    return true
  }
  if (/^(?:번역|통역)\s*해(?:\s*줘|주세요)?\s*$/i.test(t)) return true
  // 「영어 번역」「영어 통역해줘」「베트남말 번역하기」
  if (
    /^(?:영어|일본어|중국어|베트남어|베트남말|일본말|중국말|스페인어|프랑스어|독일어|태국어|한국어)\s*(?:번역|통역)(?:\s*해(?:\s*줘|주세요)?|\s*하기|\s*시작)?\s*$/i.test(
      t,
    )
  ) {
    return true
  }
  return false
}

export function isTranslationOneShot(text: string): boolean {
  const t = text.trim()
  // 「… 영어로 말해줘」is translation, not calendar/weather narrative
  const speakAsTranslate =
    /.+\s+(?:영어로|일본어로|중국어로|베트남어로|스페인어로|프랑스어로|독일어로|태국어로|한국어로)\s*(?:말해|말해줘|말씀해)/i.test(
      t,
    )
  if (!/번역|통역|translate/i.test(t) && !speakAsTranslate) return false
  if (isTranslationStart(t) && !hasTranslatableContent(t) && !speakAsTranslate) return false
  if (isVisionTranslation(t)) return false
  if (speakAsTranslate) return true
  // Quoted or 「X를 영어로 번역」
  if (/['"「『].+['"」』]\s*(?:을|를)?\s*.*(?:로|으로)\s*(?:번역|통역)/i.test(t)) return true
  if (/.+(?:을|를|라고|다고)\s*.*(?:로|으로)\s*(?:번역|통역)/i.test(t) && !/지금부터|이제부터|앞으로|계속|모드/i.test(t)) {
    return true
  }
  return hasTranslatableContent(t) && /(?:로|으로)\s*(?:번역|통역)|번역해|통역해/i.test(t)
}

function hasTranslatableContent(text: string): boolean {
  const content = extractTranslateContent(text)
  return Boolean(content && content.length >= 2)
}

export function extractTranslateContent(text: string): string {
  const t = text.trim()
  const quoted = t.match(/^['"「『](.+?)['"」』]\s*(?:을|를)?\s*.+?(?:로|으로)\s*(?:번역|통역)/i)
  if (quoted) return quoted[1].trim()
  // 「일본어로 번역해 안녕하세요」— language command then payload
  const trailing = t.match(
    /^(?:영어|일본어|중국어|베트남어|스페인어|프랑스어|독일어|태국어|한국어|[가-힣]+어)\s*(?:로|으로)\s*(?:번역|통역)(?:\s*해(?:\s*줘|주세요)?)?\s+(.+)$/i,
  )
  if (trailing?.[1]?.trim()) return trailing[1].trim()
  const m =
    t.match(
      /^(.+?)(?:을|를|라고|다고)\s*(?:영어로|일본어로|중국어로|베트남어로|스페인어로|프랑스어로|독일어로|태국어로|한국어로|.+?(?:어|말)\s*(?:로|으로))\s*(?:번역|통역)/i,
    ) ||
    t.match(/^(.+?)(?:을|를)\s*.+?(?:로|으로)\s*(?:번역|통역)/i) ||
    // 「엄마 병원 일정 영어로 번역해줘」— content + language + 번역 (no 을/를)
    t.match(
      /^(.+?)\s+(?:영어로|일본어로|중국어로|베트남어로|스페인어로|프랑스어로|독일어로|태국어로|한국어로|(?:베트남|일본|중국)?말\s*(?:로|으로)|[가-힣]+어\s*(?:로|으로))\s*(?:번역|통역|말해|말해줘|말씀해)/i,
    )
  if (m) {
    let c = m[1].trim()
    c = c.replace(/^(?:이\s*문장|다음|이거|이것)\s*/i, '').trim()
    if (c && !/^(지금부터|이제부터|앞으로|계속|내\s*말)$/i.test(c)) return c
  }
  return ''
}

export function isVisionTranslation(text: string): boolean {
  const t = text.trim()
  return (
    /(이\s*)?(사진|이미지|카메라|메뉴판|안내문|문서).*(번역|통역)/i.test(t) ||
    /(번역|통역).*(사진|이미지|카메라|메뉴판)/i.test(t) ||
    /카메라로\s*.*번역/i.test(t) ||
    /사진\s*(영어로|일본어로|중국어로)?\s*번역/i.test(t)
  )
}

export function isVisionOpen(text: string): boolean {
  const t = text.trim()
  if (isVisionTranslation(t)) return false
  return /카메라\s*(열어|켜|켜줘)|사진\s*(찍어|분석)|(?:이\s*)?(문서|사진|이미지|안내문)\s*읽어|문서\s*읽어|OCR|비전|이미지\s*(분석|읽어)/i.test(
    t,
  )
}

function isCalendarCreate(text: string): boolean {
  const t = text.trim()
  if (/번역|통역/i.test(t)) return false
  if (/(영어|일본어|중국어).*(말해|번역)|말해줘/i.test(t)) return false
  return /(일정|예약)\s*(추가|등록|잡아|넣어|만들어)|캘린더에\s*넣|(병원|미팅|회의).*(일정|예약|잡아)/i.test(t)
}

function isCalendarRead(text: string): boolean {
  const t = text.trim()
  if (/번역|통역|말해줘/i.test(t) && /영어|일본어|중국어/.test(t)) return false
  if (/가족/.test(t)) return false
  return /(오늘|내일|모레|이번\s*주)?\s*일정\s*(알려|보여|있어|뭐|확인)|다가오는\s*일정|캘린더\s*(보여|알려)|스케줄\s*(보여|확인)/i.test(
    t,
  )
}

function isReminderCreate(text: string): boolean {
  const t = text.trim()
  if (/번역|통역/i.test(t)) return false
  return /(분|시간)\s*뒤.*(?:알려|알림)|알림\s*(만들어|설정|추가|등록)|깨워\s*줘|리마인더/i.test(t)
}

function isTodoCreate(text: string): boolean {
  return isTodoCreateUtterance(text)
}

function isFamilyScheduleCreate(text: string): boolean {
  const t = text.trim()
  if (/번역|통역/i.test(t)) return false
  if (/(언제|있어\?|보여|알려)(?!.*추가)/i.test(t) && !/(추가|잡아|등록)/i.test(t)) return false
  return (
    /(엄마|아빠|아들|딸|아이|한영|와이프|남편).*(일정|하원|등교|병원).*(추가|잡아|등록)/i.test(t) ||
    /(하원|등교).*(일정|알림).*(추가|잡아|등록)|하원\s*알림\s*추가/i.test(t) ||
    /예방접종.*(추가|등록)/i.test(t)
  )
}

function isFamilyScheduleRead(text: string): boolean {
  const t = text.trim()
  if (/번역|통역/i.test(t)) return false
  return (
    /(엄마|아빠|가족|아이|아들|딸).*(일정|병원).*(언제|알려|보여|있어)/i.test(t) ||
    /이번\s*주\s*가족\s*일정|가족\s*일정\s*(알려|보여)/i.test(t) ||
    /예방접종\s*일정\s*(있어|알려|보여)?/i.test(t) ||
    /아이\s*준비물|준비물\s*보여/i.test(t)
  )
}

function isMemorySave(text: string): boolean {
  return /^(?:이거\s*)?기억해(?:\s*줘)?\s+/i.test(text.trim()) || /기억해\s*줘\s*.+/i.test(text.trim())
}

function isMemoryRead(text: string): boolean {
  return /전에\s*말한|기억\s*(찾아|보여|뭐였)|내가\s*말해\s*둔/i.test(text.trim())
}

function isMusic(text: string): boolean {
  return /(음악|노래).*(틀|재생|추천)|틀어\s*줘|play\s+music/i.test(text.trim())
}

function isLanguageOnlySwitch(text: string): boolean {
  const t = text.trim()
  if (!getTranslationSession().enabled) return false
  if (/번역|통역|그만|종료/i.test(t) && t.length > 12) return false
  // 「일본어로」「다시 영어로」「영어로」
  return (
    /^(?:다시\s*)?(?:이제\s*)?(영어|일본어|중국어|베트남어|스페인어|프랑스어|독일어|태국어|한국어|English|Japanese|Chinese)(?:\s*(?:로|으로))?\s*$/i.test(
      t,
    ) || /^(?:다시\s*)?.+(?:어|말)\s*(?:로|으로)\s*(?:바꿔|해|하자)?\s*$/i.test(t)
  )
}

/**
 * Classify command. Pure — does not execute side effects.
 */
export function routeCommand(input: CommandRouterInput): CommandRouterResult {
  const normalized = normalizeCommandInput(input.text)
  const mode = input.activeMode || getActiveMode()
  const session = getTranslationSession()
  const lang = findTargetLanguage(normalized)

  const baseForbiddenWeather = ['weather']
  const baseForbiddenCal = ['calendar', 'weather', 'music']

  // 1) Active translation session
  if (mode === 'translation' && session.enabled) {
    if (isTranslationStop(normalized)) {
      const r = result({
        intent: 'translation.session.end',
        confidence: 0.99,
        entities: {},
        action: 'translation.end',
        reason: 'active_mode_stop',
        normalized,
        forbiddenActions: ['weather', 'calendar', 'music', 'general_chat'],
      })
      pushRouteDiag(r, mode, false)
      return r
    }
    if (isLanguageOnlySwitch(normalized) && lang) {
      const r = result({
        intent: 'translation.session.change_target',
        confidence: 0.96,
        entities: { targetLanguage: lang.code },
        action: 'translation.change_target',
        reason: 'active_mode_lang_switch',
        normalized,
        targetLanguage: lang.code,
        forbiddenActions: baseForbiddenWeather,
      })
      pushRouteDiag(r, mode, false)
      return r
    }
    if (isVisionTranslation(normalized)) {
      const r = result({
        intent: 'vision.translation',
        confidence: 0.95,
        entities: { targetLanguage: lang?.code || session.targetLanguage || 'en' },
        action: 'vision.translation',
        reason: 'vision_translation_in_session',
        normalized,
        targetLanguage: lang?.code || session.targetLanguage || 'en',
        forbiddenActions: ['weather', 'calendar', 'music', 'general_chat'],
      })
      pushRouteDiag(r, mode, false)
      return r
    }
    // While translation mode is on: NEVER run weather/calendar on narrative text.
    // Only stop / language-switch / vision-translate escape (plus explicit stop phrases).
    const r = result({
      intent: 'translation.active_utterance',
      confidence: 0.99,
      entities: { targetLanguage: session.targetLanguage },
      action: 'translation.translate',
      reason: 'active_mode_translate',
      normalized,
      content: normalized,
      targetLanguage: session.targetLanguage,
      sourceLanguage: session.sourceLanguage || 'auto',
      forbiddenActions: ['weather', 'calendar', 'music', 'general_chat'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  // 2) Vision translation (before plain translation / weather)
  if (isVisionTranslation(normalized)) {
    const r = result({
      intent: 'vision.translation',
      confidence: 0.95,
      entities: { targetLanguage: lang?.code || 'en' },
      action: 'vision.translation',
      reason: 'vision_translation_keywords',
      normalized,
      targetLanguage: lang?.code || 'en',
      forbiddenActions: ['weather', 'calendar', 'music'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  // 3) Translation session start / one-shot
  if (isTranslationOneShot(normalized)) {
    const content = extractTranslateContent(normalized)
    const target = lang?.code || 'en'
    const r = result({
      intent: 'translation.oneshot',
      confidence: 0.97,
      entities: { targetLanguage: target, content },
      action: 'translation.oneshot',
      reason: 'oneshot_translation',
      normalized,
      content,
      targetLanguage: target,
      sourceLanguage: 'auto',
      forbiddenActions: baseForbiddenCal,
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  if (isTranslationStart(normalized)) {
    const target = lang?.code || 'en'
    const r = result({
      intent: 'translation.session.start',
      confidence: lang ? 0.99 : 0.9,
      entities: { targetLanguage: target },
      action: 'translation.start',
      reason: lang ? 'session_start_with_lang' : 'session_start_default_en',
      normalized,
      targetLanguage: target,
      sourceLanguage: 'auto',
      missingFields: lang ? [] : [],
      forbiddenActions: baseForbiddenWeather.concat(['calendar', 'music', 'general_chat']),
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  if (isTranslationStop(normalized)) {
    const r = result({
      intent: 'translation.session.end',
      confidence: 0.95,
      entities: {},
      action: 'translation.end',
      reason: 'stop_while_inactive',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  // 4) Domain commands — family before generic calendar
  if (isFamilyScheduleCreate(normalized)) {
    const r = result({
      intent: 'family.schedule.create',
      confidence: 0.92,
      entities: {},
      action: 'family.schedule.create',
      reason: 'family_schedule_create',
      normalized,
      forbiddenActions: ['weather', 'translation'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isFamilyScheduleRead(normalized)) {
    const r = result({
      intent: 'family.schedule.read',
      confidence: 0.92,
      entities: {},
      action: 'family.schedule.read',
      reason: 'family_schedule_read',
      normalized,
      forbiddenActions: ['weather', 'translation'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isCalendarCreate(normalized)) {
    const r = result({
      intent: 'calendar.create',
      confidence: 0.93,
      entities: {},
      action: 'calendar.create',
      reason: 'calendar_create',
      normalized,
      forbiddenActions: ['weather', 'translation'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isReminderCreate(normalized)) {
    const r = result({
      intent: 'reminder.create',
      confidence: 0.92,
      entities: {},
      action: 'reminder.create',
      reason: 'reminder_create',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isTodoCreate(normalized)) {
    const r = result({
      intent: 'todo.create',
      confidence: 0.9,
      entities: {},
      action: 'todo.create',
      reason: 'todo_create',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isCalendarRead(normalized)) {
    const r = result({
      intent: 'calendar.read',
      confidence: 0.9,
      entities: {},
      action: 'calendar.read',
      reason: 'calendar_read',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isVisionOpen(normalized)) {
    const r = result({
      intent: 'vision.open',
      confidence: 0.9,
      entities: {},
      action: 'vision.open',
      reason: 'camera_open',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isMemorySave(normalized)) {
    const r = result({
      intent: 'memory.save',
      confidence: 0.9,
      entities: {},
      action: 'memory.save',
      reason: 'memory_save',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isMemoryRead(normalized)) {
    const r = result({
      intent: 'memory.read',
      confidence: 0.88,
      entities: {},
      action: 'memory.read',
      reason: 'memory_read',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }
  if (isMusic(normalized)) {
    const r = result({
      intent: 'music.play',
      confidence: 0.9,
      entities: {},
      action: 'music.play',
      reason: 'music',
      normalized,
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  // How-to / tip / advice stay GENERAL_CHAT (never book/search)
  if (isHowToOrAdviceUtterance(normalized)) {
    const r = result({
      intent: 'general.chat',
      confidence: 0.88,
      entities: {},
      action: 'general.chat',
      reason: 'howto_or_explanation',
      normalized,
      requiresAI: true,
      forbiddenActions: ['travel.booking', 'restaurant.booking', 'weather'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  // 5a) Restaurant Agent — before travel/weather; never steal recipes / translation
  if (!isRecipeOrCooking(normalized)) {
    const restHit = detectRestaurantIntent(normalized, hasActiveRestaurantSession())
    if (restHit || (hasActiveRestaurantSession() && isRestaurantUtterance(normalized))) {
      // Don't steal clear flight/hotel travel commands
      const travelClear = detectTravelIntent(normalized, false)
      if (
        travelClear &&
        (travelClear.startsWith('FLIGHT') ||
          travelClear.startsWith('HOTEL') ||
          travelClear === 'TRAVEL_PLAN' ||
          travelClear === 'BOOKING_PREPARE') &&
        !/(맛집|식당|레스토랑|외식|한식집|일식집)/.test(normalized)
      ) {
        /* fall through to travel */
      } else {
        const intent = mapRestaurantIntent(restHit || 'RESTAURANT_SEARCH')
        const r = result({
          intent,
          confidence: restHit ? 0.93 : 0.82,
          entities: {},
          action: intent,
          reason: restHit ? `restaurant_${restHit}` : 'restaurant_session_followup',
          normalized,
          forbiddenActions: ['weather', 'general_chat', 'web_search', 'travel'],
        })
        pushRouteDiag(r, mode, false)
        return r
      }
    }
  }

  // 5b) Travel Agent — before weather / general chat (never steal translation)
  {
    const travelHit = detectTravelIntent(normalized, hasActiveTravelSession())
    if (travelHit || (hasActiveTravelSession() && isTravelUtterance(normalized))) {
      const intent = mapTravelIntent(travelHit || 'TRAVEL_UNKNOWN')
      const r = result({
        intent,
        confidence: travelHit ? 0.93 : 0.8,
        entities: {},
        action: intent,
        reason: travelHit ? `travel_${travelHit}` : 'travel_session_followup',
        normalized,
        forbiddenActions: ['weather', 'general_chat', 'web_search', 'music'],
      })
      pushRouteDiag(r, mode, false)
      return r
    }
  }

  // 6) Weather — only clear queries
  if (isClearWeatherQuery(normalized)) {
    const r = result({
      intent: 'weather.query',
      confidence: 0.94,
      entities: {},
      action: 'weather.query',
      reason: 'clear_weather_query',
      normalized,
      forbiddenActions: ['translation', 'travel'],
    })
    pushRouteDiag(r, mode, false)
    return r
  }

  // 6) Soft: language name alone while NOT in session → clarify / start?
  if (lang && /^(영어|일본어|중국어|베트남어)(?:\s*(?:로|으로))?$/i.test(normalized)) {
    const r = result({
      intent: 'clarify',
      confidence: 0.6,
      entities: { targetLanguage: lang.code },
      action: 'clarify',
      reason: 'bare_language',
      normalized,
      requiresAI: false,
      missingFields: ['action'],
      forbiddenActions: ['weather'],
    })
    pushRouteDiag(r, mode, true)
    return r
  }

  // 7) General chat
  const r = result({
    intent: 'general.chat',
    confidence: 0.5,
    entities: {},
    action: 'general.chat',
    reason: 'fallback_general_chat',
    normalized,
    requiresAI: true,
    forbiddenActions: [],
  })
  pushRouteDiag(r, mode, true)
  return r
}

export function describeTarget(code?: string): string {
  if (!code) return '영어'
  return langName(code)
}
