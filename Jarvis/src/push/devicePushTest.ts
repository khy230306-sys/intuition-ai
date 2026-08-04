/**
 * Guided push device-test actions for Settings UI.
 * Results never include API keys, VAPID private keys, or full endpoints.
 */

import { ensureGuestIdentity } from '../account'
import { ensureChatNotificationPermission, canUseWebPush } from '../chatNotify'
import {
  cancelReminderOnServer,
  ensureReminderPushSubscription,
  scheduleReminderOnServer,
  unsubscribeReminderPush,
  updateReminderOnServer,
} from './reminderPushClient'
import { pingPushHealth } from './previewConfig'
import { getPushServerStatus } from './serverUrl'
import { buildNotificationBodies } from './reminderPushTypes'

export type DevicePushTestResult = {
  app: 'AIZIO'
  version: string
  commit: string
  deviceHint: string
  osHint: string
  browser: string
  standalone: boolean
  notificationPermission: string
  serviceWorkerReady: boolean
  subscriptionPresent: boolean
  serverHealthOk: boolean
  scheduleIdMasked: string | null
  timingsMs: Record<string, number>
  lastError: string | null
  lastReceivedAt: string | null
  generatedAt: string
  statusNote: '실기기 검증 대기'
}

const LAST_RX_KEY = 'aizio.push.lastReceivedAt.v1'

export function markPushReceived(): void {
  try {
    localStorage.setItem(LAST_RX_KEY, new Date().toISOString())
  } catch {
    /* ignore */
  }
}

function mask(id: string | null | undefined): string | null {
  if (!id) return null
  if (id.length <= 8) return '****'
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}

function uaHints() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const os = /iPhone|iPad/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : 'other'
  const browser = /CriOS|Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'other'
  return { os, browser, device: os === 'iOS' ? 'iPhone/iPad' : os === 'Android' ? 'Android' : 'desktop' }
}

export async function runPushConnectionCheck(version: string, commit: string): Promise<DevicePushTestResult> {
  const t0 = performance.now()
  const health = await pingPushHealth()
  const hints = uaHints()
  let swReady = false
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready
      swReady = true
    }
  } catch {
    swReady = false
  }
  const sub = await ensureReminderPushSubscription(['smart_reminder'], { appVersion: version }).catch(() => null)
  return {
    app: 'AIZIO',
    version,
    commit,
    deviceHint: hints.device,
    osHint: hints.os,
    browser: hints.browser,
    standalone:
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    notificationPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    serviceWorkerReady: swReady,
    subscriptionPresent: Boolean(sub?.record),
    serverHealthOk: health.ok,
    scheduleIdMasked: null,
    timingsMs: { health: Math.round(performance.now() - t0) },
    lastError: health.ok ? null : health.error || `http_${health.status}`,
    lastReceivedAt: localStorage.getItem(LAST_RX_KEY),
    generatedAt: new Date().toISOString(),
    statusNote: '실기기 검증 대기',
  }
}

export async function scheduleTestReminder(minutes: number): Promise<{
  ok: boolean
  reminderId: string
  serverScheduleId?: string
  message: string
  errorCode?: string
}> {
  const identity = ensureGuestIdentity()
  const reminderId = `test_${Date.now()}`
  const when = new Date(Date.now() + minutes * 60_000).toISOString()
  const bodies = buildNotificationBodies('simple', '테스트 알림')
  await ensureReminderPushSubscription(['smart_reminder'])
  const res = await scheduleReminderOnServer({
    reminderId,
    userId: identity.userId,
    deviceIds: [identity.deviceId],
    scheduledAt: when,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    title: bodies.title,
    body: bodies.body,
    privacyMode: 'simple',
    data: { type: 'reminder', route: '/?view=chat', entityId: reminderId },
  })
  if (res.ok) {
    try {
      localStorage.setItem('aizio.push.lastTestReminderId.v1', reminderId)
      if (res.serverScheduleId) localStorage.setItem('aizio.push.lastTestScheduleId.v1', res.serverScheduleId)
    } catch {
      /* ignore */
    }
  }
  return {
    ok: res.ok,
    reminderId,
    serverScheduleId: res.serverScheduleId,
    message: res.message,
    errorCode: res.errorCode,
  }
}

export async function updateLastTestReminder(minutes: number): Promise<{ ok: boolean; message: string }> {
  const reminderId = localStorage.getItem('aizio.push.lastTestReminderId.v1')
  const serverScheduleId = localStorage.getItem('aizio.push.lastTestScheduleId.v1') || undefined
  if (!reminderId) return { ok: false, message: '최근 테스트 예약 없음' }
  const identity = ensureGuestIdentity()
  const bodies = buildNotificationBodies('simple', '테스트 알림')
  const res = await updateReminderOnServer({
    reminderId,
    userId: identity.userId,
    serverScheduleId,
    deviceIds: [identity.deviceId],
    scheduledAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    title: bodies.title,
    body: bodies.body,
    privacyMode: 'simple',
    data: { type: 'reminder', route: '/?view=chat', entityId: reminderId },
  })
  return { ok: res.ok, message: res.message }
}

export async function cancelLastTestReminder(): Promise<{ ok: boolean; message: string }> {
  const reminderId = localStorage.getItem('aizio.push.lastTestReminderId.v1')
  if (!reminderId) return { ok: false, message: '최근 테스트 예약 없음' }
  const identity = ensureGuestIdentity()
  const res = await cancelReminderOnServer({
    reminderId,
    userId: identity.userId,
    serverScheduleId: localStorage.getItem('aizio.push.lastTestScheduleId.v1') || undefined,
  })
  return { ok: res.ok, message: res.message }
}

export async function requestPermissionAndSubscribe(version: string): Promise<{ ok: boolean; message: string }> {
  if (!canUseWebPush()) return { ok: false, message: 'Web Push 미지원' }
  const perm = await ensureChatNotificationPermission()
  if (perm !== 'granted') return { ok: false, message: '알림 권한이 필요합니다' }
  if (!getPushServerStatus().configured) return { ok: false, message: '푸시 서버 URL이 없습니다' }
  const sub = await ensureReminderPushSubscription(['smart_reminder'], { appVersion: version })
  return { ok: sub.ok && sub.serverSynced, message: sub.message }
}

export { mask as maskScheduleId }
export { unsubscribeReminderPush }
