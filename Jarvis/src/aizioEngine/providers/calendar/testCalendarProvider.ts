/**
 * TEST-ONLY external calendar. Production path must reject isTestDouble.
 */

import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarProvider,
  ProviderHealth,
} from '../types'

export class TestCalendarProvider implements CalendarProvider {
  readonly id = 'test_external_calendar'
  readonly label = 'Test External Calendar'
  readonly kind = 'external' as const
  readonly isTestDouble = true

  private events = new Map<string, CalendarEvent>()

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'TEST DOUBLE — production 금지',
      checkedAt: Date.now(),
    }
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    const eventId = `test_evt_${Date.now().toString(36)}`
    const ev: CalendarEvent = {
      provider: this.id,
      eventId,
      title: input.title,
      whenAt: input.whenAt,
      whenLabel: input.whenLabel,
      location: input.location,
      calendarKind: 'external',
    }
    this.events.set(eventId, ev)
    return ev
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    return this.events.get(eventId) || null
  }

  async listEvents(): Promise<CalendarEvent[]> {
    return [...this.events.values()]
  }

  async deleteEvent(eventId: string): Promise<{ ok: boolean; message: string }> {
    const ok = this.events.delete(eventId)
    return { ok, message: ok ? 'deleted' : 'missing' }
  }
}

export const testCalendarProvider = new TestCalendarProvider()
