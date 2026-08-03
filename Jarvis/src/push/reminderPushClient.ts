/**
 * Client-side reminder push subscription structure.
 * Does NOT claim closed-app delivery without a configured push server.
 */

import { ensureGuestIdentity } from '../account'
import { canUseWebPush, ensureChatNotificationPermission, type StoredPushSubscription } from '../chatNotify'
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '../vapid'
import type {
  PushServerStatus,
  ReminderPushChannel,
  ReminderPushSubscriptionRecord,
  UpsertSubscriptionRequest,
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
        reason: '푸시 서버 URL이 없습니다. 앱 종료 상태 개인 알림은 서버 예약 발송이 필요합니다.',
      }
    }
    return { configured: true, baseUrl: base, reason: '서버 URL 설정됨 — 등록 API 호출 가능' }
  } catch {
    return { configured: false, baseUrl: null, reason: 'storage 오류' }
  }
}

/** Settings / future admin — empty by default. */
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

export async function ensureReminderPushSubscription(
  channels: ReminderPushChannel[] = ['smart_reminder'],
): Promise<{
  ok: boolean
  record: ReminderPushSubscriptionRecord | null
  serverSynced: boolean
  message: string
}> {
  if (!canUseWebPush()) {
    return {
      ok: false,
      record: null,
      serverSynced: false,
      message: '이 브라우저는 Web Push를 지원하지 않습니다.',
    }
  }
  const perm = await ensureChatNotificationPermission()
  if (perm !== 'granted') {
    return {
      ok: false,
      record: null,
      serverSynced: false,
      message: '알림 권한이 필요합니다. (사용자 승인 항목)',
    }
  }

  let stored: StoredPushSubscription | null = null
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
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, record: null, serverSynced: false, message: '구독 키를 읽지 못했습니다.' }
    }
    stored = {
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }
  } catch {
    return {
      ok: false,
      record: null,
      serverSynced: false,
      message: '푸시 구독에 실패했습니다. (실기기·권한 확인 필요)',
    }
  }

  const identity = ensureGuestIdentity()
  const now = new Date().toISOString()
  const prev = loadReminderPushSubscription()
  const record: ReminderPushSubscriptionRecord = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    endpoint: stored.endpoint,
    expirationTime: stored.expirationTime,
    keys: stored.keys,
    channels: Array.from(new Set([...(prev?.channels || []), ...channels])),
    timezone: timezone(),
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    serverRegisteredAt: prev?.serverRegisteredAt || null,
  }
  saveReminderPushSubscription(record)

  const server = getPushServerStatus()
  if (!server.configured || !server.baseUrl) {
    return {
      ok: true,
      record,
      serverSynced: false,
      message:
        '기기 구독은 저장했습니다. 푸시 서버가 없어 앱 종료 상태 개인 알림 예약 발송은 아직 완성되지 않았습니다.',
    }
  }

  const body: UpsertSubscriptionRequest = {
    userId: record.userId,
    deviceId: record.deviceId,
    subscription: {
      endpoint: record.endpoint,
      expirationTime: record.expirationTime,
      keys: record.keys,
    },
    channels: record.channels,
    timezone: record.timezone,
  }

  try {
    const res = await fetch(`${server.baseUrl}/v1/push/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return {
        ok: true,
        record,
        serverSynced: false,
        message: `서버 등록 실패 (${res.status}). 로컬 구독만 유지합니다.`,
      }
    }
    const synced = { ...record, serverRegisteredAt: new Date().toISOString() }
    saveReminderPushSubscription(synced)
    return { ok: true, record: synced, serverSynced: true, message: '서버에 구독을 등록했습니다.' }
  } catch {
    return {
      ok: true,
      record,
      serverSynced: false,
      message: '서버에 연결하지 못했습니다. 로컬 구독만 유지합니다.',
    }
  }
}

export function reminderPushReadinessSummary(): string {
  const server = getPushServerStatus()
  const sub = loadReminderPushSubscription()
  const lines = [
    '【앱 종료 상태 알림】',
    `- Web Push 지원: ${canUseWebPush() ? '예' : '아니오'}`,
    `- 로컬 구독: ${sub ? '있음' : '없음'}`,
    `- 푸시 서버: ${server.configured ? server.baseUrl : '미설정'}`,
    `- 서버 동기화: ${sub?.serverRegisteredAt ? sub.serverRegisteredAt : '안 됨'}`,
    server.configured
      ? '- 상태: 서버 URL이 있으면 구독 등록을 시도합니다.'
      : '- 상태: 구조만 준비됨 — 종료 상태 개인 알림 완성으로 보지 마세요.',
  ]
  return lines.join('\n')
}
