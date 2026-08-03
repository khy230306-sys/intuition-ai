/**
 * Push API contract (v1) — client + push-server template share these shapes.
 * Closed-app delivery requires a running push server with VAPID secrets.
 */

export type ReminderPushChannel = 'smart_reminder' | 'chat_family' | 'chat_friends'

export type NotifyPrivacyMode = 'full' | 'simple' | 'hidden'

export type ReminderPushSubscriptionRecord = {
  userId: string
  deviceId: string
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
  channels: ReminderPushChannel[]
  timezone: string
  locale?: string
  appVersion?: string
  createdAt: string
  updatedAt: string
  serverRegisteredAt: string | null
}

/** POST /v1/push/subscribe */
export type PushSubscribeRequest = {
  userId: string
  deviceId: string
  subscription: {
    endpoint: string
    expirationTime?: number | null
    keys: { p256dh: string; auth: string }
  }
  timezone: string
  locale?: string
  appVersion?: string
  channels?: ReminderPushChannel[]
}

/** POST /v1/push/unsubscribe */
export type PushUnsubscribeRequest = {
  userId: string
  deviceId: string
  endpoint?: string
}

/** POST /v1/reminders/schedule */
export type ScheduleReminderPushRequest = {
  reminderId: string
  userId: string
  deviceIds?: string[]
  scheduledAt: string
  timezone: string
  title: string
  body: string
  privacyMode: NotifyPrivacyMode
  data: {
    type: 'reminder'
    route: string
    entityId: string
  }
}

/** POST /v1/reminders/update */
export type UpdateReminderPushRequest = ScheduleReminderPushRequest & {
  serverScheduleId?: string
}

/** POST /v1/reminders/cancel */
export type CancelReminderPushRequest = {
  reminderId: string
  userId: string
  serverScheduleId?: string
}

/** GET /v1/reminders/status/:id response */
export type ReminderPushStatusResponse = {
  ok: boolean
  reminderId: string
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed' | 'pending' | 'unknown'
  serverScheduleId?: string
  scheduledAt?: string
  lastError?: string
}

export type ReminderPushPayload = {
  title: string
  body: string
  kind: 'reminder'
  view: 'chat' | 'life'
  reminderId?: string
  tag?: string
  privacyMode?: NotifyPrivacyMode
  route?: string
}

export type ChatPushPayload = {
  title: string
  body: string
  kind: 'family' | 'friends'
  view: 'family' | 'friends'
  tag?: string
}

export type PushServerStatus = {
  configured: boolean
  baseUrl: string | null
  reason: string
}

export const REMINDER_PUSH_API = {
  subscribe: 'POST /v1/push/subscribe',
  unsubscribe: 'POST /v1/push/unsubscribe',
  schedule: 'POST /v1/reminders/schedule',
  update: 'POST /v1/reminders/update',
  cancel: 'POST /v1/reminders/cancel',
  status: 'GET /v1/reminders/status/:id',
} as const

/** @deprecated use PushSubscribeRequest */
export type UpsertSubscriptionRequest = PushSubscribeRequest
/** @deprecated */
export type UpsertSubscriptionResponse = { ok: boolean; subscriptionId?: string; message: string }
/** @deprecated */
export type ScheduledReminderPush = {
  id: string
  userId: string
  reminderId: string
  fireAt: string
  timezone: string
  title: string
  body: string
  dedupeKey: string
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed' | 'expired'
  lastError?: string
}

export function buildNotificationBodies(
  privacyMode: NotifyPrivacyMode,
  fullTitle: string,
): { title: string; body: string } {
  if (privacyMode === 'hidden') {
    return { title: 'AIZIO', body: 'AIZIO 알림이 있습니다.' }
  }
  if (privacyMode === 'simple') {
    return { title: 'AIZIO', body: '예약된 일정 시간입니다.' }
  }
  return { title: 'AIZIO', body: `${fullTitle} 시간입니다.` }
}

/** Safe relative app route only */
export function sanitizePushRoute(route: unknown): string {
  const r = String(route || '/').trim()
  if (!r.startsWith('/') || r.startsWith('//') || /[:\\]/.test(r) || r.includes('..')) {
    return '/?view=chat'
  }
  return r.slice(0, 120)
}
