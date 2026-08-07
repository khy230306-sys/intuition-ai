/**
 * Google Calendar external provider scaffold (Permission LEVEL 2).
 * Without OAuth tokens → PENDING_EXTERNAL_SETUP. Never invents events.
 */

import { readEnv } from '../env'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarProvider,
  ProviderHealth,
} from '../types'

const TOKEN_KEY = 'aizio_google_calendar_oauth_v1'

export type GoogleCalendarOAuthState = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  connectedAt?: number
}

export function loadGoogleCalendarOAuth(): GoogleCalendarOAuthState | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GoogleCalendarOAuthState
  } catch {
    return null
  }
}

export function saveGoogleCalendarOAuth(state: GoogleCalendarOAuthState): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(state))
}

export function clearGoogleCalendarOAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly id = 'google_calendar'
  readonly label = 'Google Calendar'
  readonly kind = 'external' as const

  private clientId(): string {
    return readEnv('VITE_AIZIO_GOOGLE_CALENDAR_CLIENT_ID') || readEnv('AIZIO_GOOGLE_CALENDAR_CLIENT_ID') || ''
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.clientId()) {
      return {
        providerId: this.id,
        availability: 'PENDING_EXTERNAL_SETUP',
        message: 'VITE_AIZIO_GOOGLE_CALENDAR_CLIENT_ID 미설정',
        checkedAt: Date.now(),
      }
    }
    const oauth = loadGoogleCalendarOAuth()
    if (!oauth?.accessToken) {
      return {
        providerId: this.id,
        availability: 'PENDING_EXTERNAL_SETUP',
        message: 'Google OAuth 로그인 필요',
        checkedAt: Date.now(),
      }
    }
    if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
      return {
        providerId: this.id,
        availability: 'DEGRADED',
        message: '액세스 토큰 만료 — 재로그인 필요',
        checkedAt: Date.now(),
      }
    }
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'Google Calendar 연결됨',
      checkedAt: Date.now(),
    }
  }

  private requireToken(): string {
    const oauth = loadGoogleCalendarOAuth()
    if (!oauth?.accessToken) {
      const err = new Error('PENDING_EXTERNAL_SETUP')
      ;(err as Error & { code?: string }).code = 'PENDING_EXTERNAL_SETUP'
      throw err
    }
    return oauth.accessToken
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    const token = this.requireToken()
    const start = new Date(input.whenAt).toISOString()
    const end = new Date(input.whenAt + 60 * 60_000).toISOString()
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: input.title,
          description: input.description || 'AIZIO',
          location: input.location,
          start: { dateTime: start },
          end: { dateTime: end },
        }),
      },
    )
    if (!res.ok) throw new Error(`google_calendar_create_${res.status}`)
    const data = (await res.json()) as { id?: string; summary?: string }
    if (!data.id) throw new Error('google_calendar_missing_id')
    return {
      provider: this.id,
      eventId: data.id,
      title: data.summary || input.title,
      whenAt: input.whenAt,
      whenLabel: input.whenLabel,
      location: input.location,
      calendarKind: 'external',
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    const token = this.requireToken()
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`google_calendar_get_${res.status}`)
    const data = (await res.json()) as {
      id?: string
      summary?: string
      start?: { dateTime?: string }
      location?: string
    }
    if (!data.id) return null
    const whenAt = data.start?.dateTime ? Date.parse(data.start.dateTime) : 0
    return {
      provider: this.id,
      eventId: data.id,
      title: data.summary || '',
      whenAt,
      whenLabel: data.start?.dateTime || '',
      location: data.location,
      calendarKind: 'external',
    }
  }

  async listEvents(fromMs?: number, toMs?: number): Promise<CalendarEvent[]> {
    const token = this.requireToken()
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    if (fromMs) url.searchParams.set('timeMin', new Date(fromMs).toISOString())
    if (toMs) url.searchParams.set('timeMax', new Date(toMs).toISOString())
    url.searchParams.set('singleEvents', 'true')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`google_calendar_list_${res.status}`)
    const data = (await res.json()) as {
      items?: Array<{ id?: string; summary?: string; start?: { dateTime?: string }; location?: string }>
    }
    return (data.items || [])
      .filter((i) => i.id)
      .map((i) => ({
        provider: this.id,
        eventId: i.id!,
        title: i.summary || '',
        whenAt: i.start?.dateTime ? Date.parse(i.start.dateTime) : 0,
        whenLabel: i.start?.dateTime || '',
        location: i.location,
        calendarKind: 'external' as const,
      }))
  }

  async deleteEvent(eventId: string): Promise<{ ok: boolean; message: string }> {
    const token = this.requireToken()
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok && res.status !== 204) {
      return { ok: false, message: `삭제 실패 HTTP ${res.status}` }
    }
    return { ok: true, message: '삭제됨' }
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider()
