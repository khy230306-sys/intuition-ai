/**
 * TEST-ONLY external calendar. Production path must reject isTestDouble.
 */

import type {
  CalendarAuthStatus,
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
  private connected = true

  getAuthStatus(): CalendarAuthStatus {
    return {
      status: this.connected ? 'connected' : 'disconnected',
      clientIdConfigured: true,
      message: this.connected ? 'test connected' : 'Google Calendar가 아직 연결되지 않았습니다.',
    }
  }

  async authorize(): Promise<{ ok: boolean; authUrl?: string; error?: string }> {
    this.connected = true
    return { ok: true, authUrl: 'https://example.test/oauth' }
  }

  async revoke(): Promise<{ ok: boolean; message: string }> {
    this.connected = false
    this.events.clear()
    return { ok: true, message: 'revoked' }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      availability: this.connected ? 'READY' : 'PENDING_EXTERNAL_SETUP',
      message: 'TEST DOUBLE — production 금지',
      checkedAt: Date.now(),
      liveVerified: this.connected,
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

  async updateEvent(eventId: string, patch: Partial<CalendarEventInput>): Promise<CalendarEvent> {
    const cur = this.events.get(eventId)
    if (!cur) throw new Error('missing')
    const next = {
      ...cur,
      title: patch.title ?? cur.title,
      whenAt: patch.whenAt ?? cur.whenAt,
      whenLabel: patch.whenLabel ?? cur.whenLabel,
      location: patch.location ?? cur.location,
    }
    this.events.set(eventId, next)
    return next
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
