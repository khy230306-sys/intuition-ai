/**
 * AIZIO minimal push server (template).
 *
 * Env:
 *   PORT                 default 8787
 *   VAPID_PUBLIC_KEY     required for send
 *   VAPID_PRIVATE_KEY    required for send
 *   VAPID_SUBJECT        mailto: or https:
 *   DATA_DIR             default ./data
 *   AIZIO_CORS_ORIGIN    optional comma list; default *
 *
 * Does NOT create cloud accounts. Operator must supply VAPID keys.
 */
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8787)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
const STORE = join(DATA_DIR, 'store.json')
const CORS = process.env.AIZIO_CORS_ORIGIN || '*'

mkdirSync(DATA_DIR, { recursive: true })

function load() {
  if (!existsSync(STORE)) {
    return { subscriptions: [], reminders: [], deliveries: [] }
  }
  return JSON.parse(readFileSync(STORE, 'utf8'))
}

function save(db) {
  writeFileSync(STORE, JSON.stringify(db, null, 2))
}

const vapidPublic = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function privacyBody(mode, title, body) {
  if (mode === 'hidden') return { title: 'AIZIO', body: 'AIZIO 알림이 있습니다.' }
  if (mode === 'simple') return { title: 'AIZIO', body: '예약된 일정 시간입니다.' }
  return { title: title || 'AIZIO', body: body || `${title} 시간입니다.` }
}

