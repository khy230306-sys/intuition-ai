/**
 * Travel Agent dialogue — owns multi-turn session + provider calls.
 */

import type { BrainReply } from '../types'
import {
  confirmBooking,
  isExplicitBookingConfirm,
  isWeakApproval,
  prepareBooking,
} from './booking'
import { addTripToCalendar } from './calendarBridge'
import { isDemoTravelMode } from './config'
import { parseTravelDates } from './dates'
import { formatTravelerCandidates } from './familyBridge'
import {
  compareFlights,
  formatBookingPreview,
  formatBookingResult,
  formatFlightDetails,
  formatFlightList,
  formatHotelDetails,
  formatHotelList,
  formatTripSummary,
} from './format'
import { findOriginDestination, locationLabel } from './locations'
import { getFlightProvider, getHotelProvider } from './providers/registry'
import type { TravelSession } from './schema'
import {
  clearTravelSession,
  createTravelSession,
  loadTravelSession,
  saveTravelSession,
  updateTravelSession,
} from './session'
import { currentTrip, tripFromSession } from './trip'

export type TravelAgentResult = BrainReply & { travelIntent?: string }

function reply(text: string, travelIntent?: string): TravelAgentResult {
  return { text, speak: true, travelIntent }
}

function parseOrdinal(text: string): number | null {
  const map: Record<string, number> = {
    첫: 1,
    일: 1,
    '1': 1,
    두: 2,
    이: 2,
    '2': 2,
    세: 3,
    삼: 3,
    '3': 3,
    네: 4,
    '4': 4,
    다섯: 5,
    '5': 5,
  }
  const m =
    text.match(/(첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|[1-5]\s*번)/) ||
    text.match(/([일이삼사오])\s*번째로/)
  if (!m) return null
  const raw = m[1].replace(/\s/g, '')
  if (/첫번째|첫/.test(raw)) return 1
  if (/두번째|두/.test(raw)) return 2
  if (/세번째|세/.test(raw)) return 3
  if (/네번째|네/.test(raw)) return 4
  if (/다섯/.test(raw)) return 5
  const n = Number(raw.replace(/번.*/, ''))
  if (n >= 1 && n <= 5) return n
  for (const [k, v] of Object.entries(map)) {
    if (raw.includes(k)) return v
  }
  return null
}

function parseTravelers(text: string): { adults?: number; children?: number } | null {
  const fam = text.match(/가족\s*(\d+)\s*명/)
  if (fam) return { adults: Number(fam[1]), children: 0 }
  const adults = text.match(/성인\s*(\d+)/)
  const children = text.match(/(?:아동|어린이|아이)\s*(\d+)/)
  const just = text.match(/(\d+)\s*명/)
  if (adults || children) {
    return {
      adults: adults ? Number(adults[1]) : 1,
      children: children ? Number(children[1]) : 0,
    }
  }
  if (just && /(명|인원)/.test(text)) return { adults: Number(just[1]) }
  if (/혼자|1인/.test(text)) return { adults: 1 }
  if (/둘|두\s*명|커플/.test(text)) return { adults: 2 }
  return null
}

