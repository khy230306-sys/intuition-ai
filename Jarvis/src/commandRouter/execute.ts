/**
 * Execute router decisions that the central router owns
 * (translation session + oneshot + active utterance).
 * Other intents return null so legacy/brain handlers continue.
 */

import type { BrainReply } from '../types'
import { handleTravelAgent } from '../travelAgent'
import { bcp47, translateText } from '../translate'
import { routeCommand } from './router'
import {
  changeTranslationTarget,
  endTranslationSession,
  getActiveMode,
  startTranslationSession,
  translationBadgeLabel,
} from './session'
import { describeTarget } from './router'
import type { CommandRouterResult } from './types'

export async function tryHandleRoutedCommand(
  text: string,
  opts?: { source?: string },
): Promise<BrainReply | null> {
  void opts
  const routed = routeCommand({ text, activeMode: getActiveMode() })
  return executeRoutedCommand(routed, text)
}

export async function executeRoutedCommand(
  routed: CommandRouterResult,
  originalText?: string,
): Promise<BrainReply | null> {
  const utterance = originalText || routed.normalized || ''
  switch (routed.intent) {
    case 'translation.session.start': {
      const code = routed.targetLanguage || 'en'
      const name = describeTarget(code)
      startTranslationSession(code, name)
      return {
        text: `${name} 번역 모드를 시작했어요. 이제 보내는 내용을 ${name}로 번역할게요.`,
        speak: true,
        speakLang: 'ko-KR',
        listenLang: 'ko-KR',
      }
    }
    case 'translation.session.end': {
      endTranslationSession()
      return {
        text: '번역 모드를 종료했어요.',
        speak: true,
        speakLang: 'ko-KR',
        listenLang: 'ko-KR',
      }
    }
    case 'translation.session.change_target': {
      const code = routed.targetLanguage || 'en'
      const name = describeTarget(code)
      changeTranslationTarget(code, name)
      return {
        text: `이제 ${name}로 번역할게요.`,
        speak: true,
        speakLang: 'ko-KR',
        listenLang: 'ko-KR',
      }
    }
    case 'translation.oneshot': {
      const content = (routed.content || '').trim()
      const to = routed.targetLanguage || 'en'
      if (!content) {
        startTranslationSession(to, describeTarget(to))
        return {
          text: `${describeTarget(to)} 번역 모드를 시작했어요. 이제 보내는 내용을 번역할게요.`,
          speak: true,
          listenLang: 'ko-KR',
        }
      }
      const result = await translateText(content, 'auto', to)
      if (!result.ok) {
        return {
          text: result.error || '번역에 실패했습니다. 네트워크를 확인해 주세요.',
          speak: true,
        }
      }
      // Clean: translation only
      return {
        text: result.text,
        speak: true,
        speakLang: bcp47(to),
        listenLang: 'ko-KR',
      }
    }
    case 'translation.active_utterance': {
      const content = (routed.content || routed.normalized || '').trim()
      const to = routed.targetLanguage || 'en'
      if (!content) return { text: '번역할 문장을 보내 주세요.', speak: true }
      const result = await translateText(content, 'ko', to)
      if (!result.ok) {
        return {
          text: result.error || '번역에 실패했습니다.',
          speak: true,
          listenLang: 'ko-KR',
        }
      }
      return {
        text: result.text,
        speak: true,
        speakLang: bcp47(to),
        listenLang: 'ko-KR',
      }
    }
    case 'clarify': {
      return {
        text: '어떤 작업을 원하시는지 조금만 더 알려주세요. 예: 「영어로 번역해줘」또는 「오늘 날씨 알려줘」',
        speak: true,
      }
    }
    case 'vision.translation':
      return {
        text: '사진·메뉴판 번역은 카메라 화면에서 할게요.',
        speak: true,
        view: 'ai-camera',
      }
    case 'travel.plan':
    case 'travel.flight.search':
    case 'travel.flight.select':
    case 'travel.flight.details':
    case 'travel.hotel.search':
    case 'travel.hotel.select':
    case 'travel.hotel.details':
    case 'travel.trip.summary':
    case 'travel.trip.save':
    case 'travel.trip.calendar_add':
    case 'travel.booking.prepare':
    case 'travel.booking.confirm':
    case 'travel.booking.status':
    case 'travel.booking.cancel':
    case 'travel.unknown': {
      const map: Record<string, string> = {
        'travel.plan': 'TRAVEL_PLAN',
        'travel.flight.search': 'FLIGHT_SEARCH',
        'travel.hotel.search': 'HOTEL_SEARCH',
        'travel.booking.prepare': 'BOOKING_PREPARE',
        'travel.booking.confirm': 'BOOKING_CONFIRM',
        'travel.booking.cancel': 'BOOKING_CANCEL',
        'travel.trip.calendar_add': 'TRIP_CALENDAR_ADD',
        'travel.trip.summary': 'TRIP_SUMMARY',
      }
      const forced = map[routed.intent]
      const tr = await handleTravelAgent(utterance, forced ? { forceIntent: forced } : undefined)
      return tr
    }
    case 'weather.query':
    case 'calendar.create':
    case 'calendar.read':
    case 'reminder.create':
    case 'todo.create':
    case 'family.schedule.create':
    case 'family.schedule.read':
    case 'memory.save':
    case 'memory.read':
    case 'music.play':
    case 'vision.open':
    case 'app.control':
    case 'general.chat':
      return null
    default:
      return null
  }
}

export function activeModeChipHtml(): string {
  const label = translationBadgeLabel()
  if (!label) return ''
  return `<div class="aizio-mode-chip" data-active-mode="translation" role="status">
    <span>${label}</span>
    <button type="button" class="ghost-btn tiny" data-action="end-translation-mode">종료</button>
  </div>`
}
