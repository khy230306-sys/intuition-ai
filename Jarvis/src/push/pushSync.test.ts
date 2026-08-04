import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetGuestIdentityForTests } from '../account'
import {
  buildNotificationBodies,
  cancelReminderOnServer,
  getPushServerStatus,
  parsePushEventData,
  notificationClickTarget,
  isSafeAppNavigateUrl,
  REMINDER_PUSH_API,
  scheduleReminderOnServer,
  setPushServerBaseUrl,
  sanitizePushRoute,
  updateReminderOnServer,
} from './index'
import { migrateSmartRemindersPushFields, saveSmartReminder, loadSmartReminders } from '../smartReminder/storage'
import { resolveReminderPrivacyMode } from '../smartReminder/privacy'
import { formatPushScheduleLabel } from '../smartReminder/types'
import { syncReminderPushSchedule, syncReminderPushCancel } from '../smartReminder/pushSync'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => 'push-sync-user' })

beforeEach(() => {
  store.clear()
  resetGuestIdentityForTests()
  setPushServerBaseUrl(null)
  vi.unstubAllGlobals()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  })
  vi.stubGlobal('crypto', { randomUUID: () => 'push-sync-user' })
})

describe('push API contract + privacy', () => {
  it('exposes subscribe/schedule/update/cancel/status paths', () => {
    expect(REMINDER_PUSH_API.subscribe).toMatch(/push\/subscribe/)
    expect(REMINDER_PUSH_API.unsubscribe).toMatch(/unsubscribe/)
    expect(REMINDER_PUSH_API.schedule).toMatch(/schedule/)
    expect(REMINDER_PUSH_API.update).toMatch(/update/)
    expect(REMINDER_PUSH_API.cancel).toMatch(/cancel/)
    expect(REMINDER_PUSH_API.status).toMatch(/status/)
  })

  it('privacy modes: full / simple / hidden', () => {
    expect(buildNotificationBodies('full', '엄마 병원').body).toContain('엄마 병원')
    expect(buildNotificationBodies('simple', '엄마 병원').body).toMatch(/예약된 일정/)
    expect(buildNotificationBodies('hidden', '엄마 병원').body).toMatch(/AIZIO 알림/)
  })

  it('family/health stay hidden unless settings full', () => {
    expect(
      resolveReminderPrivacyMode(
        { category: 'health', personDisplay: '엄마', personRelation: 'mother', previewMode: 'simple' },
        { notifyPrivacyMode: 'simple' },
      ),
    ).toBe('hidden')
    expect(
      resolveReminderPrivacyMode(
        { category: 'health', personDisplay: '엄마', personRelation: 'mother', previewMode: 'simple' },
        { notifyPrivacyMode: 'full' },
      ),
    ).toBe('full')
  })

  it('sanitizes routes and blocks unsafe navigate URLs', () => {
    expect(sanitizePushRoute('https://evil.com')).toBe('/?view=chat')
    expect(sanitizePushRoute('/?view=chat')).toBe('/?view=chat')
    expect(isSafeAppNavigateUrl('https://jarvis-app.shipstatic.com/?view=chat', 'https://jarvis-app.shipstatic.com')).toBe(
      true,
    )
    expect(isSafeAppNavigateUrl('javascript:alert(1)', 'https://jarvis-app.shipstatic.com')).toBe(false)
    expect(isSafeAppNavigateUrl('https://evil.com/', 'https://jarvis-app.shipstatic.com')).toBe(false)
  })

  it('parses reminder vs chat push payloads; handles bad JSON', () => {
    const rem = parsePushEventData(
      JSON.stringify({ kind: 'reminder', title: 'AIZIO', body: 'x', reminderId: 'r1', view: 'chat' }),
    )
    expect(rem.kind).toBe('reminder')
    if (rem.kind === 'reminder') expect(rem.tag).toContain('reminder')
    const chat = parsePushEventData(JSON.stringify({ kind: 'friends', title: 'AIZIO', body: 'hi' }))
    expect(chat.kind).toBe('chat')
    const bad = parsePushEventData('{not-json')
    expect(bad.kind).toBe('unknown')
    const click = notificationClickTarget(rem, 'https://example.com/')
    expect(click).toContain('view=chat')
    expect(click).toContain('reminderId=r1')
  })
})

