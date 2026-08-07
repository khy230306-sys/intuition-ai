import { getCalendarProvider } from './providers/calendar'
import { getFlightProvider } from './providers/flight'
import { getHotelProvider } from './providers/hotel'
import { getReminderProvider } from './providers/reminder'
import { getRestaurantProvider } from './providers/restaurant'
import type { ActionResult, PlannedAction, TaskSession } from './types'

export type ExecuteOpts = {
  allowFixtures?: boolean
  allowWrite?: boolean
}

export async function executePlannedAction(
  task: TaskSession,
  action: PlannedAction,
  opts: ExecuteOpts = {},
): Promise<ActionResult> {
  if (action.kind === 'flight.search') {
    const res = await getFlightProvider().search({ slots: task.slots, allowFixtures: opts.allowFixtures })
    return {
      ok: res.availability === 'SEARCH_AVAILABLE',
      state: res.availability === 'NEEDS_PROVIDER' ? 'needs_provider' : res.availability === 'SEARCH_AVAILABLE' ? 'success' : 'blocked',
      message: res.message,
      searchAvailability: res.availability,
      results: res.results,
      errorCode: res.errorCode,
    }
  }
  if (action.kind === 'hotel.search') {
    const res = await getHotelProvider().search({ slots: task.slots, allowFixtures: opts.allowFixtures })
    return {
      ok: res.availability === 'SEARCH_AVAILABLE',
      state: res.availability === 'NEEDS_PROVIDER' ? 'needs_provider' : res.availability === 'SEARCH_AVAILABLE' ? 'success' : 'blocked',
      message: res.message,
      searchAvailability: res.availability,
      results: res.results,
      errorCode: res.errorCode,
    }
  }
  if (action.kind === 'restaurant.search') {
    const res = await getRestaurantProvider().search({ slots: task.slots, allowFixtures: opts.allowFixtures })
    return {
      ok: res.availability === 'SEARCH_AVAILABLE',
      state: res.availability === 'NEEDS_PROVIDER' ? 'needs_provider' : res.availability === 'SEARCH_AVAILABLE' ? 'success' : 'blocked',
      message: res.message,
      searchAvailability: res.availability,
      results: res.results,
      errorCode: res.errorCode,
    }
  }
  if (action.kind === 'calendar.create') {
    const selected = task.results.find((r) => r.id === task.slots.selectedResultId)
    return getCalendarProvider().createFromSelection({
      slots: task.slots,
      result: selected,
      allowWrite: opts.allowWrite !== false,
    })
  }
  if (action.kind === 'reminder.create') {
    const selected = task.results.find((r) => r.id === task.slots.selectedResultId)
    return getReminderProvider().createFromSelection({
      slots: task.slots,
      result: selected,
      offsetMinutes: task.slots.reminderOffsetMinutes,
      allowWrite: opts.allowWrite !== false,
    })
  }
  return {
    ok: false,
    state: 'failed',
    message: `지원하지 않는 액션입니다: ${action.kind}`,
    errorCode: 'UNKNOWN_ACTION',
  }
}

export function formatResultsList(results: NonNullable<ActionResult['results']>): string {
  if (!results.length) return ''
  return results.map((r) => `${r.rank}. ${r.title}${r.subtitle ? ` — ${r.subtitle}` : ''}`).join('\n')
}
