/* global self, clients */
/** Workbox importScripts — Web Push for chat + smart reminders. */

function sanitizeRoute(route) {
  const r = String(route || '/').trim()
  if (!r.startsWith('/') || r.startsWith('//') || r.includes('..') || /[:\\]/.test(r)) {
    return '/?view=chat'
  }
  return r.slice(0, 120)
}

function parsePush(raw) {
  const fallback = { title: 'AIZIO', body: '새 알림이 있습니다.', data: { view: 'chat', kind: 'unknown' }, tag: 'aizio-unknown' }
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return { ...fallback, body: String(parsed).slice(0, 160) }
    if (!parsed || typeof parsed !== 'object') return fallback
    const title = String(parsed.title || 'AIZIO').slice(0, 64)
    const body = String(parsed.body || fallback.body).slice(0, 160)
    const kind = String(parsed.kind || '')
    if (kind === 'reminder' || parsed.view === 'life' || (parsed.data && parsed.data.type === 'reminder')) {
      const reminderId = String(parsed.reminderId || (parsed.data && parsed.data.entityId) || '')
      const tag = String(parsed.tag || `reminder-${reminderId || 'aizio'}`).slice(0, 64)
      const view = parsed.view === 'life' ? 'life' : 'chat'
      return {
        title,
        body,
        tag,
        data: {
          view,
          kind: 'reminder',
          reminderId,
          route: sanitizeRoute((parsed.data && parsed.data.route) || parsed.route || `/?view=${view}`),
        },
      }
    }
    if (kind === 'friends' || parsed.view === 'friends') {
      return {
        title,
        body,
        tag: String(parsed.tag || 'jarvis-friends'),
        data: { view: 'friends', kind: 'friends' },
      }
    }
    return {
      title,
      body,
      tag: String(parsed.tag || 'jarvis-chat'),
      data: { view: 'family', kind: 'family' },
    }
  } catch {
    return { ...fallback, body: String(raw).slice(0, 160) }
  }
}

self.addEventListener('push', (event) => {
  let raw = ''
  try {
    raw = event.data ? event.data.text() : ''
  } catch {
    raw = ''
  }
  const parsed = parsePush(raw)
  event.waitUntil(
    self.registration.showNotification(parsed.title, {
      body: parsed.body,
      tag: parsed.tag,
      renotify: true,
      data: parsed.data,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification?.data || {}
  const target = new URL('./', self.location.href)
  if (d.kind === 'reminder') {
    target.searchParams.set('view', d.view === 'life' ? 'life' : 'chat')
    if (d.reminderId) target.searchParams.set('reminderId', String(d.reminderId))
  } else if (d.view === 'friends' || d.kind === 'friends') {
    target.searchParams.set('view', 'friends')
  } else if (d.view === 'family' || d.kind === 'family') {
    target.searchParams.set('view', 'family')
  } else {
    target.searchParams.set('view', 'chat')
  }
  // Block navigating to arbitrary absolute URLs from payload
  if (target.origin !== self.location.origin) {
    target.href = new URL('./?view=chat', self.location.href).href
  }
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(target.href)
            } catch {
              /* ignore */
            }
          }
          return
        }
      }
      await clients.openWindow(target.href)
    })(),
  )
})

self.addEventListener('notificationclose', () => {
  /* minimal — no PII logging */
})
