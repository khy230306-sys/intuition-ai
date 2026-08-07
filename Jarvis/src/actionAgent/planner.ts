import type { PlannedAction, RiskLevel, TaskSession, TaskType } from './types'

function missingForFlight(task: TaskSession): string[] {
  const s = task.slots
  const miss: string[] = []
  // Date first — matches device UX 「여행 날짜가 언제인가요?」 and protects pending date answers
  if (!s.departureDate) miss.push('departureDate')
  if (!s.destination) miss.push('destination')
  if (!s.origin) miss.push('origin')
  if (!s.tripType || s.tripType === 'unknown') miss.push('tripType')
  if (s.tripType === 'round_trip' && !s.returnDate) miss.push('returnDate')
  if (!s.passengers) miss.push('passengers')
  return miss
}

function missingForHotel(task: TaskSession): string[] {
  const s = task.slots
  const miss: string[] = []
  if (!s.destination && !s.location) miss.push('destination')
  if (!s.checkIn && !s.departureDate) miss.push('checkIn')
  if (!s.checkOut && !s.returnDate) miss.push('checkOut')
  return miss
}

function missingForRestaurant(task: TaskSession): string[] {
  const s = task.slots
  const miss: string[] = []
  // Search needs a place; party size is only required for booking flows
  if (!s.location) miss.push('location')
  return miss
}

export function computeMissingSlots(task: TaskSession): string[] {
  if (task.type === 'travel.flight' || task.type === 'travel.plan') return missingForFlight(task)
  if (task.type === 'travel.hotel') return missingForHotel(task)
  if (task.type === 'restaurant.search') return missingForRestaurant(task)
  return []
}

export function nextQuestion(
  task: TaskSession,
): { ask: string; pending: string; expectedSlot: string } | null {
  const miss = computeMissingSlots(task)
  if (!miss.length) return null
  const first = miss[0]
  const map: Record<string, string> = {
    origin: '출발지는 어디인가요?',
    destination: '어디로 가시나요?',
    departureDate: '좋아요. 여행 날짜가 언제인가요?',
    tripType: '편도인가요, 왕복인가요?',
    returnDate: '돌아오는 날짜는 언제인가요?',
    passengers: '몇 분이 가시나요?',
    checkIn: '체크인 날짜가 언제인가요?',
    checkOut: '체크아웃 날짜가 언제인가요?',
    location: '어느 지역에서 찾으실까요?',
    partySize: '몇 분이세요?',
  }
  const ask = map[first] || `${first} 정보를 알려주세요.`
  return { ask, pending: first, expectedSlot: first }
}

/** Clarify copy when the same expected slot fails to parse. */
export function clarifyQuestion(expectedSlot: string): string {
  const map: Record<string, string> = {
    tripType: '편도인지 왕복인지 알려주세요. 예: "편도", "왕복"',
    departureDate: '여행 출발 날짜를 알려주세요. 예: "8월10일"',
    returnDate: '돌아오는 날짜를 알려주세요. 예: "8월14일"',
    destination: '목적지를 알려주세요. 예: "호치민"',
    origin: '출발지를 알려주세요. 예: "부산", "인천"',
    passengers: '인원 수를 알려주세요. 예: "2명"',
  }
  return map[expectedSlot] || '다시 한 번 알려주세요.'
}

export function planSearchAction(task: TaskSession): PlannedAction {
  const kind =
    task.type === 'travel.hotel'
      ? 'hotel.search'
      : task.type === 'restaurant.search'
        ? 'restaurant.search'
        : 'flight.search'
  return {
    id: `act_${task.id}_${kind}`,
    kind,
    riskLevel: 'read',
    state: 'ready',
    taskSessionId: task.id,
    searchAvailability: 'READY_FOR_SEARCH',
  }
}

export function planCrossAction(
  task: TaskSession,
  kind: 'calendar.create' | 'reminder.create' | 'navigation.open',
  risk: RiskLevel = 'low_write',
): PlannedAction {
  return {
    id: `act_${task.id}_${kind}`,
    kind,
    riskLevel: risk,
    state: 'needs_confirmation',
    taskSessionId: task.id,
    sourceResultId: task.slots.selectedResultId,
  }
}

export function taskLabel(type: TaskType, slots: TaskSession['slots']): string {
  if (type.startsWith('travel')) {
    const dest = slots.destination || '여행'
    return `${dest} 여행 준비`
  }
  if (type === 'restaurant.search') return `${slots.location || ''} 맛집`.trim() || '맛집 찾기'
  return '작업'
}
