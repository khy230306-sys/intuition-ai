/**
 * Travel → Calendar bridge (interface-focused, light automation).
 */

import { addFamilyHelperSchedule } from '../family-helper/store'
import { loadTravelConfig } from './config'
import type { Trip } from './schema'

export type CalendarBridgeResult = {
  ok: boolean
  eventIds: string[]
  message: string
}

export function addTripToCalendar(trip: Trip): CalendarBridgeResult {
  const ids: string[] = []
  try {
    if (trip.departureDate) {
      const e = addFamilyHelperSchedule({
        title: `[여행] ${trip.title} 출발`,
        date: trip.departureDate,
        time: trip.selectedFlight ? new Date(trip.selectedFlight.departAt).toTimeString().slice(0, 5) : undefined,
        note: trip.selectedFlight
          ? `${trip.selectedFlight.airline} ${trip.selectedFlight.flightNumber}`
          : trip.destinationLabel,
        category: 'general',
      })
      ids.push(e.id)
    }
    if (trip.returnDate && trip.returnDate !== trip.departureDate) {
      const e = addFamilyHelperSchedule({
        title: `[여행] ${trip.title} 귀국`,
        date: trip.returnDate,
        category: 'general',
        note: trip.destinationLabel,
      })
      ids.push(e.id)
    }
    if (trip.checkIn && trip.selectedHotel) {
      const e = addFamilyHelperSchedule({
        title: `[호텔] ${trip.selectedHotel.name} 체크인`,
        date: trip.checkIn,
        category: 'general',
        note: trip.selectedHotel.locationLabel,
      })
      ids.push(e.id)
    }
    if (trip.checkOut && trip.selectedHotel) {
      const e = addFamilyHelperSchedule({
        title: `[호텔] ${trip.selectedHotel.name} 체크아웃`,
        date: trip.checkOut,
        category: 'general',
      })
      ids.push(e.id)
    }
    return {
      ok: true,
      eventIds: ids,
      message: `일정 ${ids.length}건을 추가했어요.`,
    }
  } catch (e) {
    return {
      ok: false,
      eventIds: ids,
      message: `일정 추가 중 문제가 있었어요. (${e instanceof Error ? e.message : 'error'})`,
    }
  }
}

export function maybeAutoAddCalendar(trip: Trip): CalendarBridgeResult | null {
  if (!loadTravelConfig().autoAddCalendar) return null
  return addTripToCalendar(trip)
}
