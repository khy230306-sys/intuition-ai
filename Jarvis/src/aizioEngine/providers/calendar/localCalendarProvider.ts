/**
 * AIZIO Local Calendar — localStorage reminders (Permission LEVEL 1).
 * Never claim this is Google Calendar / external sync.
 */

import { addReminder, loadReminders } from '../../../storage'
import { ensureNotificationPermission, scheduleAlarm } from '../../../notify'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarProvider,
  ProviderHealth,
} from '../types'

export class LocalCalendarProvider implements CalendarProvider {
  readonly id = 'aizio_local_calendar'
  readonly label = 'AIZIO 내부 일정'
  readonly kind = 'local' as const

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'localStorage 기반 AIZIO 내부 일정',
      checkedAt: Date.now(),
    }
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    const item = addReminder(input.title, input.whenLabel, input.whenAt)
    try {
      await ensureNotificationPermission()
      scheduleAlarm(input.title, input.whenLabel, input.whenAt)
    } catch {
      /* still stored locally */
    }
    return {
      provider: this.id,
      eventId: item.id,
      title: input.title,
      whenAt: input.whenAt,
      whenLabel: input.whenLabel,
      location: input.location,
      calendarKind: 'local',
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    const hit = loadReminders().find((r) => r.id === eventId)
    if (!hit) return null
    return {
      provider: this.id,
      eventId: hit.id,
      title: hit.text,
      whenAt: hit.whenAt || 0,
      whenLabel: hit.when || '',
      calendarKind: 'local',
    }
  }

  async listEvents(): Promise<CalendarEvent[]> {
    return loadReminders()
      .filter((r) => !r.done)
      .map((r) => ({
        provider: this.id,
        eventId: r.id,
        title: r.text,
        whenAt: r.whenAt || 0,
        whenLabel: r.when || '',
        calendarKind: 'local' as const,
      }))
  }
}

export const localCalendarProvider = new LocalCalendarProvider()
