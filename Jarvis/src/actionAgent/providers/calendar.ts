import { addReminder } from '../../storage'
import type { ActionResult } from '../types'
import type { CalendarProvider } from './types'

export const defaultCalendarProvider: CalendarProvider = {
  id: 'aizio-calendar-local',
  async createFromSelection(req): Promise<ActionResult> {
    if (!req.allowWrite) {
      return {
        ok: false,
        state: 'needs_confirmation',
        message: '일정에 넣으려면 확인이 필요합니다. 「일정에 넣어줘」라고 다시 말씀해 주세요.',
        errorCode: 'NEEDS_CONFIRM',
      }
    }
    const title =
      req.slots.calendarTitle ||
      req.result?.title ||
      `${req.slots.destination || req.slots.location || '여행'} 일정`
    const when =
      req.slots.departureDate?.resolvedDate ||
      req.slots.checkIn?.resolvedDate ||
      req.slots.date?.resolvedDate ||
      ''
    const item = addReminder(when ? `${title} (${when})` : title)
    return {
      ok: true,
      state: 'success',
      message: `일정/할 일로 저장했어요: ${item.text}`,
      data: { id: item.id },
    }
  },
}

let injected: CalendarProvider | null = null
export function getCalendarProvider(): CalendarProvider {
  return injected || defaultCalendarProvider
}
export function setCalendarProviderForTests(p: CalendarProvider | null): void {
  injected = p
}