function applyEntityExtraction(session: TravelSession, text: string): TravelSession {
  const od = findOriginDestination(text)
  let dates = parseTravelDates(text)
  // Honor prior 「다음 달」 hint when user only gives day range
  if (!dates.departureDate && session.dateMonthHint === 'next') {
    dates = parseTravelDates(`다음 달 ${text}`)
  }
  const pax = parseTravelers(text)
  let next = { ...session }
  if (/다음\s*달/.test(text)) next.dateMonthHint = 'next'
  if (od.origin) next.origin = od.origin
  if (od.destination) next.destination = od.destination
  if (/인천\s*출발|출발\s*(은\s*)?인천|인천에서\s*출발/.test(text)) {
    next.origin = { code: 'ICN', name: '인천국제공항', city: '인천', country: 'KR', kind: 'airport' }
  }
  if (/김포\s*출발|서울\s*출발/.test(text)) {
    next.origin = { code: 'GMP', name: '김포국제공항', city: '서울', country: 'KR', kind: 'airport' }
  }
  if (dates.departureDate) next.departureDate = dates.departureDate
  if (dates.returnDate) next.returnDate = dates.returnDate
  if (pax) {
    next.travelers = {
      adults: pax.adults ?? next.travelers.adults,
      children: pax.children ?? next.travelers.children,
      infants: next.travelers.infants,
      total: (pax.adults ?? next.travelers.adults) + (pax.children ?? next.travelers.children),
    }
  }
  if (/왕복/.test(text)) next.tripType = 'round_trip'
  else if (/편도/.test(text)) next.tripType = 'one_way'
  if (/직항/.test(text)) {
    next.flightPreferences = { ...next.flightPreferences, directOnly: true }
  }
  if (/아침/.test(text) && /(비행|항공)/.test(text)) {
    next.flightPreferences = { ...next.flightPreferences, preferredTimeBand: 'morning' }
  }
  const maxFlight = text.match(/(\d+)\s*만\s*원\s*이하/)
  if (maxFlight && /(비행|항공|표)/.test(text)) {
    next.flightPreferences = {
      ...next.flightPreferences,
      maxPrice: Number(maxFlight[1]) * 10000,
    }
  }
  if (/바다|오션|해안|뷰/.test(text)) {
    next.hotelPreferences = { ...next.hotelPreferences, seaView: true }
  }
  if (/수영장|풀/.test(text)) {
    next.hotelPreferences = { ...next.hotelPreferences, pool: true }
  }
  if (/조식|아침\s*식사/.test(text) && /호텔|숙소/.test(text)) {
    next.hotelPreferences = { ...next.hotelPreferences, breakfast: true }
  }
  const hotelPrice = text.match(/1\s*박\s*(\d+)\s*만\s*원|(\d+)\s*만\s*원\s*이하/)
  if (hotelPrice && (/호텔|숙소|1\s*박/.test(text) || next.hotelPreferences)) {
    const n = Number(hotelPrice[1] || hotelPrice[2])
    next.hotelPreferences = { ...next.hotelPreferences, maxPricePerNight: n * 10000 }
  }
  if (/대한항공\s*말고|KE\s*제외/.test(text)) {
    next.flightPreferences = { ...next.flightPreferences, excludeAirline: '대한' }
  }
  if (/더\s*싼|싼\s*거|최저가/.test(text)) {
    next.flightPreferences = { ...next.flightPreferences, sortBy: 'price' }
  }
  next.demo = isDemoTravelMode()
  return next
}

function missingForFlight(s: TravelSession): string | null {
  if (!s.destination) return '어디로 가시나요? (예: 제주, 오사카)'
  if (!s.origin) return '어디서 출발하시나요? (예: 김포, 인천)'
  if (!s.departureDate) return '언제 출발하시나요?'
  if (s.tripType === 'unknown' && /여행|왕복|박/.test(JSON.stringify(s))) {
    /* ok */
  }
  return null
}

function missingForPlan(s: TravelSession): string | null {
  if (!s.departureDate) return '여행 날짜가 언제인가요? (예: 10일부터 13일까지)'
  if (!s.travelers.adults || (s.pendingQuestion === 'travelers' && !s.travelers.total)) {
    return '몇 명이 가시나요?'
  }
  if (!s.origin) return '어디서 출발하시나요? (예: 인천)'
  if (!s.destination) return '목적지가 어디인가요?'
  return null
}

async function runFlightSearch(session: TravelSession): Promise<TravelAgentResult> {
  // Soft default date: +7 days when user searched flights without a date
  if (!session.departureDate && session.destination) {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    session = saveTravelSession({
      ...session,
      departureDate: d.toISOString().slice(0, 10),
    })
  }
  const miss = missingForFlight(session)
  if (miss) {
    const next = saveTravelSession({ ...session, status: 'planning', pendingQuestion: 'flight' })
    void next
    return reply(miss, 'FLIGHT_SEARCH')
  }
  if (session.tripType === 'unknown') {
    saveTravelSession({ ...session, pendingQuestion: 'tripType' })
    return reply('편도인가요, 왕복인가요?', 'FLIGHT_SEARCH')
  }
  if (!navigator.onLine) {
    return reply('실시간 항공 검색에는 인터넷 연결이 필요합니다.', 'FLIGHT_SEARCH')
  }
  try {
    const prov = getFlightProvider()
    const res = await prov.searchFlights({
      origin: session.origin!.code,
      destination: session.destination!.code,
      departureDate: session.departureDate!,
      returnDate: session.returnDate,
      adults: session.travelers.adults,
      children: session.travelers.children,
      infants: session.travelers.infants,
      cabinClass: session.cabinClass,
      directOnly: session.flightPreferences?.directOnly,
      maxPrice: session.flightPreferences?.maxPrice,
      preferredTimeBand: session.flightPreferences?.preferredTimeBand,
      excludeAirline: session.flightPreferences?.excludeAirline,
      sortBy: session.flightPreferences?.sortBy || 'recommended',
    })
    const next = saveTravelSession({
      ...session,
      flightSearchResults: res.offers,
      status: 'selecting',
      pendingQuestion: undefined,
      demo: res.demo,
    })
    tripFromSession(next)
    return reply(formatFlightList(res.offers, res.demo), 'FLIGHT_SEARCH')
  } catch (e) {
    return reply(
      `항공 검색에 실패했습니다. ${e instanceof Error ? e.message : ''}`.trim(),
      'FLIGHT_SEARCH',
    )
  }
}