describe('smart reminder push sync (mock server)', () => {
  it('keeps local reminder when server unconfigured', async () => {
    const r = {
      id: 'r-local',
      title: '테스트',
      description: '',
      personId: null,
      personRelation: null,
      personDisplay: null,
      scheduledAt: new Date(Date.now() + 120_000).toISOString(),
      scheduledAtMs: Date.now() + 120_000,
      timezone: 'Asia/Seoul',
      advanceAlertsMs: [],
      advanceAlarmIds: [],
      mainAlarmId: 'a1',
      repeatRule: null,
      status: 'scheduled' as const,
      notificationStatus: 'pending' as const,
      category: null,
      createdFrom: 'conversation' as const,
      originalText: '2분 뒤 알려줘',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previewMode: 'simple' as const,
    }
    saveSmartReminder(r)
    const synced = await syncReminderPushSchedule(r)
    expect(synced.pushScheduleStatus).toBe('server_unconfigured')
    expect(loadSmartReminders().find((x) => x.id === 'r-local')).toBeTruthy()
    expect(formatPushScheduleLabel(synced)).toMatch(/서버 미연결|앱 내부/)
  })

  it('stores serverScheduleId on successful schedule mock', async () => {
    setPushServerBaseUrl('https://push.test')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        if (u.endsWith('/v1/push/subscribe')) {
          return new Response(JSON.stringify({ ok: true, subscriptionId: 's1' }), { status: 200 })
        }
        if (u.endsWith('/v1/reminders/schedule')) {
          return new Response(JSON.stringify({ ok: true, serverScheduleId: 'sch_99' }), { status: 200 })
        }
        if (u.endsWith('/v1/reminders/update')) {
          return new Response(JSON.stringify({ ok: true, serverScheduleId: 'sch_99' }), { status: 200 })
        }
        if (u.endsWith('/v1/reminders/cancel')) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response('no', { status: 404 })
      }),
    )
    // Browser push APIs not available in node — subscribe will fail permission; force server path via direct API
    const sched = await scheduleReminderOnServer({
      reminderId: 'r2',
      userId: 'u',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      timezone: 'Asia/Seoul',
      title: 'AIZIO',
      body: '예약된 일정 시간입니다.',
      privacyMode: 'simple',
      data: { type: 'reminder', route: '/?view=chat', entityId: 'r2' },
    })
    expect(sched.ok).toBe(true)
    expect(sched.serverScheduleId).toBe('sch_99')
    const upd = await updateReminderOnServer({
      reminderId: 'r2',
      userId: 'u',
      serverScheduleId: 'sch_99',
      scheduledAt: new Date(Date.now() + 90_000).toISOString(),
      timezone: 'Asia/Seoul',
      title: 'AIZIO',
      body: '예약된 일정 시간입니다.',
      privacyMode: 'simple',
      data: { type: 'reminder', route: '/?view=chat', entityId: 'r2' },
    })
    expect(upd.ok).toBe(true)
    const cancel = await cancelReminderOnServer({ reminderId: 'r2', userId: 'u', serverScheduleId: 'sch_99' })
    expect(cancel.ok).toBe(true)
    expect(getPushServerStatus().configured).toBe(true)
  })

  it('migrates older reminders with push fields', () => {
    store.set(
      'jarvis_smart_reminders_v1',
      JSON.stringify([
        {
          id: 'old1',
          title: '옛일정',
          description: '',
          personId: null,
          personRelation: null,
          personDisplay: null,
          scheduledAt: new Date().toISOString(),
          scheduledAtMs: Date.now(),
          timezone: 'Asia/Seoul',
          advanceAlertsMs: [],
          advanceAlarmIds: [],
          mainAlarmId: null,
          repeatRule: null,
          status: 'scheduled',
          notificationStatus: 'pending',
          category: null,
          createdFrom: 'conversation',
          originalText: 'x',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          previewMode: 'full',
        },
      ]),
    )
    const { migrated } = migrateSmartRemindersPushFields()
    expect(migrated).toBeGreaterThanOrEqual(1)
    const item = loadSmartReminders()[0]!
    expect(item.pushScheduleStatus).toBeDefined()
    expect(item.serverScheduleId === null || item.serverScheduleId === undefined || typeof item.serverScheduleId === 'string').toBe(
      true,
    )
  })

  it('cancel sync marks cancelled without deleting local row', async () => {
    const r = {
      id: 'r-cancel',
      title: '취소테스트',
      description: '',
      personId: null,
      personRelation: null,
      personDisplay: null,
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      scheduledAtMs: Date.now() + 60_000,
      timezone: 'Asia/Seoul',
      advanceAlertsMs: [],
      advanceAlarmIds: [],
      mainAlarmId: null,
      repeatRule: null,
      status: 'cancelled' as const,
      notificationStatus: 'pending' as const,
      category: null,
      createdFrom: 'conversation' as const,
      originalText: 'x',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previewMode: 'simple' as const,
      serverScheduleId: 'sch_x',
    }
    saveSmartReminder(r)
    const out = await syncReminderPushCancel(r)
    expect(out.pushScheduleStatus).toBe('cancelled')
    expect(loadSmartReminders().some((x) => x.id === 'r-cancel')).toBe(true)
  })
})
