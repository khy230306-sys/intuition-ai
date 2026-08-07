/**
 * Booking prepare / confirm with idempotency (bookingAttemptId).
 * Never auto-charges; live providers require explicit confirm + configured keys.
 */

import {
  isLegacyDemoProvidersEnabled,
  MSG_TRAVEL_BOOKING_UNAVAILABLE,
} from '../featureTruth'
import { isDemoTravelMode, loadTravelConfig } from './config'
import { getFlightProvider, getHotelProvider } from './providers/registry'
import {
  BookingPreviewSchema,
  type BookingPreview,
  type BookingResult,
  type BookingStatus,
  type TravelSession,
} from './schema'
import { saveTravelSession } from './session'
import { tripFromSession } from './trip'

const ATTEMPTS_KEY = 'aizio_travel_booking_attempts_v1'

type AttemptRecord = {
  bookingAttemptId: string
  status: BookingStatus
  result?: BookingResult
  createdAt: number
  updatedAt: number
}

function newAttemptId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ba_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function loadAttempts(): AttemptRecord[] {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]') as AttemptRecord[]
  } catch {
    return []
  }
}

function saveAttempt(rec: AttemptRecord): void {
  const list = loadAttempts().filter((a) => a.bookingAttemptId !== rec.bookingAttemptId)
  list.unshift(rec)
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list.slice(0, 50)))
}

export function getAttempt(id: string): AttemptRecord | null {
  return loadAttempts().find((a) => a.bookingAttemptId === id) || null
}

export async function prepareBooking(session: TravelSession): Promise<BookingPreview> {
  const bookingAttemptId = session.lastBookingAttemptId || newAttemptId()
  const prev = getAttempt(bookingAttemptId)
  if (prev?.status === 'UNKNOWN' || prev?.status === 'SUBMITTING') {
    throw new Error('이전 예약 상태가 확인되지 않아 새 예약을 시작할 수 없습니다. 예약 상태를 먼저 확인해 주세요.')
  }

  let flight = session.selectedFlight
  let hotel = session.selectedHotel
  let priceChanged = false
  let previousGrandTotal: number | undefined

  const flightProv = getFlightProvider()
  const hotelProv = getHotelProvider()

  if (flight && flightProv.priceOffer) {
    try {
      const repriced = await flightProv.priceOffer(flight.id)
      if (repriced.totalPrice !== flight.totalPrice) {
        priceChanged = true
        previousGrandTotal = (flight.totalPrice || 0) + (hotel?.totalPrice || 0)
      }
      flight = repriced
    } catch {
      /* keep cached price */
    }
  }
  if (hotel && hotelProv.prepareBooking && session.departureDate && session.returnDate) {
    try {
      const preview = await hotelProv.prepareBooking({
        offerId: hotel.id,
        bookingAttemptId,
        adults: session.travelers.adults,
        children: session.travelers.children,
        checkIn: session.departureDate,
        checkOut: session.returnDate,
      })
      if (preview.total !== hotel.totalPrice) {
        priceChanged = true
        previousGrandTotal = previousGrandTotal ?? (flight?.totalPrice || 0) + hotel.totalPrice
      }
      hotel = preview.offer
    } catch {
      /* keep */
    }
  }

  const flightTotal = flight?.totalPrice || 0
  const hotelTotal = hotel?.totalPrice || 0
  const providerReady = !isDemoTravelMode(loadTravelConfig())

  const preview = BookingPreviewSchema.parse({
    bookingAttemptId,
    flight,
    hotel,
    travelers: session.travelers,
    flightTotal,
    hotelTotal,
    grandTotal: flightTotal + hotelTotal,
    currency: 'KRW',
    priceChanged,
    previousGrandTotal,
    notes: [
      flight?.priceKind === 'demo' || hotel?.priceKind === 'demo' || isDemoTravelMode()
        ? 'DEMO 가격입니다. 실제 요금과 다를 수 있습니다.'
        : '가격을 Provider에서 재확인했습니다.',
    ],
    providerReady,
  })

  saveAttempt({
    bookingAttemptId,
    status: 'PREPARING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  saveTravelSession({
    ...session,
    selectedFlight: flight,
    selectedHotel: hotel,
    lastBookingAttemptId: bookingAttemptId,
    bookingStatus: 'PREPARING',
    status: 'ready_to_book',
  })

  return preview
}

