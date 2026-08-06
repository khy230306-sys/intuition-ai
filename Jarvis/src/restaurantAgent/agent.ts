/**
 * Restaurant Agent dialogue — multi-turn session + provider calls.
 */

import type { BrainReply } from '../types'
import { loadTrips } from '../travelAgent/trip'
import {
  confirmRestaurantReservation,
  isExplicitRestaurantConfirm,
  isWeakRestaurantApproval,
  prepareRestaurantReservation,
} from './booking'
import { isDemoRestaurantMode } from './config'
import {
  compareRestaurants,
  formatReservationPreview,
  formatReservationResult,
  formatRestaurantDetails,
  formatRestaurantList,
} from './format'
import { parseOrdinal, parseRestaurantQuery, parseTimeOnly } from './parse'
import { getRestaurantProvider } from './providers/registry'
import type { RestaurantSearchInput, RestaurantSession } from './schema'
import {
  clearRestaurantSession,
  createRestaurantSession,
  loadRestaurantSession,
  saveRestaurantSession,
} from './session'
import { addRestaurantToCalendar } from './calendarBridge'
import { maybeAttachToTrip } from './tripBridge'

export type RestaurantAgentResult = BrainReply & { restaurantIntent?: string }

function reply(text: string, restaurantIntent?: string): RestaurantAgentResult {
  return { text, speak: true, restaurantIntent }
}

function mergeInput(session: RestaurantSession, text: string): RestaurantSearchInput {
  return parseRestaurantQuery(text, session.searchInput || {})
}

async function runSearch(session: RestaurantSession): Promise<RestaurantAgentResult> {
  const input: RestaurantSearchInput = { ...(session.searchInput || {}) }
  if (!input.location && !input.nearMe) {
    saveRestaurantSession({ ...session, pendingQuestion: 'location', status: 'searching' })
    return reply('어느 지역에서 찾으실까요? (예: 울산 삼산)', 'RESTAURANT_SEARCH')
  }
  if (input.nearMe && !input.location) {
    saveRestaurantSession({ ...session, pendingQuestion: 'location', status: 'searching' })
    return reply('위치 권한이 없어 근처 검색을 못 했어요. 지역을 알려 주세요.', 'RESTAURANT_SEARCH')
  }
  if (!input.partySize && session.pendingQuestion !== 'skip_party') {
    if (!session.partySize) {
      saveRestaurantSession({ ...session, pendingQuestion: 'partySize', status: 'searching' })
      return reply('몇 명이서 가시나요?', 'RESTAURANT_SEARCH')
    }
  }
  if (!navigator.onLine) {
    return reply('실시간 맛집 검색에는 인터넷 연결이 필요합니다. 저장된 예약은 오프라인에서도 볼 수 있어요.', 'RESTAURANT_SEARCH')
  }
  try {
    const prov = getRestaurantProvider()
    const res = await prov.searchRestaurants({
      ...input,
      partySize: session.partySize || input.partySize,
    })
    const next = saveRestaurantSession({
      ...session,
      searchInput: input,
      results: res.offers,
      status: 'selecting',
      pendingQuestion: undefined,
      demo: res.demo || isDemoRestaurantMode(),
      selectedDate: session.selectedDate || input.date,
      selectedTime: session.selectedTime || input.time,
      partySize: session.partySize || input.partySize,
    })
    return reply(formatRestaurantList(res.offers, next.demo, input), 'RESTAURANT_SEARCH')
  } catch (e) {
    return reply(`검색에 실패했습니다. ${e instanceof Error ? e.message : ''}`.trim(), 'RESTAURANT_SEARCH')
  }
}

/**
 * Handle restaurant utterance. Returns null if not a restaurant turn.
 */
