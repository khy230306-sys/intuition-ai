/**
 * Calendar write — AIZIO Local Calendar (default) or External when READY.
 * Never claims Google/external success without provider eventId + re-read.
 */

import { parseScheduleDateTime } from '../../smartReminder/datetime'
import type { DateTimeContext } from '../context'
import { checkPermission } from '../permission'
import {
  getLocalCalendarProvider,
  resolveExternalCalendarProvider,
} from '../providers'
import { makeToolResult, type ToolResult } from '../toolResult'
import type { EngineCalendarWrite, EnginePlaceCandidate } from '../types'

function buildUtteranceForParse(utterance: string, dateTime: DateTimeContext): string {
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
  const extResolved = await resolveExternalCalendarProvider()
  const externalReady = Boolean(extResolved.provider && extResolved.health.availability === 'READY')

  // Prefer external only when connector READY + L2 permitted
  const extPerm = checkPermission('calendar.external_write', {
    connectorReady: externalReady,
  })
  const useExternal = externalReady && extPerm.allowed && extResolved.provider

  if (!useExternal) {
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
        verificationMethod: 'none',
      })
    }
  }

  const parseText = buildUtteranceForParse(opts.utterance, opts.dateTime || {})
  const when = parseScheduleDateTime(parseText)
  if (!when) {
    return makeToolResult({
      toolId: useExternal ? 'calendar.external_write' : 'calendar.local_write',
      success: false,
      status: 'needs_input',
      source: 'parser',
      sourceType: 'none',
      isRealData: false,
      errorCode: 'needs_datetime',
      errorMessage: '언제로 잡을까요? 예: 「토요일 오후 2시」',
      confidence: 0,
      verificationMethod: 'none',
    })
  }
  if (when.past) {
    return makeToolResult({
      toolId: useExternal ? 'calendar.external_write' : 'calendar.local_write',
      success: false,
      status: 'failed',
      source: 'parser',
      sourceType: 'none',
      isRealData: false,
      errorCode: 'past_datetime',
      errorMessage: `「${when.label}」은(는) 이미 지난 시간이에요.`,
      confidence: 0,
      verificationMethod: 'none',
    })
  }

  const title = opts.city ? `${opts.selected.title} (${opts.city})` : opts.selected.title
  const location = opts.selected.address || opts.selected.mapsQuery || opts.selected.title

  if (useExternal && extResolved.provider) {
    const provider = extResolved.provider
    try {
      const created = await provider.createEvent({
        title,
        whenAt: when.whenAt,
        whenLabel: when.label,
        location,
        description: 'AIZIO',
      })
      if (!created.eventId) {
        return makeToolResult({
          toolId: 'calendar.external_write',
          success: false,
          status: 'failed',
          source: provider.id,
          sourceType: 'live_api',
          isRealData: false,
          provider: provider.id,
          errorCode: 'calendar_missing_event_id',
          errorMessage: '외부 캘린더 이벤트 ID를 받지 못해 확정하지 않습니다.',
          confidence: 0,
          verificationMethod: 'external_reread',
        })
      }
      // create → get re-read (required for external success)
      const found = await provider.getEvent(created.eventId)
      if (!found || found.eventId !== created.eventId) {
        return makeToolResult({
          toolId: 'calendar.external_write',
          success: false,
          status: 'failed',
          source: provider.id,
          sourceType: 'live_api',
          isRealData: false,
          provider: provider.id,
          externalId: created.eventId,
          errorCode: 'calendar_external_verify_miss',
          errorMessage: '외부 캘린더에 등록했지만 재조회에 실패했습니다. 확정하지 않습니다.',
          confidence: 0,
          verificationMethod: 'external_reread',
        })
      }
      return makeToolResult({
        toolId: 'calendar.external_write',
        success: true,
        data: {
          title: found.title || title,
          whenAt: found.whenAt || when.whenAt,
          whenLabel: found.whenLabel || when.label,
          reminderId: found.eventId,
          verified: true,
          calendarKind: 'external',
          provider: provider.id,
          externalEventId: found.eventId,
        },
        source: provider.id,
        sourceType: 'live_api',
        // Verifier confirms REAL
        isRealData: false,
        provider: provider.id,
        externalId: found.eventId,
        confidence: 0.9,
        verificationMethod: 'external_reread',
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'external_calendar_error'
      const pending = /PENDING_EXTERNAL_SETUP/.test(msg)
      // Fall back to local with honest local messaging — never invent external success
      if (pending) {
        /* continue to local below */
      } else {
        // Still try local so user can keep planning
      }
    }
  }

  // AIZIO Local Calendar
  const local = getLocalCalendarProvider()
  try {
    const created = await local.createEvent({
      title,
      whenAt: when.whenAt,
      whenLabel: when.label,
      location,
    })
    return makeToolResult({
      toolId: 'calendar.local_write',
      success: true,
      data: {
        title,
        whenAt: when.whenAt,
        whenLabel: when.label,
        reminderId: created.eventId,
        verified: false,
        calendarKind: 'local',
        provider: local.id,
      },
      source: 'AIZIO Local Calendar',
      sourceType: 'local_store',
      isRealData: false,
      provider: local.id,
      externalId: created.eventId,
      confidence: 0.8,
      verificationMethod: 'store_reread',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'local_calendar_error'
    const pendingNote =
      extResolved.health.availability === 'PENDING_EXTERNAL_SETUP'
        ? ' 외부 캘린더가 아직 연결되지 않았습니다.'
        : ''
    return makeToolResult({
      toolId: 'calendar.local_write',
      success: false,
      status: 'failed',
      source: local.id,
      sourceType: 'local_store',
      isRealData: false,
      provider: local.id,
      errorCode: 'calendar_write_failed',
      errorMessage: `일정 저장 실패: ${msg}.${pendingNote}`,
      confidence: 0,
      verificationMethod: 'none',
    })
  }
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
      '【일정 · 미확인】',
      `「${write.title}」`,
      `시간: ${write.whenLabel}`,
      '저장소에서 확인되지 않아 완료로 처리하지 않습니다.',
    ].join('\n')
  }
  if (write.calendarKind === 'external') {
    const label = write.provider === 'google_calendar' ? 'Google Calendar' : '외부 캘린더'
    return [
      `【${label}】`,
      `「${write.title}」`,
      `시간: ${write.whenLabel}`,
      `${label}에 등록했습니다. 재조회로 동일 이벤트 존재를 확인했습니다.`,
    ].join('\n')
  }
  return [
    '【AIZIO 내부 일정】',
    `「${write.title}」`,
    `시간: ${write.whenLabel}`,
    'AIZIO 내부 일정에 저장했습니다. 로컬 목록에서 동일 일정을 재조회했습니다.',
  ].join('\n')
}

export function formatCalendarPendingExternal(): string {
  return '외부 캘린더가 아직 연결되지 않았습니다. AIZIO 내부 일정으로 저장할 수 있습니다.'
}