async function runHotelSearch(session: TravelSession): Promise<TravelAgentResult> {
  if (!session.destination) {
    saveTravelSession({ ...session, pendingQuestion: 'hotel_dest' })
    return reply('어느 지역 호텔을 찾을까요?', 'HOTEL_SEARCH')
  }
  const checkIn = session.departureDate
  const checkOut =
    session.returnDate ||
    (session.departureDate
      ? new Date(new Date(session.departureDate + 'T12:00:00').getTime() + 3 * 86400000)
          .toISOString()
          .slice(0, 10)
      : undefined)
  if (!checkIn || !checkOut) {
    return reply('체크인·체크아웃 날짜를 알려 주세요.', 'HOTEL_SEARCH')
  }
  if (!navigator.onLine) {
    return reply('실시간 호텔 검색에는 인터넷 연결이 필요합니다.', 'HOTEL_SEARCH')
  }
  try {
    const prov = getHotelProvider()
    const res = await prov.searchHotels({
      destination: session.destination.code || locationLabel(session.destination),
      checkIn,
      checkOut,
      adults: session.travelers.adults,
      children: session.travelers.children,
      maxPricePerNight: session.hotelPreferences?.maxPricePerNight,
      seaView: session.hotelPreferences?.seaView,
      pool: session.hotelPreferences?.pool,
      breakfast: session.hotelPreferences?.breakfast,
      parking: session.hotelPreferences?.parking,
      starRatingMin: session.hotelPreferences?.starRatingMin,
    })
    const next = saveTravelSession({
      ...session,
      departureDate: checkIn,
      returnDate: checkOut,
      hotelSearchResults: res.offers,
      status: 'selecting',
      demo: res.demo,
    })
    tripFromSession(next)
    return reply(formatHotelList(res.offers, res.demo), 'HOTEL_SEARCH')
  } catch (e) {
    return reply(
      `호텔 검색에 실패했습니다. ${e instanceof Error ? e.message : ''}`.trim(),
      'HOTEL_SEARCH',
    )
  }
}

async function runTravelPlan(session: TravelSession, text: string): Promise<TravelAgentResult> {
  let s = applyEntityExtraction(session, text)
  // Ask one thing at a time
  if (!s.departureDate) {
    s = saveTravelSession({ ...s, pendingQuestion: 'dates', status: 'planning' })
    return reply('여행 날짜가 언제인가요? (예: 다음 달 10일부터 13일까지)', 'TRAVEL_PLAN')
  }
  if (s.pendingQuestion === 'travelers' || (!parseTravelers(text) && s.travelers.adults === 1 && /가족|여행 준비|박/.test(text) && !/\d+\s*명/.test(text))) {
    // If user just gave a plan request without pax, ask
    if (!/\d+\s*명|가족\s*\d|성인|혼자|두\s*명/.test(text) && s.createdAt === s.updatedAt) {
      s = saveTravelSession({ ...s, pendingQuestion: 'travelers' })
      const fam = formatTravelerCandidates()
      return reply(`몇 명이 가시나요?${fam ? `\n${fam}` : ''}`, 'TRAVEL_PLAN')
    }
  }
  if (s.pendingQuestion === 'travelers' && parseTravelers(text)) {
    s = applyEntityExtraction(s, text)
    s = saveTravelSession({ ...s, pendingQuestion: 'origin' })
    return reply('어디서 출발하시나요? (예: 인천)', 'TRAVEL_PLAN')
  }
  if (!s.origin) {
    s = saveTravelSession({ ...s, pendingQuestion: 'origin' })
    return reply('어디서 출발하시나요? (예: 인천)', 'TRAVEL_PLAN')
  }
  if (!s.destination) {
    return reply('목적지를 알려 주세요.', 'TRAVEL_PLAN')
  }
  if (s.tripType === 'unknown') s = saveTravelSession({ ...s, tripType: 'round_trip' })
  // Search flights then suggest hotels in one flow message
  const flightReply = await runFlightSearch(s)
  s = loadTravelSession() || s
  const hotelReply = await runHotelSearch(s)
  s = loadTravelSession() || s
  const notes = [
    `${locationLabel(s.destination)} ${s.departureDate}~${s.returnDate || ''} 기본 일정 추천(DEMO)`,
    '· Day1: 도착·시내 산책',
    '· Day2: 대표 관광지',
    '· Day3: 쇼핑·카페',
    '· Day4: 귀국',
    '※ 외부 예약은 동의 없이 실행하지 않습니다.',
  ]
  s = saveTravelSession({
    ...s,
    status: 'selecting',
  })
  const trip = tripFromSession(s)
  trip.itineraryNotes = notes
  const { upsertTrip } = await import('./trip')
  upsertTrip(trip)
  return reply(
    [
      `【여행 플랜${s.demo ? ' · DEMO' : ''}】${trip.title}`,
      '',
      flightReply.text,
      '',
      hotelReply.text,
      '',
      notes.join('\n'),
    ].join('\n'),
    'TRAVEL_PLAN',
  )
}

