/**
 * Client for reminder push subscribe + schedule APIs.
 * Without push server URL, local subscription may still be saved; sync stays pending/failed.
 */

import { ensureGuestIdentity } from '../account'
import { canUseWebPush, ensureChatNotificationPermission, type StoredPushSubscription } from '../chatNotify'
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '../vapid'
import type {
  CancelReminderPushRequest,
  PushSubscribeRequest,
  PushServerStatus,
  ReminderPushChannel,
  ReminderPushSubscriptionRecord,
  ReminderPushStatusResponse,
  ScheduleReminderPushRequest,
  UpdateReminderPushRequest,
} from './reminderPushTypes'

const REMINDER_SUB_KEY = 'aizio.push.reminderSubscription.v1'
const PUSH_SERVER_URL_KEY = 'aizio.push.serverBaseUrl.v1'

export function getPushServerStatus(): PushServerStatus {
  try {
    const base = localStorage.getItem(PUSH_SERVER_URL_KEY)?.trim() || null
    if (!base) {
      return {
        configured: false,
        baseUrl: null,
        reason: '푸시 서버 URL 미설정 — 앱 종료 개인 알림 예약 불가',
      }
    }
    return { configured: true, baseUrl: base, reason: '서버 URL 설정됨' }
  } catch {
    return { configured: false, baseUrl: null, reason: 'storage 오류' }
  }
}

export function setPushServerBaseUrl(url: string | null): void {
  if (!url) localStorage.removeItem(PUSH_SERVER_URL_KEY)
  else localStorage.setItem(PUSH_SERVER_URL_KEY, url.replace(/\/$/, ''))
}

