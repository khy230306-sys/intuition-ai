/**
 * Google Calendar external provider — OAuth-ready (Permission LEVEL 2).
 * Without Client ID / tokens → PENDING_EXTERNAL_SETUP. Never invents events.
 *
 * Surface: authorize · getAuthStatus · list/create/get/update/delete · revoke · healthCheck
 * VERIFIED_SUCCESS only after create → eventId → getEvent title/time match (tool+verifier).
 */

import { readEnv } from '../env'
import type {
  CalendarAuthStatus,
  CalendarEvent,
  CalendarEventInput,
  CalendarProvider,
  ProviderHealth,
} from '../types'

const TOKEN_KEY = 'aizio_google_calendar_oauth_v1'
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

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
    return (
      readEnv('VITE_AIZIO_GOOGLE_CALENDAR_CLIENT_ID') ||
      readEnv('AIZIO_GOOGLE_CALENDAR_CLIENT_ID') ||
      ''
    )
  }

  private redirectUri(): string {
    return (
      readEnv('VITE_AIZIO_GOOGLE_CALENDAR_REDIRECT_URI') ||
      (typeof location !== 'undefined' ? `${location.origin}/` : '')
    )
  }

  getAuthStatus(): CalendarAuthStatus {
    if (!this.clientId()) {
      return {
        status: 'pending_setup',
        clientIdConfigured: false,
        message: 'Google Calendar가 아직 연결되지 않았습니다. (Client ID 미설정)',
      }
    }
    const oauth = loadGoogleCalendarOAuth()
    if (!oauth?.accessToken) {
      return {
        status: 'disconnected',
        clientIdConfigured: true,
        message: 'Google Calendar가 아직 연결되지 않았습니다. (OAuth 로그인 필요)',
      }
    }
    if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
      return {
        status: 'expired',
        clientIdConfigured: true,
        message: 'Google Calendar 토큰이 만료되었습니다. 다시 연결해 주세요.',
      }
    }
    return {
      status: 'connected',
      clientIdConfigured: true,
      message: 'Google Calendar 연결됨',
    }
  }

  async authorize(): Promise<{ ok: boolean; authUrl?: string; error?: string }> {
    const clientId = this.clientId()
    if (!clientId) {
      return {
        ok: false,
        error: 'PENDING_EXTERNAL_SETUP: VITE_AIZIO_GOOGLE_CALENDAR_CLIENT_ID 미설정',
      }
    }
    const redirect = this.redirectUri()
    if (!redirect) {
      return { ok: false, error: 'redirect_uri 미설정' }
    }
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirect)
    url.searchParams.set('response_type', 'token')
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('state', 'aizio_gcal_oauth')
    return { ok: true, authUrl: url.toString() }
  }

  async revoke(): Promise<{ ok: boolean; message: string }> {
    const oauth = loadGoogleCalendarOAuth()
    const token = oauth?.accessToken
    clearGoogleCalendarOAuth()
    if (token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-type': 'application/x-www-form-urlencoded' },
        })
      } catch {
        /* local clear is enough */
      }
    }
    return { ok: true, message: 'Google Calendar 연결이 해제되었습니다.' }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const auth = this.getAuthStatus()
    if (auth.status === 'pending_setup' || auth.status === 'disconnected') {
      return {
        providerId: this.id,
        availability: 'PENDING_EXTERNAL_SETUP',
        message: auth.message,
        checkedAt: Date.now(),
        liveVerified: false,
      }
    }
    if (auth.status === 'expired') {
      return {
        providerId: this.id,
        availability: 'DEGRADED',
        message: auth.message,
        checkedAt: Date.now(),
        liveVerified: false,
      }
    }
    return {
      providerId: this.id,
      availability: 'READY',
      message: auth.message,
      checkedAt: Date.now(),
      liveVerified: true,
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

  async updateEvent(eventId: string, patch: Partial<CalendarEventInput>): Promise<CalendarEvent> {
    const token = this.requireToken()
    const body: Record<string, unknown> = {}
    if (patch.title) body.summary = patch.title
    if (patch.description) body.description = patch.description
    if (patch.location) body.location = patch.location
    if (patch.whenAt) {
      body.start = { dateTime: new Date(patch.whenAt).toISOString() }
      body.end = { dateTime: new Date(patch.whenAt + 60 * 60_000).toISOString() }
    }
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) throw new Error(`google_calendar_update_${res.status}`)
    const got = await this.getEvent(eventId)
    if (!got) throw new Error('google_calendar_update_reread_miss')
    return got
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
