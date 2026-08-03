import { sanitizePushRoute, type ChatPushPayload, type ReminderPushPayload } from './reminderPushTypes'

export type ParsedPush =
  | { kind: 'reminder'; payload: ReminderPushPayload; tag: string }
  | { kind: 'chat'; payload: ChatPushPayload; tag: string }
  | { kind: 'unknown'; title: string; body: string; tag: string }

export function parsePushEventData(raw: string | null | undefined): ParsedPush {
  const fallbackBody = '새 알림이 있습니다.'
  if (!raw) {
    return { kind: 'unknown', title: 'AIZIO', body: fallbackBody, tag: 'aizio-unknown' }
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | string
    if (typeof parsed === 'string') {
      return { kind: 'unknown', title: 'AIZIO', body: parsed.slice(0, 160), tag: 'aizio-text' }
    }
    if (!parsed || typeof parsed !== 'object') {
      return { kind: 'unknown', title: 'AIZIO', body: fallbackBody, tag: 'aizio-unknown' }
    }
    const title = String(parsed.title || 'AIZIO').slice(0, 64)
    const body = String(parsed.body || fallbackBody).slice(0, 160)
    const kind = String(parsed.kind || '')
    if (kind === 'reminder' || parsed.view === 'life' || parsed.data && (parsed.data as { type?: string }).type === 'reminder') {
      const reminderId = String(parsed.reminderId || (parsed.data as { entityId?: string })?.entityId || '')
      const tag = String(parsed.tag || `reminder-${reminderId || 'aizio'}`).slice(0, 64)
      const route = sanitizePushRoute(
        (parsed as { route?: string }).route || (parsed.data as { route?: string })?.route || '/?view=chat',
      )
      return {
        kind: 'reminder',
        tag,
        payload: {
          title,
          body,
          kind: 'reminder',
          view: parsed.view === 'life' ? 'life' : 'chat',
          reminderId: reminderId || undefined,
          tag,
          route,
        },
      }
    }
    if (kind === 'friends' || parsed.view === 'friends') {
      const tag = String(parsed.tag || 'jarvis-friends').slice(0, 64)
      return {
        kind: 'chat',
        tag,
        payload: { title, body, kind: 'friends', view: 'friends', tag },
      }
    }
    if (kind === 'family' || parsed.view === 'family') {
      const tag = String(parsed.tag || 'jarvis-chat').slice(0, 64)
      return {
        kind: 'chat',
        tag,
        payload: { title, body, kind: 'family', view: 'family', tag },
      }
    }
    return { kind: 'unknown', title, body, tag: String(parsed.tag || 'aizio-unknown').slice(0, 64) }
  } catch {
    return { kind: 'unknown', title: 'AIZIO', body: String(raw).slice(0, 160), tag: 'aizio-raw' }
  }
}

export function notificationClickTarget(parsed: ParsedPush, origin: string): string {
  const base = origin.endsWith('/') ? origin : `${origin}/`
  if (parsed.kind === 'reminder') {
    const view = parsed.payload.view === 'life' ? 'life' : 'chat'
    const u = new URL(base)
    u.searchParams.set('view', view)
    if (parsed.payload.reminderId) u.searchParams.set('reminderId', parsed.payload.reminderId)
    return u.href
  }
  if (parsed.kind === 'chat') {
    const u = new URL(base)
    u.searchParams.set('view', parsed.payload.view)
    return u.href
  }
  const u = new URL(base)
  u.searchParams.set('view', 'chat')
  return u.href
}

/** Block javascript: / external absolute URLs */
export function isSafeAppNavigateUrl(href: string, allowedOrigin: string): boolean {
  try {
    const u = new URL(href)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    return u.origin === new URL(allowedOrigin).origin
  } catch {
    return false
  }
}
