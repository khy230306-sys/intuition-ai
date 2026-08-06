/**
 * AIZIO push-server — HTTPS-ready Node service for reminder + chat Web Push.
 * Secrets only via env. Never log endpoints/keys/PII.
 */
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import webpush from 'web-push'
import { isHttpsEndpoint, maskId, privacyBody } from './lib.mjs'
import { createSecretsStore } from './secretsStore.mjs'
import { proxyChat, testProviderConnection } from './providerTest.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Load local .env without dependency (never commit .env). */
function loadDotEnv() {
  try {
    const p = join(__dirname, '.env')
    if (!existsSync(p)) return
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (process.env[k] == null || process.env[k] === '') process.env[k] = v
    }
  } catch {
    /* ignore */
  }
}
loadDotEnv()

const STARTED = Date.now()
const VERSION = '1.2.0'
const PORT = Number(process.env.PORT || 8787)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
const STORE = join(DATA_DIR, 'store.json')
const NODE_ENV = process.env.NODE_ENV || 'development'
const CRON_SECRET = (process.env.CRON_SECRET || '').trim()
const INSTALL_TOKEN = (process.env.INSTALL_TOKEN || '').trim()
const RATE_LIMIT_PER_MIN = Math.max(30, Number(process.env.RATE_LIMIT_PER_MIN || 120))

const DEFAULT_ORIGINS = [
  'https://jarvis-app.shipstatic.com',
  'https://harmonic-rift-5oo4f3w.shipstatic.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

function parseOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.AIZIO_CORS_ORIGIN || ''
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return list.length ? list : DEFAULT_ORIGINS
}

const ALLOWED_ORIGINS = parseOrigins()

const vapidPublic = (process.env.VAPID_PUBLIC_KEY || '').trim()
const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').trim()
const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:aizio@example.com').trim()
const vapidReady = Boolean(vapidPublic && vapidPrivate)
if (vapidReady) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

mkdirSync(DATA_DIR, { recursive: true })

/** Local-dev secret store (JSON under DATA_DIR — not OS Credential Manager). */
const secrets = createSecretsStore(DATA_DIR)

/** @typedef {{ subscriptions: any[], reminders: any[], deliveries: any[], meta?: object }} Store */

function emptyStore() {
  return { subscriptions: [], reminders: [], deliveries: [], meta: { schema: 2 } }
}

function load() {
  try {
    if (!existsSync(STORE)) return emptyStore()
    const db = JSON.parse(readFileSync(STORE, 'utf8'))
    return {
      subscriptions: Array.isArray(db.subscriptions) ? db.subscriptions : [],
      reminders: Array.isArray(db.reminders) ? db.reminders : [],
      deliveries: Array.isArray(db.deliveries) ? db.deliveries : [],
      meta: db.meta || { schema: 2 },
    }
  } catch {
    return emptyStore()
  }
}