async function sendDue() {
  if (!vapidPublic || !vapidPrivate) return
  const db = load()
  const now = Date.now()
  let changed = false
  for (const rem of db.reminders) {
    if (rem.status !== 'scheduled') continue
    const when = Date.parse(rem.scheduledAt)
    if (!Number.isFinite(when) || when > now) continue
    const dedupe = rem.dedupeKey || `${rem.userId}:${rem.reminderId}:${rem.scheduledAt}`
    if (db.deliveries.some((d) => d.dedupeKey === dedupe && d.status === 'sent')) {
      rem.status = 'sent'
      changed = true
      continue
    }
    const subs = db.subscriptions.filter(
      (s) =>
        s.userId === rem.userId &&
        (!rem.deviceIds?.length || rem.deviceIds.includes(s.deviceId)),
    )
    const shown = privacyBody(rem.privacyMode || 'simple', rem.title, rem.body)
    let anyOk = false
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: shown.title,
            body: shown.body,
            kind: 'reminder',
            view: 'chat',
            reminderId: rem.reminderId,
            tag: `reminder-${rem.reminderId}`,
            privacyMode: rem.privacyMode || 'simple',
            data: rem.data || { type: 'reminder', route: '/?view=chat', entityId: rem.reminderId },
          }),
        )
        anyOk = true
        db.deliveries.push({
          dedupeKey: dedupe,
          reminderId: rem.reminderId,
          endpoint: sub.endpoint,
          status: 'sent',
          at: new Date().toISOString(),
        })
      } catch (err) {
        const code = err?.statusCode || 0
        db.deliveries.push({
          dedupeKey: dedupe,
          reminderId: rem.reminderId,
          endpoint: sub.endpoint,
          status: 'failed',
          at: new Date().toISOString(),
          error: String(err?.message || err).slice(0, 200),
        })
        if (code === 404 || code === 410) {
          db.subscriptions = db.subscriptions.filter((s) => s.endpoint !== sub.endpoint)
        }
      }
      changed = true
    }
    rem.status = anyOk ? 'sent' : 'failed'
    rem.lastError = anyOk ? undefined : 'send_failed'
    changed = true
  }
  if (changed) save(db)
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/health') {
      return json(res, 200, {
        ok: true,
        vapidConfigured: Boolean(vapidPublic && vapidPrivate),
        service: 'aizio-push-server',
      })
    }

    if (req.method === 'POST' && path === '/v1/push/subscribe') {
      const body = await readBody(req)
      if (!body.userId || !body.deviceId || !body.subscription?.endpoint) {
        return json(res, 400, { ok: false, message: 'missing fields' })
      }
      const db = load()
      db.subscriptions = db.subscriptions.filter(
        (s) => !(s.userId === body.userId && s.deviceId === body.deviceId),
      )
      db.subscriptions.push({
        userId: body.userId,
        deviceId: body.deviceId,
        endpoint: body.subscription.endpoint,
        keys: body.subscription.keys,
        timezone: body.timezone || 'UTC',
        locale: body.locale,
        appVersion: body.appVersion,
        channels: body.channels || ['smart_reminder'],
        updatedAt: new Date().toISOString(),
      })
      save(db)
      return json(res, 200, { ok: true, subscriptionId: `${body.userId}:${body.deviceId}`, message: 'subscribed' })
    }

    if (req.method === 'POST' && path === '/v1/push/unsubscribe') {
      const body = await readBody(req)
      const db = load()
      db.subscriptions = db.subscriptions.filter(
        (s) =>
          !(
            s.userId === body.userId &&
            s.deviceId === body.deviceId &&
            (!body.endpoint || s.endpoint === body.endpoint)
          ),
      )
      save(db)
      return json(res, 200, { ok: true, message: 'unsubscribed' })
    }

    if (req.method === 'POST' && (path === '/v1/reminders/schedule' || path === '/v1/reminders/update')) {
      const body = await readBody(req)
      if (!body.reminderId || !body.userId || !body.scheduledAt) {
        return json(res, 400, { ok: false, message: 'missing fields' })
      }
      const db = load()
      const id = body.serverScheduleId || `sch_${body.userId}_${body.reminderId}`
      db.reminders = db.reminders.filter((r) => r.id !== id && r.reminderId !== body.reminderId)
      db.reminders.push({
        id,
        reminderId: body.reminderId,
        userId: body.userId,
        deviceIds: body.deviceIds || [],
        scheduledAt: body.scheduledAt,
        timezone: body.timezone || 'UTC',
        title: body.title || 'AIZIO',
        body: body.body || '예약된 일정 시간입니다.',
        privacyMode: body.privacyMode || 'simple',
        data: body.data || { type: 'reminder', route: '/?view=chat', entityId: body.reminderId },
        dedupeKey: `${body.userId}:${body.reminderId}:${body.scheduledAt}`,
        status: 'scheduled',
        updatedAt: new Date().toISOString(),
      })
      save(db)
      return json(res, 200, { ok: true, serverScheduleId: id, message: 'scheduled' })
    }

    if (req.method === 'POST' && path === '/v1/reminders/cancel') {
      const body = await readBody(req)
      const db = load()
      for (const r of db.reminders) {
        if (r.reminderId === body.reminderId && r.userId === body.userId) {
          r.status = 'cancelled'
        }
      }
      save(db)
      return json(res, 200, { ok: true, message: 'cancelled' })
    }

    if (req.method === 'GET' && path.startsWith('/v1/reminders/status/')) {
      const reminderId = decodeURIComponent(path.slice('/v1/reminders/status/'.length))
      const db = load()
      const rem = db.reminders.find((r) => r.reminderId === reminderId)
      if (!rem) return json(res, 200, { ok: true, reminderId, status: 'unknown' })
      return json(res, 200, {
        ok: true,
        reminderId,
        status: rem.status,
        serverScheduleId: rem.id,
        scheduledAt: rem.scheduledAt,
        lastError: rem.lastError,
      })
    }

    return json(res, 404, { ok: false, message: 'not found' })
  } catch (err) {
    return json(res, 500, { ok: false, message: String(err?.message || err) })
  }
})

server.listen(PORT, () => {
  console.log(`AIZIO push-server on http://127.0.0.1:${PORT}`)
  console.log(`VAPID: ${vapidPublic && vapidPrivate ? 'configured' : 'MISSING — send disabled'}`)
  setInterval(() => {
    void sendDue()
  }, 15_000)
})
