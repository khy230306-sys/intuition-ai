/**
 * Calendar / reminder write — REAL localStorage + optional local alarm.
 */

import { parseScheduleDateTime } from '../../smartReminder/datetime'
import { addReminder, loadReminders } from '../../storage'
import { ensureNotificationPermission, scheduleAlarm } from '../../notify'
import type { EngineCalendarWrite, EnginePlaceCandidate } from '../types'

export async function writeCalendarFromSelection(opts: {
  utterance: string
  selected: EnginePlaceCandidate
  city?: string
}): Promise<{ ok: true; write: EngineCalendarWrite } | { ok: false; message: string }> {
  const when = parseScheduleDateTime(opts.utterance)
  if (!when) {
    return {
      ok: false,
      message: '언제로 잡을까요? 예: 「토요일 오후 2시」',
    }
  }
  if (when.past) {
    return {
      ok: false,
      message: `「${when.label}」은(는) 이미 지난 시간이에요. 다른 시간을 말해 주세요.`,
    }
  }

  const title = opts.city
    ? `${opts.selected.title} (${opts.city})`
    : opts.selected.title

  const item = addReminder(title, when.label, when.whenAt)
  try {
    await ensureNotificationPermission()
    scheduleAlarm(title, when.label, when.whenAt)
  } catch {
    /* reminder still saved */
  }

  const verified = loadReminders().some((r) => r.id === item.id && r.text === title)
  return {
    ok: true,
    write: {
      title,
      whenAt: when.whenAt,
      whenLabel: when.label,
      reminderId: item.id,
      verified,
    },
  }
}

export function formatCalendarReply(write: EngineCalendarWrite): string {
  const verify = write.verified
    ? '저장을 확인했습니다.'
    : '저장 요청은 보냈지만 목록 확인에 실패했습니다. 일정 화면에서 한 번 확인해 주세요.'
  return [
    '【일정 등록】',
    `「${write.title}」`,
    `시간: ${write.whenLabel}`,
    verify,
  ].join('\n')
}