function save(db) {
  const tmp = `${STORE}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(db, null, 2))
  renameSync(tmp, STORE)
}

let storageOk = true
try {
  const probe = load()
  save(probe)
} catch {
  storageOk = false
}

const rateMap = new Map()

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim().slice(0, 64)
  return req.socket?.remoteAddress || 'unknown'
}

function rateLimit(req) {
  const ip = clientIp(req)
  const now = Date.now()
  const windowMs = 60_000
  let bucket = rateMap.get(ip)
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 }
    rateMap.set(ip, bucket)
  }
  bucket.count += 1
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) {
      if (now - v.start > windowMs) rateMap.delete(k)
    }
  }
  return bucket.count <= RATE_LIMIT_PER_MIN
}

function corsOrigin(req) {
  const origin = String(req.headers.origin || '').replace(/\/$/, '')
  if (!origin) return ALLOWED_ORIGINS[0] || '*'
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // ShipStatic preview snapshots + Cloudflare quick tunnels (device verify)
  if (/^https:\/\/[a-z0-9-]+\.shipstatic\.com$/i.test(origin)) return origin
  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return origin
  if (NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin
  }
  return null
}

function json(res, req, status, body) {
  const origin = corsOrigin(req)
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-AIZIO-Install, X-Cron-Secret',
    'Cache-Control': 'no-store',
  }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  else headers['Access-Control-Allow-Origin'] = 'null'
  const payload = JSON.stringify(body)
  res.writeHead(status, headers)
  res.end(payload)
}

function readBody(req, limit = 64_000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(Object.assign(new Error('body_too_large'), { code: 'body_too_large' }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(Object.assign(new Error('invalid_json'), { code: 'invalid_json' }))
      }
    })
    req.on('error', reject)
  })
}

function requireInstall(req, body) {
  if (!INSTALL_TOKEN) return true
  const header = String(req.headers['x-aizio-install'] || '')
  const fromBody = String(body?.installToken || '')
  return header === INSTALL_TOKEN || fromBody === INSTALL_TOKEN
}

function logInfo(msg, extra = {}) {
  const safe = { ...extra }
  delete safe.endpoint
  delete safe.keys
  delete safe.auth
  delete safe.p256dh
  delete safe.privateKey
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...safe }))
}

async function sendDue(reason = 'tick') {
  if (!vapidReady || !storageOk) return { checked: 0, sent: 0, failed: 0, reason }
  const db = load()
  const now = Date.now()
  let sent = 0
  let failed = 0
  let checked = 0
  let changed = false

  for (const rem of db.reminders) {
    if (rem.status !== 'scheduled') continue
    const when = Date.parse(rem.scheduledAt)
    if (!Number.isFinite(when)) continue
    // Past policy: fire if due within last 24h; older → expired
    if (when > now) continue
    checked += 1
    if (now - when > 24 * 60 * 60 * 1000) {
      rem.status = 'expired'
      rem.lastError = 'past_window'
      changed = true
      continue
    }
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
    if (!subs.length) {
      rem.status = 'failed'
      rem.lastError = 'no_subscription'
      failed += 1
      changed = true
      continue
    }
    const shown = privacyBody(rem.privacyMode || 'simple', rem.title, rem.body)
    let anyOk = false
    for (const sub of [...subs]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
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
          { TTL: 60 * 60 },
        )
        anyOk = true
        sent += 1
        db.deliveries.push({
          dedupeKey: dedupe,
          reminderId: rem.reminderId,
          status: 'sent',
          at: new Date().toISOString(),
          deviceId: sub.deviceId,
        })
      } catch (err) {
        const code = err?.statusCode || 0
        failed += 1
        db.deliveries.push({
          dedupeKey: dedupe,
          reminderId: rem.reminderId,
          status: 'failed',
          at: new Date().toISOString(),
          errorCode: String(code || err?.code || 'send_error'),
          deviceId: sub.deviceId,
        })
        if (code === 404 || code === 410) {
          db.subscriptions = db.subscriptions.filter((s) => s.endpoint !== sub.endpoint)
          logInfo('subscription_removed', { code, deviceId: maskId(sub.deviceId) })
        }
      }
      changed = true
    }
    rem.status = anyOk ? 'sent' : 'failed'
    rem.lastError = anyOk ? undefined : rem.lastError || 'send_failed'
    rem.attempts = (rem.attempts || 0) + 1
    changed = true
  }

  // Cap deliveries log
  if (db.deliveries.length > 2000) db.deliveries = db.deliveries.slice(-1500)
  if (changed) save(db)
  logInfo('sendDue', { reason, checked, sent, failed })
  return { checked, sent, failed, reason }
}

function healthBody() {
  const db = storageOk ? load() : emptyStore()
  const scheduled = db.reminders.filter((r) => r.status === 'scheduled').length
  const uptimeSec = Math.floor((Date.now() - STARTED) / 1000)
  return {
    ok: storageOk,
    service: 'aizio-push-server',
    version: VERSION,
    currentTime: new Date().toISOString(),
    uptime: uptimeSec,
    uptimeSec,
    storage: {
      ok: storageOk,
      kind: 'json-file',
      pathHint: 'DATA_DIR/store.json',
      subscriptions: db.subscriptions.length,
      reminders: db.reminders.length,
      scheduled,
    },
    database: {
      ok: storageOk,
      kind: 'json-file',
      durableAcrossRestart: true,
      durableAcrossRedeploy: false,
    },
    scheduler: {
      ok: true,
      mode: 'interval+cron-tick',
      intervalMs: 15_000,
      note: 'Hosts that sleep need external cron hitting /v1/cron/tick',
    },
    vapidConfigured: vapidReady,
    nodeEnv: NODE_ENV,
    providerSecrets: {
      ok: true,
      kind: 'json-file-dev-store',
      note: 'Local/Preview backend secret store — not OS Credential Manager encryption',
      configuredCount: secrets.listStatuses().filter((s) => s.configured).length,
      generation: secrets.getGeneration(),
    },
  }
}

const server = createServer(async (req, res) => {
  if (!rateLimit(req)) {
    return json(res, req, 429, { ok: false, error: 'rate_limited', message: 'Too many requests' })
  }

  if (req.method === 'OPTIONS') {
    const origin = corsOrigin(req)
    res.writeHead(origin ? 204 : 403, {
      'Access-Control-Allow-Origin': origin || 'null',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-AIZIO-Install, X-Cron-Secret',
      'Access-Control-Max-Age': '86400',
    })
    return res.end()
  }

  const origin = corsOrigin(req)
  if (req.headers.origin && !origin) {
    return json(res, req, 403, { ok: false, error: 'origin_forbidden', message: 'Origin not allowed' })
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/health') {
      return json(res, req, 200, healthBody())
    }

    if (req.method === 'POST' && path === '/v1/cron/tick') {
      if (CRON_SECRET) {
        const got = String(req.headers['x-cron-secret'] || url.searchParams.get('secret') || '')
        if (got !== CRON_SECRET) {
          return json(res, req, 401, { ok: false, error: 'unauthorized' })
        }
      }
      const result = await sendDue('cron')
      return json(res, req, 200, { ok: true, ...result })
    }

    let body = {}
    if (req.method === 'POST' || req.method === 'PUT') body = await readBody(req)

    // —— Provider Secret Store (never returns full keys) ——
    if (req.method === 'GET' && path === '/v1/provider-keys') {
      return json(res, req, 200, {
        ok: true,
        store: 'json-file-dev-store',
        generation: secrets.getGeneration(),
        providers: secrets.listStatuses(),
      })
    }

    if (req.method === 'GET' && path === '/v1/provider-keys/diag') {
      const providers = secrets.listStatuses().map((s) => ({
        provider: s.provider,
        configured: s.configured,
        source: s.source,
        maskedKey: s.maskedKey,
        connectionStatus: s.connectionStatus,
        lastUpdatedAt: s.lastUpdatedAt,
        lastTestedAt: s.lastTestedAt,
        lastErrorCode: s.lastErrorCode,
        // never apiKey
      }))
      return json(res, req, 200, {
        ok: true,
        storeKind: 'json-file-dev-store',
        encryptedClaim: false,
        generation: secrets.getGeneration(),
        providers,
      })
    }

    const keyMatch = path.match(/^\/v1\/provider-keys\/([a-z0-9_]+)$/i)
    if (keyMatch) {
      const provider = keyMatch[1]
      if (req.method === 'GET') {
        return json(res, req, 200, { ok: true, ...secrets.statusFor(provider) })
      }
      if (req.method === 'PUT') {
        if (!requireInstall(req, body)) {
          return json(res, req, 401, { ok: false, error: 'unauthorized' })
        }
        try {
          const st = secrets.setKey(provider, {
            apiKey: body.apiKey,
            apiBase: body.apiBase,
            model: body.model,
          })
          logInfo('provider_key_saved', { provider, source: st.source })
          return json(res, req, 200, { ok: true, saved: true, ...st })
        } catch (err) {
          const code = err?.code || 'save_failed'
          return json(res, req, 400, { ok: false, error: code, message: '저장하지 못했습니다.' })
        }
      }
      if (req.method === 'DELETE') {
        if (!requireInstall(req, body)) {
          return json(res, req, 401, { ok: false, error: 'unauthorized' })
        }
        const st = secrets.deleteKey(provider)
        logInfo('provider_key_deleted', { provider })
        return json(res, req, 200, { ok: true, deleted: true, ...st })
      }
    }

    const testMatch = path.match(/^\/v1\/provider-keys\/([a-z0-9_]+)\/test$/i)
    if (req.method === 'POST' && testMatch) {
      const provider = testMatch[1]
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      // Optional one-shot key for test-before-save (not persisted unless also PUT)
      let resolved = secrets.resolveRaw(provider)
      if (body.apiKey && String(body.apiKey).trim() && !String(body.apiKey).includes('…')) {
        resolved = {
          ...resolved,
          apiKey: String(body.apiKey).trim(),
          apiBase: body.apiBase != null ? String(body.apiBase).trim() : resolved.apiBase,
          model: body.model != null ? String(body.model).trim() : resolved.model,
          source: 'user-secret',
        }
      }
      const result = await testProviderConnection(provider, resolved)
      if (resolved.source !== 'none' || secrets.resolveRaw(provider).apiKey) {
        secrets.markTest(provider, {
          connectionStatus: result.connectionStatus,
          lastErrorCode: result.ok ? null : result.code,
          lastErrorMessage: result.ok ? null : result.message,
        })
      }
      return json(res, req, 200, {
        ok: result.ok,
        provider,
        connectionStatus: result.connectionStatus,
        code: result.code,
        message: result.message,
        latencyMs: result.latencyMs,
        partial: Boolean(result.partial),
        status: secrets.statusFor(provider),
      })
    }

    if (req.method === 'POST' && path === '/v1/ai/chat') {
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      const provider = String(body.provider || 'openrouter')
      const resolved = secrets.resolveRaw(provider)
      if (!resolved.apiKey) {
        return json(res, req, 400, {
          ok: false,
          error: 'NO_KEY',
          message: 'API 키가 없습니다. 설정에서 저장한 뒤 다시 시도하세요.',
        })
      }
      try {
        const out = await proxyChat(provider, resolved, body.messages || [])
        return json(res, req, 200, { ok: true, ...out })
      } catch (err) {
        return json(res, req, 502, {
          ok: false,
          error: err?.code || 'provider_error',
          message: err instanceof Error ? err.message : 'Provider 호출 실패',
        })
      }
    }

    if (req.method === 'POST' && path === '/v1/push/subscribe') {
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      if (!body.userId || !body.deviceId || !body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
        return json(res, req, 400, { ok: false, error: 'validation_error', message: 'missing fields' })
      }
      if (!isHttpsEndpoint(body.subscription.endpoint)) {
        return json(res, req, 400, { ok: false, error: 'invalid_endpoint', message: 'endpoint must be https' })
      }
      const db = load()
      db.subscriptions = db.subscriptions.filter(
        (s) => !(s.userId === body.userId && s.deviceId === body.deviceId) && s.endpoint !== body.subscription.endpoint,
      )
      db.subscriptions.push({
        userId: String(body.userId).slice(0, 128),
        deviceId: String(body.deviceId).slice(0, 128),
        endpoint: body.subscription.endpoint,
        keys: {
          p256dh: String(body.subscription.keys.p256dh),
          auth: String(body.subscription.keys.auth),
        },
        timezone: String(body.timezone || 'UTC').slice(0, 64),
        locale: body.locale ? String(body.locale).slice(0, 32) : undefined,
        appVersion: body.appVersion ? String(body.appVersion).slice(0, 32) : undefined,
        channels: Array.isArray(body.channels) ? body.channels.slice(0, 8) : ['smart_reminder'],
        updatedAt: new Date().toISOString(),
      })
      save(db)
      logInfo('subscribe', { userId: maskId(body.userId), deviceId: maskId(body.deviceId) })
      return json(res, req, 200, {
        ok: true,
        subscriptionId: `${maskId(body.userId)}:${maskId(body.deviceId)}`,
        message: 'subscribed',
      })
    }

    if (req.method === 'POST' && path === '/v1/push/unsubscribe') {
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      const db = load()
      const before = db.subscriptions.length
      db.subscriptions = db.subscriptions.filter(
        (s) =>
          !(
            s.userId === body.userId &&
            s.deviceId === body.deviceId &&
            (!body.endpoint || s.endpoint === body.endpoint)
          ),
      )
      save(db)
      logInfo('unsubscribe', { removed: before - db.subscriptions.length, deviceId: maskId(body.deviceId) })
      return json(res, req, 200, { ok: true, message: 'unsubscribed' })
    }

    if (req.method === 'POST' && path === '/v1/push/send') {
      // Chat relay — private key stays on server
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      if (!vapidReady) {
        return json(res, req, 503, { ok: false, error: 'vapid_missing' })
      }
      const subs = Array.isArray(body.subscriptions) ? body.subscriptions.slice(0, 40) : []
      const payload = body.payload || {}
      let sent = 0
      const db = load()
      for (const sub of subs) {
        if (!sub?.endpoint || !sub?.keys?.p256dh || !isHttpsEndpoint(sub.endpoint)) continue
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: String(payload.title || 'AIZIO').slice(0, 64),
              body: String(payload.body || '').slice(0, 160),
              kind: payload.kind === 'friends' ? 'friends' : 'family',
              view: payload.kind === 'friends' ? 'friends' : 'family',
              tag: String(payload.tag || 'jarvis-chat').slice(0, 64),
            }),
          )
          sent += 1
        } catch (err) {
          const code = err?.statusCode || 0
          if (code === 404 || code === 410) {
            db.subscriptions = db.subscriptions.filter((s) => s.endpoint !== sub.endpoint)
          }
        }
      }
      save(db)
      return json(res, req, 200, { ok: true, sent })
    }

    if (req.method === 'POST' && (path === '/v1/reminders/schedule' || path === '/v1/reminders/update')) {
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      if (!body.reminderId || !body.userId || !body.scheduledAt) {
        return json(res, req, 400, { ok: false, error: 'validation_error', message: 'missing fields' })
      }
      const when = Date.parse(body.scheduledAt)
      if (!Number.isFinite(when)) {
        return json(res, req, 400, { ok: false, error: 'invalid_time' })
      }
      const db = load()
      const id = body.serverScheduleId || `sch_${String(body.userId).slice(0, 12)}_${String(body.reminderId).slice(0, 36)}`
      // Dedupe same reminderId for user
      db.reminders = db.reminders.filter(
        (r) => !(r.userId === body.userId && r.reminderId === body.reminderId) && r.id !== id,
      )
      const status = when <= Date.now() - 60_000 ? 'expired' : 'scheduled'
      db.reminders.push({
        id,
        reminderId: String(body.reminderId).slice(0, 128),
        userId: String(body.userId).slice(0, 128),
        deviceIds: Array.isArray(body.deviceIds) ? body.deviceIds.map(String).slice(0, 10) : [],
        scheduledAt: new Date(when).toISOString(),
        timezone: String(body.timezone || 'UTC').slice(0, 64),
        title: String(body.title || 'AIZIO').slice(0, 64),
        body: String(body.body || '예약된 일정 시간입니다.').slice(0, 160),
        privacyMode: ['full', 'simple', 'hidden'].includes(body.privacyMode) ? body.privacyMode : 'simple',
        data: body.data && typeof body.data === 'object' ? body.data : { type: 'reminder', route: '/?view=chat', entityId: body.reminderId },
        dedupeKey: `${body.userId}:${body.reminderId}:${new Date(when).toISOString()}`,
        status,
        attempts: 0,
        updatedAt: new Date().toISOString(),
      })
      save(db)
      if (status === 'scheduled' && when <= Date.now() + 5_000) {
        void sendDue('immediate')
      }
      return json(res, req, 200, {
        ok: true,
        serverScheduleId: id,
        status,
        message: status === 'expired' ? 'time_in_past' : 'scheduled',
      })
    }

    if (req.method === 'POST' && path === '/v1/reminders/cancel') {
      if (!requireInstall(req, body)) {
        return json(res, req, 401, { ok: false, error: 'unauthorized' })
      }
      const db = load()
      let n = 0
      for (const r of db.reminders) {
        if (r.reminderId === body.reminderId && r.userId === body.userId) {
          r.status = 'cancelled'
          n += 1
        }
      }
      save(db)
      return json(res, req, 200, { ok: true, message: 'cancelled', cancelled: n })
    }

    if (req.method === 'GET' && path.startsWith('/v1/reminders/status/')) {
      const reminderId = decodeURIComponent(path.slice('/v1/reminders/status/'.length))
      const userId = String(url.searchParams.get('userId') || '').trim()
      if (!userId) {
        return json(res, req, 400, { ok: false, error: 'validation_error', message: 'userId required' })
      }
      const db = load()
      const rem = db.reminders.find((r) => r.reminderId === reminderId && r.userId === userId)
      if (!rem) return json(res, req, 200, { ok: true, reminderId, status: 'unknown' })
      return json(res, req, 200, {
        ok: true,
        reminderId,
        status: rem.status,
        serverScheduleId: rem.id,
        scheduledAt: rem.scheduledAt,
        lastError: rem.lastError,
      })
    }

    return json(res, req, 404, { ok: false, error: 'not_found' })
  } catch (err) {
    const code = err?.code || 'server_error'
    const status = code === 'invalid_json' || code === 'body_too_large' ? 400 : 500
    return json(res, req, status, { ok: false, error: code, message: 'request failed' })
  }
})

function shutdown(signal) {
  logInfo('shutdown', { signal })
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}

const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url

if (isMain) {
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  server.listen(PORT, '0.0.0.0', () => {
    logInfo('listen', { port: PORT, vapidConfigured: vapidReady, storageOk })
    void sendDue('boot')
    setInterval(() => {
      void sendDue('interval')
    }, 15_000).unref?.()
  })
}