export function loadReminderPushSubscription(): ReminderPushSubscriptionRecord | null {
  try {
    const raw = localStorage.getItem(REMINDER_SUB_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReminderPushSubscriptionRecord
  } catch {
    return null
  }
}

function saveReminderPushSubscription(rec: ReminderPushSubscriptionRecord | null): void {
  if (!rec) localStorage.removeItem(REMINDER_SUB_KEY)
  else localStorage.setItem(REMINDER_SUB_KEY, JSON.stringify(rec))
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

async function obtainBrowserSubscription(): Promise<StoredPushSubscription | null> {
  if (!canUseWebPush()) return null
  const perm = await ensureChatNotificationPermission()
  if (perm !== 'granted') return null
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
    return {
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }
  } catch {
    return null
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const server = getPushServerStatus()
  if (!server.configured || !server.baseUrl) {
    return { ok: false, status: 0, data: null, error: 'server_unconfigured' }
  }
  try {
    const res = await fetch(`${server.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let data: T | null = null
    try {
      data = (await res.json()) as T
    } catch {
      data = null
    }
    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : `http_${res.status}` }
  } catch {
    return { ok: false, status: 0, data: null, error: 'network_error' }
  }
}

export async function ensureReminderPushSubscription(
  channels: ReminderPushChannel[] = ['smart_reminder'],
  opts?: { appVersion?: string },
): Promise<{
  ok: boolean
  record: ReminderPushSubscriptionRecord | null
  serverSynced: boolean
  message: string
  errorCode?: string
}> {
  if (!canUseWebPush()) {
    return { ok: false, record: null, serverSynced: false, message: 'Web Push 미지원', errorCode: 'push_unsupported' }
  }
  const stored = await obtainBrowserSubscription()
  if (!stored) {
    return {
      ok: false,
      record: null,
      serverSynced: false,
      message: '알림 권한 또는 구독 실패',
      errorCode: 'permission_or_subscribe_failed',
    }
  }

  const identity = ensureGuestIdentity()
  const now = new Date().toISOString()
  const prev = loadReminderPushSubscription()
  // Dedupe: same endpoint → update in place
  const record: ReminderPushSubscriptionRecord = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    endpoint: stored.endpoint,
    expirationTime: stored.expirationTime,
    keys: stored.keys,
    channels: Array.from(new Set([...(prev?.channels || []), ...channels])),
    timezone: timezone(),
    locale: typeof navigator !== 'undefined' ? navigator.language : 'ko-KR',
    appVersion: opts?.appVersion,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    serverRegisteredAt: prev?.endpoint === stored.endpoint ? prev.serverRegisteredAt : null,
  }
  saveReminderPushSubscription(record)

  const body: PushSubscribeRequest = {
    userId: record.userId,
    deviceId: record.deviceId,
    subscription: {
      endpoint: record.endpoint,
      expirationTime: record.expirationTime,
      keys: record.keys,
    },
    timezone: record.timezone,
    locale: record.locale,
    appVersion: record.appVersion,
    channels: record.channels,
  }

  const res = await apiPost<{ ok?: boolean; subscriptionId?: string; message?: string }>('/v1/push/subscribe', body)
  if (!res.ok) {
    return {
      ok: true,
      record,
      serverSynced: false,
      message:
        res.error === 'server_unconfigured'
          ? '기기 구독 저장. 푸시 서버 미연결 — 종료 알림 미완성'
          : `기기 구독 저장. 서버 등록 실패 (${res.error})`,
      errorCode: res.error,
    }
  }
  const synced = { ...record, serverRegisteredAt: new Date().toISOString() }
  saveReminderPushSubscription(synced)
  return { ok: true, record: synced, serverSynced: true, message: '서버에 구독 등록됨' }
}

export async function unsubscribeReminderPush(): Promise<{ ok: boolean; message: string }> {
  const rec = loadReminderPushSubscription()
  const identity = ensureGuestIdentity()
  if (rec) {
    await apiPost('/v1/push/unsubscribe', {
      userId: identity.userId,
      deviceId: identity.deviceId,
      endpoint: rec.endpoint,
    })
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()
    }
  } catch {
    /* ignore */
  }
  saveReminderPushSubscription(null)
  return { ok: true, message: '푸시 구독 해제' }
}

export async function scheduleReminderOnServer(
  req: ScheduleReminderPushRequest,
): Promise<{ ok: boolean; serverScheduleId?: string; errorCode?: string; message: string }> {
  const res = await apiPost<{ ok?: boolean; serverScheduleId?: string; message?: string }>(
    '/v1/reminders/schedule',
    req,
  )
  if (!res.ok) {
    return {
      ok: false,
      errorCode: res.error || 'schedule_failed',
      message: res.error === 'server_unconfigured' ? '서버 미연결' : '서버 예약 실패',
    }
  }
  return {
    ok: true,
    serverScheduleId: res.data?.serverScheduleId,
    message: res.data?.message || '서버 예약 완료',
  }
}

export async function updateReminderOnServer(
  req: UpdateReminderPushRequest,
): Promise<{ ok: boolean; serverScheduleId?: string; errorCode?: string; message: string }> {
  const res = await apiPost<{ ok?: boolean; serverScheduleId?: string }>('/v1/reminders/update', req)
  if (!res.ok) {
    return { ok: false, errorCode: res.error || 'update_failed', message: '서버 수정 실패' }
  }
  return { ok: true, serverScheduleId: res.data?.serverScheduleId || req.serverScheduleId, message: '서버 수정 완료' }
}

export async function cancelReminderOnServer(
  req: CancelReminderPushRequest,
): Promise<{ ok: boolean; errorCode?: string; message: string }> {
  const res = await apiPost('/v1/reminders/cancel', req)
  if (!res.ok) {
    return { ok: false, errorCode: res.error || 'cancel_failed', message: '서버 취소 실패' }
  }
  return { ok: true, message: '서버 취소 완료' }
}

export async function fetchReminderPushStatus(reminderId: string): Promise<ReminderPushStatusResponse | null> {
  const server = getPushServerStatus()
  if (!server.configured || !server.baseUrl) return null
  try {
    const res = await fetch(`${server.baseUrl}/v1/reminders/status/${encodeURIComponent(reminderId)}`)
    if (!res.ok) return null
    return (await res.json()) as ReminderPushStatusResponse
  } catch {
    return null
  }
}

export function reminderPushReadinessSummary(): string {
  const server = getPushServerStatus()
  const sub = loadReminderPushSubscription()
  return [
    '【앱 종료 상태 알림】',
    `- Web Push: ${canUseWebPush() ? '지원' : '미지원'}`,
    `- 로컬 구독: ${sub ? '있음' : '없음'}`,
    `- 푸시 서버: ${server.configured ? server.baseUrl : '미설정'}`,
    `- 서버 동기화: ${sub?.serverRegisteredAt || '안 됨'}`,
    server.configured
      ? '- 서버 URL이 있으면 schedule/cancel을 시도합니다.'
      : '- 구조만 준비됨. 종료 상태 개인 알림 완성으로 보지 마세요.',
  ].join('\n')
}