/** Only call after explicit user confirmation language. */
export async function confirmBooking(session: TravelSession, explicitConfirm: boolean): Promise<BookingResult> {
  if (!explicitConfirm) {
    return {
      bookingAttemptId: session.lastBookingAttemptId || '',
      status: 'FAILED',
      message: '최종 예약은 「응 예약해」「예약 진행해」처럼 명확한 승인 후에만 진행됩니다.',
    }
  }

  const attemptId = session.lastBookingAttemptId || newAttemptId()
  const existing = getAttempt(attemptId)
  if (existing?.status === 'CONFIRMED' && existing.result) return existing.result
  if (existing?.status === 'UNKNOWN' || existing?.status === 'SUBMITTING') {
    // Must query status — never create a new booking
    const flightProv = getFlightProvider()
    if (flightProv.getBooking) {
      const st = await flightProv.getBooking(attemptId)
      saveAttempt({ ...existing, status: st.status, result: st, updatedAt: Date.now() })
      return st
    }
    return {
      bookingAttemptId: attemptId,
      status: 'UNKNOWN',
      message: '예약 상태가 확인되지 않습니다. 새 예약을 만들지 않았습니다.',
    }
  }

  saveAttempt({ bookingAttemptId: attemptId, status: 'SUBMITTING', createdAt: Date.now(), updatedAt: Date.now() })

  if (isDemoTravelMode()) {
    // Production: never invent confirmation codes. Tests may enable legacy DEMO.
    if (!isLegacyDemoProvidersEnabled()) {
      const result: BookingResult = {
        bookingAttemptId: attemptId,
        status: 'FAILED',
        message: MSG_TRAVEL_BOOKING_UNAVAILABLE,
      }
      saveAttempt({
        bookingAttemptId: attemptId,
        status: 'FAILED',
        result,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      saveTravelSession({
        ...session,
        lastBookingAttemptId: attemptId,
        bookingStatus: 'FAILED',
      })
      return result
    }
    const result: BookingResult = {
      bookingAttemptId: attemptId,
      status: 'CONFIRMED',
      confirmationCode: `DEMO-${attemptId.slice(0, 8).toUpperCase()}`,
      flightPnr: session.selectedFlight ? `PNR${attemptId.slice(0, 6).toUpperCase()}` : undefined,
      hotelConfirmation: session.selectedHotel ? `H${attemptId.slice(0, 8).toUpperCase()}` : undefined,
      grandTotal: (session.selectedFlight?.totalPrice || 0) + (session.selectedHotel?.totalPrice || 0),
      currency: 'KRW',
      message:
        '예약 준비가 완료되었습니다. 현재 연결된 예약 Provider가 없어 실제 결제는 진행되지 않았습니다. (DEMO)',
      bookedAt: new Date().toISOString(),
    }
    saveAttempt({
      bookingAttemptId: attemptId,
      status: 'CONFIRMED',
      result,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const next = {
      ...session,
      lastBookingAttemptId: attemptId,
      bookingStatus: 'CONFIRMED' as const,
      status: 'booked' as const,
    }
    saveTravelSession(next)
    const trip = tripFromSession(next)
    trip.confirmationCode = result.confirmationCode
    trip.flightPnr = result.flightPnr
    trip.hotelConfirmation = result.hotelConfirmation
    trip.bookingStatus = 'CONFIRMED'
    const { upsertTrip } = await import('./trip')
    upsertTrip(trip)
    return result
  }

  // Live path scaffold — still requires provider createBooking
  try {
    const flightProv = getFlightProvider()
    let result: BookingResult = {
      bookingAttemptId: attemptId,
      status: 'FAILED',
      message: '연결된 예약 Provider의 createBooking이 없습니다.',
    }
    if (session.selectedFlight && flightProv.createBooking) {
      result = await flightProv.createBooking({
        offerId: session.selectedFlight.id,
        bookingAttemptId: attemptId,
        adults: session.travelers.adults,
        children: session.travelers.children,
        infants: session.travelers.infants,
      })
    }
    saveAttempt({ bookingAttemptId: attemptId, status: result.status, result, createdAt: Date.now(), updatedAt: Date.now() })
    return result
  } catch (e) {
    const fail: BookingResult = {
      bookingAttemptId: attemptId,
      status: 'UNKNOWN',
      message: `예약 요청 중 오류 — 상태 불명. 재시도 전 조회가 필요합니다. (${e instanceof Error ? e.message : 'error'})`,
    }
    saveAttempt({ bookingAttemptId: attemptId, status: 'UNKNOWN', result: fail, createdAt: Date.now(), updatedAt: Date.now() })
    return fail
  }
}

export function isExplicitBookingConfirm(text: string): boolean {
  const t = text.trim()
  return (
    /^(응|네|예)\s*(예약|진행|결제)?\s*(해|해줘|해주세요|하자|하자고)?\s*$/i.test(t) ||
    /예약\s*(진행|확정|완료)\s*(해|해줘|해주세요)/i.test(t) ||
    /^(최종\s*)?예약\s*해\s*줘/i.test(t) ||
    /결제\s*(해|진행)/i.test(t) ||
    /confirm\s*booking/i.test(t)
  )
}

/** Exported for tests + agent confirm gate */
export function isWeakApproval(text: string): boolean {
  const t = text.trim()
  return /^(좋네|괜찮아|괜찮다|그래|좋아|ㅇㅋ|ok)$/i.test(t)
}
