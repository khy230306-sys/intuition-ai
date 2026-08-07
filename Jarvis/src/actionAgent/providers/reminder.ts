import { addReminder } from '../../storage'
import { scheduleAlarm, formatWhenAt } from '../../notify'
import type { ActionResult } from '../types'
import type { ReminderProvider } from './types'

export const defaultReminderProvider: ReminderProvider = {
  id: 'aizio-reminder-local',
  async createFromSelection(req): Promise<ActionResult> {
    if (!req.allowWrite) {
      return {
        ok: false,
        state: 'needs_confirmation',
        message: '알림을 만들려면 확인해 주세요.',
        errorCode: 'NEEDS_CONFIRM',
      }
    }
    const offset = req.offsetMinutes ?? req.slots.reminderOffsetMinutes ?? 120
    const baseLabel = req.result?.title || req.slots.destination || '출발'
    const body = `${baseLabel} ${offset}분 전 알림`
    const dep = req.slots.departureDate?.resolvedDate
    if (dep) {
      // Schedule relative to noon on departure day minus offset (best-effort local)
      const whenAt = new Date(`${dep}T12:00:00`).getTime() - offset * 60_000
      if (Number.isFinite(whenAt) && whenAt > Date.now()) {
        const alarm = scheduleAlarm('AIZIO 알림', body, whenAt)
        return {
          ok: true,
          state: 'success',
          message: `알림 예약: ${body}\n시간: ${formatWhenAt(alarm.whenAt)}`,
          data: { whenAt: alarm.whenAt },
        }
      }
    }
    const item = addReminder(body)
    return {
      ok: true,
      state: 'success',
      message: `알림/할 일로 저장했어요: ${item.text} (정확한 시각은 출발 시각이 확정되면 다시 맞춰요)`,
      data: { id: item.id },
    }
  },
}

let injected: ReminderProvider | null = null
export function getReminderProvider(): ReminderProvider {
  return injected || defaultReminderProvider
}
export function setReminderProviderForTests(p: ReminderProvider | null): void {
  injected = p
}