/**
 * Handle travel utterance. Returns null if not a travel turn.
 */
export async function handleTravelAgent(
  text: string,
  opts?: { forceIntent?: string },
): Promise<TravelAgentResult | null> {
  const t = text.trim()
  if (!t) return null

  // How-to / explanation must never open booking Q&A (e.g. "비행기 예약하는 방법")
  if (
    !opts?.forceIntent &&
    /(예약하는\s*방법|예약하는\s*법|어떻게\s*예약|예약\s*방법|가격이\s*왜|만드는\s*법)/.test(t)
  ) {
    return null
  }

  let session = loadTravelSession()
  const force = opts?.forceIntent

  // Booking confirm / weak approval while ready_to_book
  if (session?.status === 'ready_to_book' || session?.bookingStatus === 'PREPARING') {
    if (isWeakApproval(t)) {
      return reply(
        '결제가 발생하는 단계는 자동으로 진행하지 않아요. 진행하려면 「응 예약해」라고 명확히 말씀해 주세요.',
        'BOOKING_CONFIRM',
      )
    }
    if (isExplicitBookingConfirm(t)) {
      const result = await confirmBooking(session, true)
      return reply(formatBookingResult(result), 'BOOKING_CONFIRM')
    }
  }

  // Follow-ups when session active
  const active = Boolean(session && session.status !== 'cancelled')
  const ordinal = parseOrdinal(t)

  if (active && session) {
    // Trip type answer
    if (session.pendingQuestion === 'tripType') {
      if (/왕복/.test(t)) session = saveTravelSession({ ...session, tripType: 'round_trip', pendingQuestion: undefined })
      else if (/편도/.test(t)) session = saveTravelSession({ ...session, tripType: 'one_way', pendingQuestion: undefined })
      else return reply('편도인가요, 왕복인가요?', 'FLIGHT_SEARCH')
      return runFlightSearch(applyEntityExtraction(session, t))
    }
    if (session.pendingQuestion === 'dates' || session.pendingQuestion === 'travelers' || session.pendingQuestion === 'origin') {
      session = applyEntityExtraction(session, t)
      if (session.pendingQuestion === 'dates' && session.departureDate) {
        session = saveTravelSession({ ...session, pendingQuestion: 'travelers' })
        return reply('몇 명이 가시나요?', 'TRAVEL_PLAN')
      }
      if (session.pendingQuestion === 'travelers' && (parseTravelers(t) || /\d/.test(t))) {
        session = applyEntityExtraction(session, t)
        session = saveTravelSession({ ...session, pendingQuestion: 'origin' })
        return reply('어디서 출발하시나요?', 'TRAVEL_PLAN')
      }
      if (session.pendingQuestion === 'origin' && (session.origin || findOriginDestination(t).origin)) {
        session = applyEntityExtraction(session, t)
        session = saveTravelSession({ ...session, pendingQuestion: undefined, tripType: session.tripType === 'unknown' ? 'round_trip' : session.tripType })
        return runTravelPlan(session, t)
      }
      return runTravelPlan(session, t)
    }

    // Select flight / hotel by ordinal
    if (ordinal && (session.flightSearchResults.length || session.hotelSearchResults.length)) {
      const wantHotel =
        /호텔|숙소/.test(t) ||
        (!/항공|비행/.test(t) && session.selectedFlight && session.hotelSearchResults.length && !session.selectedHotel)
      if (wantHotel && session.hotelSearchResults.length) {
        const h = session.hotelSearchResults[ordinal - 1]
        if (!h) return reply('그 번호의 호텔이 없어요.', 'HOTEL_SELECT')
        session = saveTravelSession({ ...session, selectedHotel: h, status: 'selecting' })
        tripFromSession(session)
        return reply(`${ordinal}번 호텔로 선택했어요.\n${formatHotelDetails(h)}`, 'HOTEL_SELECT')
      }
      if (session.flightSearchResults.length && (!session.selectedFlight || /항공|비행|번째/.test(t) || !wantHotel)) {
        // Prefer flight select if results exist and hotel not explicitly asked
        if (!session.selectedFlight || /항공|비행|번째가 좋아|번째로/.test(t) || (!session.hotelSearchResults.length)) {
          const f = session.flightSearchResults[ordinal - 1]
          if (!f) return reply('그 번호의 항공편이 없어요.', 'FLIGHT_SELECT')
          session = saveTravelSession({ ...session, selectedFlight: f, status: 'selecting' })
          tripFromSession(session)
          return reply(`${ordinal}번 항공편으로 선택했어요.\n${formatFlightDetails(f)}`, 'FLIGHT_SELECT')
        }
      }
      if (session.hotelSearchResults.length) {
        const h = session.hotelSearchResults[ordinal - 1]
        if (!h) return reply('그 번호의 호텔이 없어요.', 'HOTEL_SELECT')
        session = saveTravelSession({ ...session, selectedHotel: h })
        tripFromSession(session)
        return reply(`${ordinal}번 호텔로 선택했어요.\n${formatHotelDetails(h)}`, 'HOTEL_SELECT')
      }
    }

    // Compare
    const cmp = t.match(/([1-5])\s*.*\s*([1-5])\s*.*비교|첫\s*번째랑\s*세\s*번째/)
    if (cmp || /비교/.test(t)) {
      const a = /첫/.test(t) ? 0 : Number(cmp?.[1] || 1) - 1
      const b = /세/.test(t) ? 2 : Number(cmp?.[2] || 3) - 1
      const list = session.flightSearchResults
      if (list[a] && list[b]) return reply(compareFlights(list[a], list[b], a, b), 'FLIGHT_DETAILS')
    }

    if (/자세히|상세/.test(t)) {
      const n = ordinal || 1
      if (/호텔/.test(t) && session.hotelSearchResults[n - 1]) {
        return reply(formatHotelDetails(session.hotelSearchResults[n - 1]), 'HOTEL_DETAILS')
      }
      if (session.flightSearchResults[n - 1]) {
        return reply(formatFlightDetails(session.flightSearchResults[n - 1]), 'FLIGHT_DETAILS')
      }
    }

    if (/더\s*싼|싼\s*거\s*없|최저가/.test(t) && session.destination) {
      session = applyEntityExtraction(session, t)
      session = saveTravelSession({
        ...session,
        flightPreferences: { ...session.flightPreferences, sortBy: 'price' },
      })
      return runFlightSearch(session)
    }

    if (/직항\s*만/.test(t)) {
      session = saveTravelSession({
        ...session,
        flightPreferences: { ...session.flightPreferences, directOnly: true },
      })
      return runFlightSearch(session)
    }

    if (/아침\s*비행/.test(t)) {
      session = saveTravelSession({
        ...session,
        flightPreferences: { ...session.flightPreferences, preferredTimeBand: 'morning' },
      })
      return runFlightSearch(session)
    }

    if (/호텔도|호텔\s*도|호텔\s*(알아|찾|같이)/.test(t)) {
      session = applyEntityExtraction(session, t)
      return runHotelSearch(session)
    }

    if (/20\s*만|만원\s*이하|1\s*박/.test(t) && (session.hotelSearchResults.length || /호텔/.test(t))) {
      session = applyEntityExtraction(session, t)
      return runHotelSearch(session)
    }

    if (/총\s*(얼마|비용|합계)|전체\s*얼마|이번\s*여행\s*총/.test(t)) {
      return reply(formatTripSummary(session, currentTrip()), 'TRIP_SUMMARY')
    }

    if (/일정에\s*(저장|추가)|캘린더/.test(t)) {
      const trip = tripFromSession(session)
      const cal = addTripToCalendar(trip)
      trip.calendarEventIds = cal.eventIds
      const { upsertTrip } = await import('./trip')
      upsertTrip(trip)
      return reply(`${formatTripSummary(session, trip)}\n\n${cal.message}`, 'TRIP_CALENDAR_ADD')
    }

    if (/이걸로\s*예약|예약해\s*줘|예약\s*진행/.test(t) && !isExplicitBookingConfirm(t)) {
      if (!session.selectedFlight && !session.selectedHotel) {
        return reply('먼저 항공편이나 호텔을 선택해 주세요.', 'BOOKING_PREPARE')
      }
      try {
        const preview = await prepareBooking(session)
        return reply(formatBookingPreview(preview), 'BOOKING_PREPARE')
      } catch (e) {
        return reply(e instanceof Error ? e.message : '예약 준비에 실패했습니다.', 'BOOKING_PREPARE')
      }
    }

    if (/예약\s*취소/.test(t)) {
      session = saveTravelSession({ ...session, status: 'cancelled', bookingStatus: 'CANCELLED' })
      return reply('여행 예약을 취소 상태로 표시했어요. (DEMO — 실제 Provider 취소는 키가 있을 때 연동됩니다)', 'BOOKING_CANCEL')
    }

    if (/예약\s*상태|예약\s*확인/.test(t)) {
      return reply(
        `현재 예약 상태: ${session.bookingStatus}\nAttempt: ${session.lastBookingAttemptId || '없음'}`,
        'BOOKING_STATUS',
      )
    }
  }

  // Fresh intents
  const isPlan =
    force === 'TRAVEL_PLAN' ||
    /(여행\s*준비|여행\s*계획|가족여행|여행\s*알아|박\d*일.*여행|\d+박\d+일|가려고)/.test(t)
  const isFlight =
    force === 'FLIGHT_SEARCH' ||
    /(비행기|항공권|항공편|비행\s*편|항공\s*찾아|비행\s*찾아|가는\s*비행|직항)/.test(t)
  const isHotel =
    force === 'HOTEL_SEARCH' ||
    /(호텔|숙소|리조트).*(알아|찾|검색|추천)|(바다\s*보이는\s*호텔)/.test(t)

  if (!isPlan && !isFlight && !isHotel && !force) {
    // Soft follow-up only if active session and travel-ish
    if (active && session && /(오사카|제주|도쿄|부산|인천|김포|여행|항공|호텔)/.test(t)) {
      session = applyEntityExtraction(session, t)
      if (session.pendingQuestion) return handleTravelAgent(t, { forceIntent: 'TRAVEL_PLAN' })
    }
    return null
  }

  if (!session || session.status === 'cancelled' || session.status === 'booked') {
    session = createTravelSession()
  }
  session = applyEntityExtraction(session, t)
  session = saveTravelSession(session)

  if (isPlan) {
    // First turn of plan: ask dates if missing, else continue
    if (!session.departureDate) {
      saveTravelSession({ ...session, pendingQuestion: 'dates' })
      return reply('좋아요. 여행 날짜가 언제인가요?', 'TRAVEL_PLAN')
    }
    if (!parseTravelers(t) && session.travelers.adults === 1 && /가족/.test(t)) {
      saveTravelSession({ ...session, pendingQuestion: 'travelers' })
      return reply(`몇 명이 가시나요?\n${formatTravelerCandidates()}`, 'TRAVEL_PLAN')
    }
    return runTravelPlan(session, t)
  }
  if (isHotel && !isFlight) return runHotelSearch(session)
  if (isFlight) {
    // Default trip type for simple search
    if (session.tripType === 'unknown' && !/왕복|편도/.test(t)) {
      // Ask only if not obvious one-way phrase
      if (!/편도|원웨이/.test(t)) {
        saveTravelSession({ ...session, pendingQuestion: 'tripType' })
        return reply('편도인가요, 왕복인가요?', 'FLIGHT_SEARCH')
      }
    }
    if (/편도/.test(t)) session = saveTravelSession({ ...session, tripType: 'one_way' })
    if (/왕복/.test(t)) session = saveTravelSession({ ...session, tripType: 'round_trip' })
    return runFlightSearch(session)
  }

  return reply('여행을 어떻게 도와드릴까요? 항공·호텔·여행 준비를 말씀해 주세요.', 'TRAVEL_UNKNOWN')
}

export function getTravelSessionSnapshot(): TravelSession | null {
  return loadTravelSession()
}

export function resetTravelAgent(): void {
  clearTravelSession()
}

void missingForPlan
void updateTravelSession
