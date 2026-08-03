/**
 * Sync smart reminders to push server for closed-app delivery.
 * Local reminder always wins — server failure never deletes local data.
 */

import { ensureGuestIdentity } from '../account'
import { canUseWebPush } from '../chatNotify'
import {
  cancelReminderOnServer,
  ensureReminderPushSubscription,
  getPushServerStatus,
  scheduleReminderOnServer,
  updateReminderOnServer,
} from '../push'
import { buildNotificationBodies } from '../push/reminderPushTypes'
import { loadSettings } from '../storage'
import type { SmartReminder } from './types'
import { saveSmartReminder } from './storage'
import { resolveReminderPrivacyMode } from './privacy'

export async function syncReminderPushSchedule(reminder: SmartReminder): Promise<SmartReminder> {
  const next = { ...reminder }

  if (next.status === 'cancelled' || next.status === 'completed' || next.status === 'missed') {
    return next
  }
  if (next.scheduledAtMs <= Date.now()) {
    next.pushScheduleStatus = 'not_applicable'
    saveSmartReminder(next)
    return next
  }

  const server = getPushServerStatus()
  if (!server.configured) {
    next.pushScheduleStatus = 'server_unconfigured'
    next.pushSyncErrorCode = 'server_unconfigured'
    next.lastPushSyncAt = new Date().toISOString()
    saveSmartReminder(next)
    return next
  }

  if (!canUseWebPush()) {
    next.pushScheduleStatus = 'unsupported'
    next.pushSyncErrorCode = 'push_unsupported'
    next.lastPushSyncAt = new Date().toISOString()
    saveSmartReminder(next)
    return next
  }

  const sub = await ensureReminderPushSubscription(['smart_reminder'])
  if (!sub.ok || !sub.record) {
    next.pushScheduleStatus =
      sub.errorCode === 'permission_or_subscribe_failed' ? 'permission_denied' : 'failed'
    next.pushSyncErrorCode = sub.errorCode || 'subscribe_failed'
    next.lastPushSyncAt = new Date().toISOString()
    saveSmartReminder(next)
    return next
  }

  const privacy = resolveReminderPrivacyMode(next, loadSettings())
  next.previewMode = privacy
  const bodies = buildNotificationBodies(privacy, next.title)
  const identity = ensureGuestIdentity()
  const payload = {
    reminderId: next.id,
    userId: identity.userId,
    deviceIds: [identity.deviceId],
    scheduledAt: next.scheduledAt,
    timezone: next.timezone,
    title: bodies.title,
    body: bodies.body,
    privacyMode: privacy,
    data: {
      type: 'reminder' as const,
      route: '/?view=chat',
      entityId: next.id,
    },
  }

  next.pushScheduleStatus = 'pending'
  saveSmartReminder(next)

  const result = next.serverScheduleId
    ? await updateReminderOnServer({ ...payload, serverScheduleId: next.serverScheduleId })
    : await scheduleReminderOnServer(payload)

  if (result.ok) {
    next.pushScheduleStatus = 'synced'
    next.serverScheduleId = result.serverScheduleId || next.serverScheduleId || next.id
    next.pushSyncErrorCode = null
  } else {
    next.pushScheduleStatus = result.errorCode === 'server_unconfigured' ? 'server_unconfigured' : 'failed'
    next.pushSyncErrorCode = result.errorCode || 'schedule_failed'
  }
  next.lastPushSyncAt = new Date().toISOString()
  saveSmartReminder(next)
  return next
}

export async function syncReminderPushCancel(reminder: SmartReminder): Promise<SmartReminder> {
  const next = { ...reminder }
  const identity = ensureGuestIdentity()
  const server = getPushServerStatus()
  if (!server.configured) {
    next.pushScheduleStatus = 'cancelled'
    next.pushSyncErrorCode = null
    next.lastPushSyncAt = new Date().toISOString()
    saveSmartReminder(next)
    return next
  }
  const res = await cancelReminderOnServer({
    reminderId: next.id,
    userId: identity.userId,
    serverScheduleId: next.serverScheduleId || undefined,
  })
  next.pushScheduleStatus = 'cancelled'
  next.pushSyncErrorCode = res.ok ? null : res.errorCode || 'cancel_failed'
  next.lastPushSyncAt = new Date().toISOString()
  saveSmartReminder(next)
  return next
}
