/**
 * Spawns push-server with temp DATA_DIR and exercises HTTP API.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keys = webpush.generateVAPIDKeys()
const dataDir = mkdtempSync(join(tmpdir(), 'aizio-push-'))
const PORT = 18787 + Math.floor(Math.random() * 200)
const ORIGIN = 'https://harmonic-rift-5oo4f3w.shipstatic.com'
const BASE = `http://127.0.0.1:${PORT}`

let child

async function waitHealth(ms = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(`${BASE}/health`)
      if (r.ok) return r.json()
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('health timeout')
}

before(async () => {
  writeFileSync(
    join(dataDir, '..env-not-used'),
    '',
  )
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY: keys.privateKey,
      VAPID_SUBJECT: 'mailto:test@example.com',
      ALLOWED_ORIGINS: ORIGIN,
      NODE_ENV: 'test',
      RATE_LIMIT_PER_MIN: '1000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await waitHealth()
})

after(() => {
  try {
    child?.kill('SIGTERM')
  } catch {
    /* ignore */
  }
  try {
    rmSync(dataDir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
})

async function api(path, { method = 'GET', body, origin = ORIGIN } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { res, data }
}

describe('push-server HTTP', () => {
  it('health shape', async () => {
    const { res, data } = await api('/health')
    assert.equal(res.status, 200)
    assert.equal(data.ok, true)
    assert.equal(data.service, 'aizio-push-server')
    assert.ok(data.version)
    assert.ok(data.currentTime)
    assert.equal(typeof data.uptime, 'number')
    assert.equal(typeof data.uptimeSec, 'number')
    assert.equal(data.storage.ok, true)
    assert.equal(data.database.ok, true)
    assert.equal(data.scheduler.ok, true)
    assert.equal(data.vapidConfigured, true)
    assert.ok(!JSON.stringify(data).includes(keys.privateKey))
  })

  it('blocks disallowed origin', async () => {
    const { res, data } = await api('/v1/push/subscribe', {
      method: 'POST',
      origin: 'https://evil.example',
      body: {
        userId: 'u1',
        deviceId: 'd1',
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/x',
          keys: { p256dh: 'a', auth: 'b' },
        },
        timezone: 'Asia/Seoul',
      },
    })
    assert.equal(res.status, 403)
    assert.equal(data.error, 'origin_forbidden')
  })

  it('rejects non-https endpoint', async () => {
    const { res, data } = await api('/v1/push/subscribe', {
      method: 'POST',
      body: {
        userId: 'u1',
        deviceId: 'd1',
        subscription: { endpoint: 'http://insecure', keys: { p256dh: 'a', auth: 'b' } },
        timezone: 'UTC',
      },
    })
    assert.equal(res.status, 400)
    assert.equal(data.error, 'invalid_endpoint')
  })

  it('subscribe dedupe, schedule, update, status, cancel', async () => {
    const subBody = {
      userId: 'user-aaa',
      deviceId: 'device-bbb',
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-1',
        keys: { p256dh: 'p256', auth: 'auth' },
      },
      timezone: 'Asia/Seoul',
      channels: ['smart_reminder'],
    }
    let r = await api('/v1/push/subscribe', { method: 'POST', body: subBody })
    assert.equal(r.data.ok, true)
    r = await api('/v1/push/subscribe', { method: 'POST', body: subBody })
    assert.equal(r.data.ok, true)

    const when = new Date(Date.now() + 120_000).toISOString()
    r = await api('/v1/reminders/schedule', {
      method: 'POST',
      body: {
        reminderId: 'rem-1',
        userId: 'user-aaa',
        deviceIds: ['device-bbb'],
        scheduledAt: when,
        timezone: 'Asia/Seoul',
        title: 'AIZIO',
        body: '예약된 일정 시간입니다.',
        privacyMode: 'simple',
        data: { type: 'reminder', route: '/?view=chat', entityId: 'rem-1' },
      },
    })
    assert.equal(r.data.ok, true)
    assert.ok(r.data.serverScheduleId)

    // duplicate same reminderId replaces
    r = await api('/v1/reminders/schedule', {
      method: 'POST',
      body: {
        reminderId: 'rem-1',
        userId: 'user-aaa',
        scheduledAt: new Date(Date.now() + 180_000).toISOString(),
        timezone: 'Asia/Seoul',
        title: 'AIZIO',
        body: '예약된 일정 시간입니다.',
        privacyMode: 'hidden',
        data: { type: 'reminder', route: '/?view=chat', entityId: 'rem-1' },
      },
    })
    assert.equal(r.data.ok, true)

    r = await api('/v1/reminders/update', {
      method: 'POST',
      body: {
        reminderId: 'rem-1',
        userId: 'user-aaa',
        serverScheduleId: r.data.serverScheduleId,
        scheduledAt: new Date(Date.now() + 240_000).toISOString(),
        timezone: 'Asia/Seoul',
        title: 'AIZIO',
        body: '예약된 일정 시간입니다.',
        privacyMode: 'simple',
        data: { type: 'reminder', route: '/?view=chat', entityId: 'rem-1' },
      },
    })
    assert.equal(r.data.ok, true)

    r = await api('/v1/reminders/status/rem-1?userId=user-aaa')
    assert.equal(r.data.status, 'scheduled')

    r = await api('/v1/reminders/status/rem-1?userId=other-user')
    assert.equal(r.data.status, 'unknown')

    r = await api('/v1/reminders/status/rem-1')
    assert.equal(r.res.status, 400)

    r = await api('/v1/reminders/cancel', {
      method: 'POST',
      body: { reminderId: 'rem-1', userId: 'user-aaa' },
    })
    assert.equal(r.data.ok, true)
    r = await api('/v1/reminders/status/rem-1?userId=user-aaa')
    assert.equal(r.data.status, 'cancelled')
  })

  it('unsubscribe', async () => {
    const r = await api('/v1/push/unsubscribe', {
      method: 'POST',
      body: { userId: 'user-aaa', deviceId: 'device-bbb' },
    })
    assert.equal(r.data.ok, true)
  })

  it('persists across restart', async () => {
    await api('/v1/push/subscribe', {
      method: 'POST',
      body: {
        userId: 'persist-u',
        deviceId: 'persist-d',
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/persist',
          keys: { p256dh: 'x', auth: 'y' },
        },
        timezone: 'UTC',
      },
    })
    await api('/v1/reminders/schedule', {
      method: 'POST',
      body: {
        reminderId: 'persist-r',
        userId: 'persist-u',
        scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
        timezone: 'UTC',
        title: 'AIZIO',
        body: '예약된 일정 시간입니다.',
        privacyMode: 'simple',
        data: { type: 'reminder', route: '/?view=chat', entityId: 'persist-r' },
      },
    })
    child.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 400))
    child = spawn(process.execPath, ['server.mjs'], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: String(PORT),
        DATA_DIR: dataDir,
        VAPID_PUBLIC_KEY: keys.publicKey,
        VAPID_PRIVATE_KEY: keys.privateKey,
        VAPID_SUBJECT: 'mailto:test@example.com',
        ALLOWED_ORIGINS: ORIGIN,
        NODE_ENV: 'test',
        RATE_LIMIT_PER_MIN: '1000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitHealth()
    const { data } = await api('/v1/reminders/status/persist-r?userId=persist-u')
    assert.equal(data.status, 'scheduled')
  })

  it('rejects past schedule as expired', async () => {
    const { data } = await api('/v1/reminders/schedule', {
      method: 'POST',
      body: {
        reminderId: 'past-r',
        userId: 'user-aaa',
        scheduledAt: new Date(Date.now() - 120_000).toISOString(),
        timezone: 'UTC',
        title: 'AIZIO',
        body: '예약된 일정 시간입니다.',
        privacyMode: 'simple',
        data: { type: 'reminder', route: '/?view=chat', entityId: 'past-r' },
      },
    })
    assert.equal(data.ok, true)
    assert.equal(data.status, 'expired')
  })
})
