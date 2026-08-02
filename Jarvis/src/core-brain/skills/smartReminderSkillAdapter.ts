import { handleSmartReminderText, wantsSmartReminder } from '../../smartReminder'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  const text = ctx.request.normalizedText || ctx.request.text
  return (
    wantsSmartReminder(text) ||
    [
      'create_reminder',
      'update_reminder',
      'cancel_reminder',
      'list_reminders',
      'snooze_reminder',
      'mark_reminder_complete',
      'ask_person_schedule',
    ].includes(ctx.intent)
  )
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const text = ctx.request.normalizedText || ctx.request.text
  const reply = await handleSmartReminderText(text)
  if (!reply?.handled) {
    return {
      success: false,
      status: 'unavailable',
      data: {},
      message: '일정·알림으로 처리하지 못했어요.',
      error: { code: 'no_skill_available' },
    }
  }
  let message = reply.text
  if (reply.needsPermissionHint && typeof Notification !== 'undefined' && Notification.permission === 'default') {
    message = `정확한 시간에 알려드리려면 알림 권한이 필요합니다.\n${message}`
  }
  return {
    success: true,
    status: reply.reminder?.notificationStatus === 'permission_denied' ? 'partial' : 'completed',
    data: { reminderId: reply.reminder?.id },
    message,
    speakText: reply.speakText || message.slice(0, 120),
    brainPatch: { text: message, speak: true },
    error: null,
  }
}
