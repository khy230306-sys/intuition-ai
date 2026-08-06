import { addFamilyHelperSchedule } from '../family-helper/store'
import type { RestaurantSession } from './schema'

export function addRestaurantToCalendar(session: RestaurantSession): { ok: boolean; message: string } {
  const r = session.selectedRestaurant
  if (!r) return { ok: false, message: '선택된 식당이 없습니다.' }
  const date = session.selectedDate || session.searchInput?.date
  if (!date) return { ok: false, message: '예약 날짜가 없습니다.' }
  try {
    addFamilyHelperSchedule({
      title: `[식당] ${r.name}`,
      date,
      time: session.selectedTime || session.searchInput?.time,
      note: [
        r.address || r.locationLabel,
        session.partySize ? `${session.partySize}명` : '',
        r.phone || '',
        session.reservationStatus === 'CONFIRMED' ? '예약확인' : '예정',
      ]
        .filter(Boolean)
        .join(' · '),
      category: 'general',
      notifyMinutesBefore: 60,
    })
    return {
      ok: true,
      message: `음식점 예약을 일정에 추가했어요. (기본 알림: 1시간 전 제안)`,
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '일정 추가 실패' }
  }
}