export async function handleRestaurantAgent(
  text: string,
  opts?: { forceIntent?: string },
): Promise<RestaurantAgentResult | null> {
  const t = text.trim()
  if (!t) return null

  let session = loadRestaurantSession()
  const force = opts?.forceIntent
  const active = Boolean(session && session.status !== 'cancelled')

  // Seed from active travel trip when user mentions trip dinner
  if (/여행|오사카|둘째\s*날|여행\s*중/.test(t)) {
    const trip = loadTrips()[0]
    if (trip) {
      session = session || createRestaurantSession()
      const input = mergeInput(session, t)
      if (!input.location && trip.destinationLabel) input.location = trip.destinationLabel
      if (!input.partySize && trip.travelers?.adults) input.partySize = trip.travelers.adults
      if (!input.date && trip.departureDate) {
        // second day heuristic
        if (/둘째|2\s*일/.test(t) && trip.departureDate) {
          const d = new Date(trip.departureDate + 'T12:00:00')
          d.setDate(d.getDate() + 1)
          input.date = d.toISOString().slice(0, 10)
        } else input.date = trip.departureDate
      }
      session = saveRestaurantSession({ ...session, searchInput: input, tripId: trip.id })
    }
  }

  if (session?.status === 'ready_to_book' || session?.reservationStatus === 'PREPARING') {
    if (isWeakRestaurantApproval(t)) {
      return reply(
        '예약은 자동으로 진행하지 않아요. 「응 예약해」라고 명확히 확인해 주세요.',
        'RESTAURANT_BOOKING_CONFIRM',
      )
    }
    if (isExplicitRestaurantConfirm(t)) {
      // Allow DEMO confirm without forcing real PII — fill demo placeholders only in demo mode
      if (isDemoRestaurantMode()) {
        session = saveRestaurantSession({
          ...session,
          guestName: session.guestName || 'DEMO손님',
          guestPhone: session.guestPhone || '000-0000-0000',
        })
      }
      const result = await confirmRestaurantReservation(session, true)
      if (result.status === 'CONFIRMED') {
        maybeAttachToTrip(session, result)
      }
      return reply(formatReservationResult(result), 'RESTAURANT_BOOKING_CONFIRM')
    }
  }

  // Collect pending answers
  if (session?.pendingQuestion === 'location') {
    const input = mergeInput(session, t)
    if (!input.location) input.location = t.replace(/이요|요$|입니다$/, '').trim()
    session = saveRestaurantSession({ ...session, searchInput: input, pendingQuestion: 'partySize' })
    return reply('몇 명이서 가시나요?', 'RESTAURANT_SEARCH')
  }
  if (session?.pendingQuestion === 'partySize') {
    const input = mergeInput(session, t)
    const n = input.partySize || Number(t.match(/(\d+)/)?.[1] || 0)
    if (!n) return reply('인원을 숫자로 알려 주세요. (예: 4명)', 'RESTAURANT_SEARCH')
    session = saveRestaurantSession({
      ...session,
      searchInput: { ...input, partySize: n },
      partySize: n,
      pendingQuestion: undefined,
    })
    // If cuisine not set and user might say next — if this message only had party, wait or search
    if (!session.searchInput?.cuisine && !/(한식|고기|일식|중식|양식|카페)/.test(t)) {
      // continue — user may send cuisine next; if force search from multi-turn they'll say 한식으로
      return reply('어떤 음식으로 할까요? (한식, 고기, 일식…)', 'RESTAURANT_SEARCH')
    }
    return runSearch(session)
  }

  // Cuisine after party in multi-turn
  if (
    active &&
    session &&
    session.results.length === 0 &&
    session.partySize &&
    session.searchInput?.location &&
    /(한식|고기|일식|중식|양식|카페)(으로|집)?/.test(t)
  ) {
    const input = mergeInput(session, t)
    session = saveRestaurantSession({ ...session, searchInput: input })
    return runSearch(session)
  }

  if (active && session) {
    // Time change: 7시 반으로
    const timeOnly = parseTimeOnly(t)
    if (timeOnly && /(으로\s*해|로\s*해|반으로)/.test(t)) {
      session = saveRestaurantSession({
        ...session,
        selectedTime: timeOnly,
        searchInput: { ...(session.searchInput || {}), time: timeOnly },
      })
      if (session.selectedRestaurant) {
        const prov = getRestaurantProvider()
        if (prov.checkAvailability) {
          const av = await prov.checkAvailability({
            restaurantId: session.selectedRestaurant.id,
            date: session.selectedDate || session.searchInput?.date || new Date().toISOString().slice(0, 10),
            time: timeOnly,
            partySize: session.partySize || 2,
          })
          return reply(av.message + (av.available ? '\n예약 준비할까요?' : ''), 'RESTAURANT_AVAILABILITY')
        }
      }
      return runSearch(session)
    }

    // Availability check
    if (/돼\?|가능|자리/.test(t) || force === 'RESTAURANT_AVAILABILITY') {
      const time = parseTimeOnly(t) || session.selectedTime || session.searchInput?.time || '19:00'
      const selected = session.selectedRestaurant
      if (!selected) {
        return reply('먼저 식당을 골라 주세요. (예: 두 번째)', 'RESTAURANT_AVAILABILITY')
      }
      session = saveRestaurantSession({
        ...session,
        selectedTime: time,
        status: 'checking_availability',
      })
      const prov = getRestaurantProvider()
      if (!prov.checkAvailability) {
        return reply('이 Provider는 예약 가능 시간 조회를 지원하지 않습니다.', 'RESTAURANT_AVAILABILITY')
      }
      const av = await prov.checkAvailability({
        restaurantId: selected.id,
        date: session.selectedDate || session.searchInput?.date || new Date().toISOString().slice(0, 10),
        time,
        partySize: session.partySize || session.searchInput?.partySize || 2,
      })
      if (!av.available && av.alternatives.length) {
        return reply(
          `${time.replace(/^0/, '')}는 예약이 없습니다. 가장 가까운 시간은 ${av.alternatives.join(', ')}입니다.`,
          'RESTAURANT_AVAILABILITY',
        )
      }
      return reply(av.message, 'RESTAURANT_AVAILABILITY')
    }

    // Filters
    if (
      force === 'RESTAURANT_FILTER' ||
      /(주차되는|아이랑|룸 있는|더 싼|가까운|평점|한식|고깃집|일식|조용)/.test(t)
    ) {
      const input = mergeInput(session, t)
      if (/더\s*싼|싼\s*곳/.test(t)) input.sortBy = 'price'
      session = saveRestaurantSession({ ...session, searchInput: input })
      return runSearch(session)
    }

    // Select / details / compare
    const ordinal = parseOrdinal(t)
    if (/비교/.test(t)) {
      const a = session.results[0]
      const b = session.results[2] || session.results[1]
      if (a && b) return reply(compareRestaurants(a, b, 0, session.results[2] ? 2 : 1), 'RESTAURANT_DETAILS')
    }
    if (ordinal && /자세히|상세/.test(t)) {
      const o = session.results[ordinal - 1]
      if (!o) return reply('그 번호의 식당이 없어요.', 'RESTAURANT_DETAILS')
      return reply(formatRestaurantDetails(o), 'RESTAURANT_DETAILS')
    }
    if (ordinal && (/예약/.test(t) || force === 'RESTAURANT_BOOKING_PREPARE')) {
      const o = session.results[ordinal - 1]
      if (!o) return reply('그 번호의 식당이 없어요.', 'RESTAURANT_SELECT')
      session = saveRestaurantSession({ ...session, selectedRestaurant: o, status: 'selecting' })
      try {
        const preview = await prepareRestaurantReservation(session)
        if (preview.missingFields.filter((f) => f !== 'guestName' && f !== 'guestPhone').length) {
          return reply(formatReservationPreview(preview), 'RESTAURANT_BOOKING_PREPARE')
        }
        // Demo: allow prepare without real PII but list them
        return reply(formatReservationPreview(preview), 'RESTAURANT_BOOKING_PREPARE')
      } catch (e) {
        return reply(e instanceof Error ? e.message : '예약 준비 실패', 'RESTAURANT_BOOKING_PREPARE')
      }
    }
    if (ordinal) {
      const o = session.results[ordinal - 1]
      if (!o) return reply('그 번호의 식당이 없어요.', 'RESTAURANT_SELECT')
      session = saveRestaurantSession({ ...session, selectedRestaurant: o, status: 'selecting' })
      return reply(`${ordinal}번 ${o.name}을(를) 선택했어요.\n${formatRestaurantDetails(o)}`, 'RESTAURANT_SELECT')
    }

    if (/그럼\s*예약|예약해\s*줘|예약\s*해줘/.test(t)) {
      if (!session.selectedRestaurant) return reply('먼저 식당을 선택해 주세요.', 'RESTAURANT_BOOKING_PREPARE')
      try {
        const preview = await prepareRestaurantReservation(session)
        return reply(formatReservationPreview(preview), 'RESTAURANT_BOOKING_PREPARE')
      } catch (e) {
        return reply(e instanceof Error ? e.message : '예약 준비 실패', 'RESTAURANT_BOOKING_PREPARE')
      }
    }

    if (/예약\s*취소/.test(t)) {
      session = saveRestaurantSession({ ...session, status: 'cancelled', reservationStatus: 'CANCELLED' })
      return reply('식당 예약을 취소 상태로 표시했어요. (DEMO — 실제 Provider 취소는 키 연동 후)', 'RESTAURANT_BOOKING_CANCEL')
    }

    if (/일정에\s*추가|예약\s*일정/.test(t)) {
      if (!session.selectedRestaurant) return reply('선택된 식당 예약이 없어요.', 'RESTAURANT_BOOKING_STATUS')
      const cal = addRestaurantToCalendar(session)
      return reply(cal.message, 'RESTAURANT_BOOKING_STATUS')
    }
  }

  // Fresh search
  const wantSearch =
    force === 'RESTAURANT_SEARCH' ||
    /(맛집|식당|레스토랑|외식|한식집|고깃집|뭐\s*먹)/.test(t)

  if (!wantSearch && !force) return null

  if (!session || session.status === 'cancelled' || session.status === 'reserved') {
    session = createRestaurantSession()
  }
  const input = mergeInput(session, t)
  session = saveRestaurantSession({ ...session, searchInput: input, status: 'searching' })

  // Multi-turn soft start: 오늘 저녁 가족들이랑 외식
  if (/외식|가족/.test(t) && !input.location) {
    session = saveRestaurantSession({ ...session, pendingQuestion: 'location' })
    return reply('좋아요. 어느 지역에서 찾으실까요?', 'RESTAURANT_SEARCH')
  }

  return runSearch(session)
}

export function getRestaurantSessionSnapshot(): RestaurantSession | null {
  return loadRestaurantSession()
}

export function resetRestaurantAgent(): void {
  clearRestaurantSession()
}
