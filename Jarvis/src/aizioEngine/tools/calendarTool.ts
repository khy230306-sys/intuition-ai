/**
 * Calendar local write (Permission LEVEL 1) — ToolResult + re-read verify outside.
 */

import { parseScheduleDateTime } from '../../smartReminder/datetime'
import { addReminder } from '../../storage'
import { ensureNotificationPermission, scheduleAlarm } from '../../notify'
import type { DateTimeContext } from '../context'
import { checkPermission } from '../permission'
import { makeToolResult, type ToolResult } from '../toolResult'
import type { EngineCalendarWrite, EnginePlaceCandidate } from '../types'

function buildUtteranceForParse(utterance: string, dateTime: DateTimeContext): string {
  // Prefer explicit utterance; if thin (「거기 일정 넣어줘」) splice stored hints
  if (/(오전|오후|\d+\s*시|요일|내일|모레|주말)/.test(utterance)) return utterance
  const parts = [dateTime.dayHint, dateTime.timeHint, utterance].filter(Boolean)
  return parts.join(' ')
}

export async function runCalendarWriteTool(opts: {
  utterance: string
  selected: EnginePlaceCandidate
  city?: string
  dateTime?: DateTimeContext
}): Promise<ToolResult<EngineCalendarWrite>> {
  const perm = checkPermission('calendar.local_write')
  if (!perm.allowed) {
    return makeToolResult({
      toolId: 'calendar.local_write',
      success: false,
      status: perm.status === 'pending_external_setup' ? 'pending_external_setup' : 'denied',
      source: 'permission',
      sourceType: 'none',
      isRealData: false,
      errorCode: perm.status.toUpperCase(),
      errorMessage: perm.reason,
      confidence: 0,
    })
  }

  // External calendar sync is LEVEL 2 — never claim it
  const external = checkPermission('calendar.external_write')
  void external

  const parseText = buildUtteranceForParse(opts.utterance, opts.dateTime || {})
  const when = parseScheduleDateTime(parseText)
  if (!when) {
    return makeToolResult({
      toolId: 'calendar.local_write',
      success: false,
      status: 'needs_input',
      source: 'parser',
      sourceType: 'none',
      isRealData: false,
      errorCode: 'needs_datetime',
      errorMessage: '언제로 잡을까요? 예: 「토요일 오후 2시」',
      confidence: 0,
    })
  }
  if (when.past) {
    return makeToolResult({
      toolId: 'calendar.local_write',
      success: false,
      status: 'failed',
      source: 'parser',
      sourceType: 'none',
      isRealData: false,
      errorCode: 'past_datetime',
      errorMessage: `「${when.label}」은(는) 이미 지난 시간이에요.`,
      confidence: 0,
    })
  }

  const title = opts.city ? `${opts.selected.title} (${opts.city})` : opts.selected.title
  const item = addReminder(title, when.label, when.whenAt)
  try {
    await ensureNotificationPermission()
    scheduleAlarm(title, when.label, when.whenAt)
  } catch {
    /* reminder still in local store */
  }

  return makeToolResult({
    toolId: 'calendar.local_write',
    success: true,
    data: {
      title,
      whenAt: when.whenAt,
      whenLabel: when.label,
      reminderId: item.id,
      verified: false, // verifier must re-read
    },
    source: 'localStorage',
    sourceType: 'local_store',
    isRealData: true,
    confidence: 0.8,
  })
}

/** @deprecated */
export async function writeCalendarFromSelection(opts: {
  utterance: string
  selected: EnginePlaceCandidate
  city?: string
  dateTime?: DateTimeContext
}): Promise<{ ok: true; write: EngineCalendarWrite } | { ok: false; message: string }> {
  const r = await runCalendarWriteTool(opts)
  if (!r.success || !r.data) {
    return { ok: false, message: r.errorMessage || '일정 저장 실패' }
  }
  return { ok: true, write: r.data }
}

export function formatCalendarReply(write: EngineCalendarWrite, verified: boolean): string {
  if (!verified) {
    return [
      '【일정 등록 · 미확인】',
      `「${write.title}」`,
      `시간: ${write.whenLabel}`,
      '저장소에서 확인되지 않아 완료로 처리하지 않습니다.',
    ].join('\n')
  }
  return [
    '【일정 등록】',
    `「${write.title}」`,
    `시간: ${write.whenLabel}`,
    '로컬 일정에 저장했고 목록에서 확인했습니다. (외부 캘린더 동기화 아님)',
  ].join('\n')
}
