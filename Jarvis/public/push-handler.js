/* global self, clients */
/** Imported by Workbox SW — Web Push while AIZIO is backgrounded/closed (iOS Home Screen PWA). */

self.addEventListener('push', (event) => {
  let title = 'AIZIO'
  let body = '새 알림이 있습니다.'
  let data = { view: 'family', kind: 'family' }
  let tag = 'jarvis-chat'
  try {
    const raw = event.data ? event.data.text() : ''
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'string') {
        body = parsed
      } else if (parsed && typeof parsed === 'object') {
        title = String(parsed.title || title).slice(0, 64)
        body = String(parsed.body || body).slice(0, 160)
        if (parsed.kind === 'reminder' || parsed.view === 'life' || parsed.view === 'chat') {
          data = {
            view: parsed.view === 'life' ? 'life' : 'chat',
            kind: 'reminder',
            reminderId: parsed.reminderId || '',
          }
          tag = String(parsed.tag || `reminder-${parsed.reminderId || 'aizio'}`)
        } else if (parsed.kind === 'friends' || parsed.view === 'friends') {
          data = { view: 'friends', kind: 'friends' }
        } else if (parsed.kind === 'family' || parsed.view === 'family') {
          data = { view: 'family', kind: 'family' }
        }
        if (parsed.tag) tag = String(parsed.tag)
      }
    }
  } catch {
    try {
      body = event.data ? event.data.text() : body
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      data,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification?.data || {}
  let view = 'family'
  if (d.kind === 'reminder') view = d.view === 'life' ? 'life' : 'chat'
  else if (d.view === 'friends' || d.kind === 'friends') view = 'friends'
  else if (d.view === 'chat') view = 'chat'
  else if (d.view === 'life') view = 'life'
  const target = new URL('./', self.location.href)
  target.searchParams.set('view', view)
  if (d.reminderId) target.searchParams.set('reminderId', String(d.reminderId))
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
