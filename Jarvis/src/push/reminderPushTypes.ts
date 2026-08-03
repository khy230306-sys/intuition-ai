/**
 * API contracts for closed-app personal reminder push.
 * Client can subscribe; delivery requires a server (not claimed complete).
 */

export type ReminderPushChannel = 'smart_reminder' | 'chat_family' | 'chat_friends'

export type ReminderPushSubscriptionRecord = {
  userId: string
  deviceId: string
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
  channels: ReminderPushChannel[]
  timezone: string
  createdAt: string
  updatedAt: string
  /** Server ack — null until a push backend exists. */
  serverRegisteredAt: string | null
}

/** POST /v1/push/subscriptions */
export type UpsertSubscriptionRequest = {
  userId: string
  deviceId: string
  subscription: {
    endpoint: string
    expirationTime?: number | null
    keys: { p256dh: string; auth: string }
  }
  channels: ReminderPushChannel[]
  timezone: string
}

export type UpsertSubscriptionResponse = {
  ok: boolean
  subscriptionId?: string
  message: string
}

/** Server-side schedule row (schema only until backend exists). */
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

/** POST /v1/reminders/schedule */
export type ScheduleReminderPushRequest = {
  userId: string
  reminderId: string
  fireAt: string
  timezone: string
  title: string
  body: string
  dedupeKey: string
}

/** POST /v1/reminders/cancel */
export type CancelReminderPushRequest = {
  userId: string
  reminderId: string
  dedupeKey?: string
}

/** Push payload delivered to service worker */
export type ReminderPushPayload = {
  title: string
  body: string
  kind: 'reminder'
  view: 'chat' | 'life'
  reminderId?: string
  tag?: string
}

export type PushServerStatus = {
  configured: boolean
  baseUrl: string | null
  reason: string
}

export const REMINDER_PUSH_API = {
  upsertSubscription: 'POST /v1/push/subscriptions',
  deleteSubscription: 'DELETE /v1/push/subscriptions',
  schedule: 'POST /v1/reminders/schedule',
  cancel: 'POST /v1/reminders/cancel',
  listFailed: 'GET /v1/push/failures',
} as const
