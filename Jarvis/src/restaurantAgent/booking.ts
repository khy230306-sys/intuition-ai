import { isDemoRestaurantMode } from './config'
import { getRestaurantProvider } from './providers/registry'
import type { RestaurantReservationPreview, RestaurantReservationResult, RestaurantSession } from './schema'
import { RestaurantReservationPreviewSchema } from './schema'
import { saveRestaurantSession } from './session'

const ATTEMPTS_KEY = 'aizio_restaurant_reservation_attempts_v1'

type AttemptRecord = {
  reservationAttemptId: string
  status: RestaurantReservationResult['status']
  result?: RestaurantReservationResult
  createdAt: number
  updatedAt: number
}

function newAttemptId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function loadAttempts(): AttemptRecord[] {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]') as AttemptRecord[]
  } catch {
    return []
  }
}

function saveAttempt(rec: AttemptRecord): void {
  const list = loadAttempts().filter((a) => a.reservationAttemptId !== rec.reservationAttemptId)
  list.unshift(rec)
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list.slice(0, 50)))
}

export function getReservationAttempt(id: string): AttemptRecord | null {
  return loadAttempts().find((a) => a.reservationAttemptId === id) || null
}

export async function prepareRestaurantReservation(
  session: RestaurantSession,
): Promise<RestaurantReservationPreview> {
  if (!session.selectedRestaurant) throw new Error('먼저 식당을 선택해 주세요.')
  const date = session.selectedDate || session.searchInput?.date
  const time = session.selectedTime || session.searchInput?.time
  const partySize = session.partySize || session.searchInput?.partySize
  const missing: string[] = []
  if (!date) missing.push('date')
  if (!time) missing.push('time')
  if (!partySize) missing.push('partySize')
  // Never invent PII
  if (!session.guestName) missing.push('guestName')
  if (!session.guestPhone) missing.push('guestPhone')

  const attemptId = session.lastReservationAttemptId || newAttemptId()
  const prev = getReservationAttempt(attemptId)
  if (prev?.status === 'UNKNOWN' || prev?.status === 'SUBMITTING') {
    throw new Error('이전 예약 상태가 확인되지 않아 새 예약을 시작할 수 없습니다.')
  }

  const r = session.selectedRestaurant
  const preview = RestaurantReservationPreviewSchema.parse({
    reservationAttemptId: attemptId,
    restaurant: r,
    date: date || '',
    time: time || '',
    partySize: partySize || 0,
    guestName: session.guestName,
    guestPhone: session.guestPhone,
    specialRequests: session.specialRequests,
    depositRequired: Boolean(r.depositRequired),
    depositAmount: r.depositAmount,
    cancellationPolicy: r.cancellationPolicy,
    providerReady: !isDemoRestaurantMode() && r.reservationMode === 'api',
    mode: isDemoRestaurantMode() ? 'demo' : r.reservationMode === 'none' ? 'phone' : r.reservationMode,
    missingFields: missing,
    notes: [
      isDemoRestaurantMode() ? 'DEMO — 실제 외부 예약이 확정된 것이 아닙니다.' : '예약 정보를 확인해 주세요.',
      r.reservationMode === 'phone' ? '이 식당은 전화 예약이 필요합니다.' : '',
      r.reservationMode === 'deeplink' ? '예약 페이지에서 직접 완료해야 합니다.' : '',
    ].filter(Boolean),
  })

  saveAttempt({
    reservationAttemptId: attemptId,
    status: 'PREPARING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  saveRestaurantSession({
    ...session,
    lastReservationAttemptId: attemptId,
    reservationStatus: 'PREPARING',
    status: 'ready_to_book',
    selectedDate: date,
    selectedTime: time,
    partySize: partySize,
  })
  return preview
}

export function isExplicitRestaurantConfirm(text: string): boolean {
  const t = text.trim()
  return (
    /^(응|네|예)\s*(예약|진행)?\s*(해|해줘|해주세요|하자)?\s*$/i.test(t) ||
    /예약\s*(진행|확정)\s*(해|해줘)/i.test(t) ||
    /^(최종\s*)?예약\s*해\s*줘/i.test(t)
  )
}

export function isWeakRestaurantApproval(text: string): boolean {
  return /^(좋네|괜찮아|괜찮다|그래|좋아|ㅇㅋ|ok)$/i.test(text.trim())
}

export async function confirmRestaurantReservation(
  session: RestaurantSession,
  explicit: boolean,
): Promise<RestaurantReservationResult> {
  if (!explicit) {
    return {
      reservationAttemptId: session.lastReservationAttemptId || '',
      status: 'FAILED',
      message: '예약은 「응 예약해」처럼 명확한 확인 후에만 진행됩니다.',
    }
  }
  const attemptId = session.lastReservationAttemptId || newAttemptId()
  const existing = getReservationAttempt(attemptId)
  if (existing?.status === 'CONFIRMED' && existing.result) return existing.result
  if (existing?.status === 'UNKNOWN' || existing?.status === 'SUBMITTING') {
    const prov = getRestaurantProvider()
    if (prov.getReservation) {
      const st = await prov.getReservation(attemptId)
      saveAttempt({ ...existing, status: st.status, result: st, updatedAt: Date.now() })
      return st
    }
    return {
      reservationAttemptId: attemptId,
      status: 'UNKNOWN',
      message: '예약 상태가 확인되지 않습니다. 새 예약을 만들지 않았습니다.',
    }
  }

  if (!session.selectedRestaurant || !session.selectedDate || !session.selectedTime || !session.partySize) {
    return {
      reservationAttemptId: attemptId,
      status: 'FAILED',
      message: '식당·날짜·시간·인원이 부족합니다.',
    }
  }

  saveAttempt({ reservationAttemptId: attemptId, status: 'SUBMITTING', createdAt: Date.now(), updatedAt: Date.now() })

  const prov = getRestaurantProvider()
  if (!prov.createReservation) {
    return {
      reservationAttemptId: attemptId,
      status: 'FAILED',
      message: '연결된 예약 Provider가 없습니다.',
    }
  }

  try {
    const result = await prov.createReservation({
      restaurantId: session.selectedRestaurant.id,
      reservationAttemptId: attemptId,
      date: session.selectedDate,
      time: session.selectedTime,
      partySize: session.partySize,
      guestName: session.guestName,
      guestPhone: session.guestPhone,
      specialRequests: session.specialRequests,
    })
    saveAttempt({
      reservationAttemptId: attemptId,
      status: result.status,
      result,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    saveRestaurantSession({
      ...session,
      lastReservationAttemptId: attemptId,
      reservationStatus: result.status,
      status: result.status === 'CONFIRMED' ? 'reserved' : session.status,
    })
    return result
  } catch (e) {
    const fail: RestaurantReservationResult = {
      reservationAttemptId: attemptId,
      status: 'UNKNOWN',
      message: `예약 요청 오류 — 상태 불명. (${e instanceof Error ? e.message : 'error'})`,
    }
    saveAttempt({
      reservationAttemptId: attemptId,
      status: 'UNKNOWN',
      result: fail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return fail
  }
}
