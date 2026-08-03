import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetGuestIdentityForTests } from '../account'
import {
  getPushServerStatus,
  loadReminderPushSubscription,
  reminderPushReadinessSummary,
  REMINDER_PUSH_API,
  setPushServerBaseUrl,
} from './index'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => 'push-user-1' })

beforeEach(() => {
  store.clear()
  resetGuestIdentityForTests()
  setPushServerBaseUrl(null)
})

describe('reminder push foundation', () => {
  it('reports server unconfigured — does not claim closed-app complete', () => {
    const st = getPushServerStatus()
    expect(st.configured).toBe(false)
    expect(st.reason).toMatch(/서버/)
    const summary = reminderPushReadinessSummary()
    expect(summary).toMatch(/완성으로 보지 마세요|미설정/)
  })

  it('exposes API contract constants', () => {
    expect(REMINDER_PUSH_API.schedule).toMatch(/reminders\/schedule/)
    expect(REMINDER_PUSH_API.upsertSubscription).toMatch(/push\/subscriptions/)
  })

  it('stores local subscription records without server sync flag', () => {
    expect(loadReminderPushSubscription()).toBeNull()
    store.set(
      'aizio.push.reminderSubscription.v1',
      JSON.stringify({
        userId: 'u1',
        deviceId: 'd1',
        endpoint: 'https://example.push/x',
        keys: { p256dh: 'a', auth: 'b' },
        channels: ['smart_reminder'],
        timezone: 'Asia/Seoul',
        createdAt: 't',
        updatedAt: 't',
        serverRegisteredAt: null,
      }),
    )
    const rec = loadReminderPushSubscription()
    expect(rec?.serverRegisteredAt).toBeNull()
    expect(rec?.channels).toContain('smart_reminder')
  })
})
