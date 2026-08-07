/**
 * Execute router decisions that the central router owns
 * (translation session + oneshot + active utterance).
 * Other intents return null so legacy/brain handlers continue.
 */

import type { BrainReply } from '../types'
import { processActionAgentTurn } from '../actionAgent/pipeline'
import { handleRestaurantAgent } from '../restaurantAgent'
import { handleTravelAgent } from '../travelAgent'
import { isolateFeature } from '../reliability/crashIsolation'
import { makeExecutionResult } from '../reliability/execution'
import { providerFailurePolicy } from '../reliability/providerPolicy'
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

/** Vitest / local harness may set this for fixture search results. */
export let actionAgentAllowFixtures = false
export function setActionAgentAllowFixtures(v: boolean): void {
  actionAgentAllowFixtures = v
}

function replyFromExec(text: string, extra?: Partial<BrainReply>): BrainReply {
  return { text, speak: true, ...extra }
}

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
  const t0 = performance.now()

  const finish = (
    reply: BrainReply | null,
    opts?: { success?: boolean; status?: 'success' | 'partial' | 'needs_input' | 'failed'; errorCode?: string; provider?: string; fallback?: boolean },
  ): BrainReply | null => {
    if (reply) {
      makeExecutionResult({
        success: opts?.success !== false,
        action: routed.action,
        intent: routed.intent,
        status: opts?.status || (opts?.success === false ? 'failed' : 'success'),
        userMessage: reply.text,
        errorCode: opts?.errorCode,
        provider: opts?.provider,
        fallback: opts?.fallback,
        durationMs: Math.round(performance.now() - t0),
      })
    }
    return reply
  }

  // Action Agent V1 — multi-turn task sessions (before legacy travel/restaurant)
  if (!routed.intent.startsWith('translation.')) {
    const aa = await processActionAgentTurn(utterance, routed, {
      allowFixtures: actionAgentAllowFixtures,
    })
    if (aa.handled) {
      return finish(
        replyFromExec(aa.replyText, aa.clearChat ? { clearChat: true } : undefined),
        {
          status: aa.task?.status === 'needs_provider' ? 'partial' : 'success',
          success: true,
          provider: aa.clearChat ? 'global-command' : 'action-agent',
        },
      )
    }
  }

  switch (routed.intent) {
    case 'translation.session.start': {
      const code = routed.targetLanguage || 'en'
      const name = describeTarget(code)
      startTranslationSession(code, name)
      return finish(
        replyFromExec(`${name} 번역 모드를 시작했어요. 이제 보내는 내용을 ${name}로 번역할게요.`, {
          speakLang: 'ko-KR',
          listenLang: 'ko-KR',
        }),
      )
    }
    case 'translation.session.end': {
      endTranslationSession()
      return finish(
        replyFromExec('번역 모드를 종료했어요.', {
          speakLang: 'ko-KR',
          listenLang: 'ko-KR',
        }),
      )
    }
    case 'translation.session.change_target': {
      const code = routed.targetLanguage || 'en'
      const name = describeTarget(code)
      changeTranslationTarget(code, name)
      return finish(
        replyFromExec(`이제 ${name}로 번역할게요.`, {
          speakLang: 'ko-KR',
          listenLang: 'ko-KR',
        }),
      )
    }
    case 'translation.oneshot': {
      const content = (routed.content || '').trim()
      const to = routed.targetLanguage || 'en'
      if (!content) {
        startTranslationSession(to, describeTarget(to))
        return finish(
          replyFromExec(`${describeTarget(to)} 번역 모드를 시작했어요. 이제 보내는 내용을 번역할게요.`, {
            listenLang: 'ko-KR',
          }),
        )
      }
      const isolated = await isolateFeature('translation', () => translateText(content, 'auto', to))
      if (!isolated.ok) {
        const pol = providerFailurePolicy('translation')
        return finish(replyFromExec(pol.userMessage, { listenLang: 'ko-KR' }), {
          success: false,
          errorCode: pol.errorCode,
          status: 'failed',
        })
      }
      const result = isolated.value
      if (!result.ok) {
        const pol = providerFailurePolicy('translation')
        return finish(
          replyFromExec(result.error || pol.userMessage, { listenLang: 'ko-KR' }),
          { success: false, errorCode: 'TRANSLATE-001', status: 'failed' },
        )
      }
      return finish(
        replyFromExec(result.text, {
          speakLang: bcp47(to),
          listenLang: 'ko-KR',
        }),
        { provider: 'translation' },
      )
    }
    case 'translation.active_utterance': {
      const content = (routed.content || routed.normalized || '').trim()
      const to = routed.targetLanguage || 'en'
      if (!content) return finish(replyFromExec('번역할 문장을 보내 주세요.'), { status: 'needs_input', success: false })
      const isolated = await isolateFeature('translation', () => translateText(content, 'ko', to))
      if (!isolated.ok) {
        const pol = providerFailurePolicy('translation')
        return finish(replyFromExec(pol.userMessage, { listenLang: 'ko-KR' }), {
          success: false,
          errorCode: pol.errorCode,
        })
      }
      const result = isolated.value
      if (!result.ok) {
        const pol = providerFailurePolicy('translation')
        return finish(replyFromExec(result.error || pol.userMessage, { listenLang: 'ko-KR' }), {
          success: false,
          errorCode: 'TRANSLATE-001',
        })
      }
      return finish(
        replyFromExec(result.text, {
          speakLang: bcp47(to),
          listenLang: 'ko-KR',
        }),
        { provider: 'translation' },
      )
    }
    case 'clarify': {
      return finish(
        replyFromExec(
          '어떤 작업을 원하시는지 조금만 더 알려주세요. 예: 「영어로 번역해줘」또는 「오늘 날씨 알려줘」',
        ),
        { status: 'needs_input', success: true },
      )
    }
    case 'vision.translation':
      return finish(
        replyFromExec('사진·메뉴판 번역은 카메라 화면에서 할게요.', { view: 'ai-camera' }),
      )
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
      const isolated = await isolateFeature('travel', () =>
        handleTravelAgent(utterance, forced ? { forceIntent: forced } : undefined),
      )
      // Infra/storage crashes must not block legacy lifestyle/nav fall-through.
      // Soft provider failures are returned as BrainReply by the agent itself.
      if (!isolated.ok) return null
      return finish(isolated.value)
    }
    case 'restaurant.search':
    case 'restaurant.details':
    case 'restaurant.filter':
    case 'restaurant.select':
    case 'restaurant.availability':
    case 'restaurant.booking.prepare':
    case 'restaurant.booking.confirm':
    case 'restaurant.booking.status':
    case 'restaurant.booking.cancel': {
      const map: Record<string, string> = {
        'restaurant.search': 'RESTAURANT_SEARCH',
        'restaurant.details': 'RESTAURANT_DETAILS',
        'restaurant.filter': 'RESTAURANT_FILTER',
        'restaurant.select': 'RESTAURANT_SELECT',
        'restaurant.availability': 'RESTAURANT_AVAILABILITY',
        'restaurant.booking.prepare': 'RESTAURANT_BOOKING_PREPARE',
        'restaurant.booking.confirm': 'RESTAURANT_BOOKING_CONFIRM',
        'restaurant.booking.status': 'RESTAURANT_BOOKING_STATUS',
        'restaurant.booking.cancel': 'RESTAURANT_BOOKING_CANCEL',
      }
      const forced = map[routed.intent]
      const isolated = await isolateFeature('restaurant', () =>
        handleRestaurantAgent(utterance, forced ? { forceIntent: forced } : undefined),
      )
      if (!isolated.ok) return null
      return finish(isolated.value)
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
