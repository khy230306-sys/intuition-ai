import { findByRelationCode, findRelationship, upsertRelationship } from '../relationship/storage'
import type { RelationCode } from '../relationship/types'
import { cancelAlarm, ensureNotificationPermission, scheduleAlarm } from '../notify'
import { loadSettings } from '../storage'
import { formatFriendly, parseAdvanceMinutes, parseScheduleDateTime } from './datetime'
import { parseReminderUtterance } from './parse'
import { resolveReminderPrivacyMode } from './privacy'
import { syncReminderPushCancel, syncReminderPushSchedule } from './pushSync'
import {
  createSmartReminderId,
  findDuplicate,
  getLastReminderContext,
  getSmartReminder,
  listActiveReminders,
  listForPerson,
  saveSmartReminder,
  setLastReminderContext,
  updateSmartReminder,
} from './storage'
import { formatPushScheduleLabel, type SmartReminder } from './types'

export type SmartReminderReply = {
  text: string
  speakText?: string
  handled: boolean
  needsPermissionHint?: boolean
  reminder?: SmartReminder
}

function previewBody(r: SmartReminder): string {
  const mode = resolveReminderPrivacyMode(r, loadSettings())
  if (mode === 'hidden') return 'AIZIO 알림이 있습니다.'
  if (mode === 'simple') return '예약된 일정 시간입니다.'
  return `${r.title} 시간입니다.`
}

function resolvePerson(display?: string, code?: string) {
  if (display) {
    const byAlias = findRelationship(display)
    if (byAlias) return byAlias
  }
  if (code) {
    const byCode = findByRelationCode(code as RelationCode)
    if (byCode) return byCode
    if (display) {
      return upsertRelationship({
        relationship: code as RelationCode,
        displayRelation: display,
        name: null,
        aliases: [display],
        confidence: 0.85,
      })
    }
  }
  return null
}

async function armAlarms(reminder: SmartReminder): Promise<SmartReminder> {
  // Cancel previous arms
  if (reminder.mainAlarmId) cancelAlarm(reminder.mainAlarmId)
  for (const id of reminder.advanceAlarmIds) cancelAlarm(id)

  const perm = await ensureNotificationPermission()
  if (reminder.scheduledAtMs <= Date.now()) {
    reminder.notificationStatus = 'skipped_past'
    reminder.status = 'missed'
    reminder.mainAlarmId = null
    reminder.advanceAlarmIds = []
    saveSmartReminder(reminder)
    return reminder
  }

  if (perm === 'unsupported') {
    reminder.notificationStatus = 'unsupported'
  } else if (perm === 'denied') {
    reminder.notificationStatus = 'permission_denied'
  } else {
    reminder.notificationStatus = 'pending'
  }

  const body = previewBody(reminder)
  const main = scheduleAlarm('AIZIO 알림', body, reminder.scheduledAtMs)
  reminder.mainAlarmId = main.id

  const advanceIds: string[] = []
  for (const adv of reminder.advanceAlertsMs) {
    const at = reminder.scheduledAtMs - adv
    if (at > Date.now()) {
      const a = scheduleAlarm('AIZIO 사전 알림', `${reminder.title} · ${Math.round(adv / 60000)}분 전`, at)
      advanceIds.push(a.id)
    }
  }
  reminder.advanceAlarmIds = advanceIds
  reminder.status = 'scheduled'
  reminder.previewMode = resolveReminderPrivacyMode(reminder, loadSettings())
  saveSmartReminder(reminder)
  // Closed-app push sync — never blocks local alarm success
  try {
    reminder = await syncReminderPushSchedule(reminder)
  } catch {
    reminder.pushScheduleStatus = 'failed'
    reminder.pushSyncErrorCode = 'sync_exception'
    saveSmartReminder(reminder)
  }
  return reminder
}

function permissionNote(r: SmartReminder): string {
  const pushLine = `\n${formatPushScheduleLabel(r)}`
  if (r.notificationStatus === 'permission_denied') {
    return `\n(시스템 알림은 권한이 거부되어 꺼져 있어요. 일정은 저장됐고, 앱이 열려 있으면 화면으로 알려 드릴 수 있어요.)${pushLine}`
  }
  if (r.notificationStatus === 'unsupported') {
    return `\n(이 환경은 시스템 알림을 지원하지 않아요. 일정은 저장됐어요.)${pushLine}`
  }
  if (r.pushScheduleStatus === 'synced') {
    return `\n앱이 열려 있을 때와 종료 상태(푸시 서버 예약) 모두 준비됐어요.${pushLine}`
  }
  if (r.pushScheduleStatus === 'server_unconfigured' || r.pushScheduleStatus === 'failed') {
    return `\n시간에 맞춰 알려드릴게요. 앱이 열려 있을 때 가장 확실합니다. (종료 상태 푸시는 아직 서버 미연결·미동기화)${pushLine}`
  }
  return `\n시간에 맞춰 알려드릴게요. (앱이 열려 있을 때 가장 확실합니다.)${pushLine}`
}

export async function handleSmartReminderText(raw: string): Promise<SmartReminderReply | null> {
  const parsed = parseReminderUtterance(raw)
  if (!parsed) return null

  if (parsed.kind === 'list') {
    const items = listActiveReminders().slice(0, 12)
    if (!items.length) {
      return { handled: true, text: '저장된 스마트 일정이 없어요.', speakText: '일정이 없어요.' }
    }
    const lines = items.map(
      (r) => `• ${formatFriendly(r.scheduledAtMs)} — ${r.title}${r.status === 'snoozed' ? ' (다시 알림)' : ''}`,
    )
    return { handled: true, text: `【스마트 일정】\n${lines.join('\n')}`, speakText: `일정 ${items.length}건이에요.` }
  }

  if (parsed.kind === 'ask_person' || parsed.kind === 'ask_next') {
    const key = parsed.personDisplay || '가족'
    const items =
      parsed.kind === 'ask_next'
        ? listActiveReminders()
            .filter((r) => !parsed.personDisplay || r.personDisplay === parsed.personDisplay || r.title.includes(parsed.personDisplay))
            .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs)
        : listForPerson(key)
    const upcoming = items.filter((r) => r.scheduledAtMs >= Date.now() - 60_000).sort((a, b) => a.scheduledAtMs - b.scheduledAtMs)
    if (!upcoming.length) {
      return {
        handled: true,
        text: parsed.personDisplay
          ? `${parsed.personDisplay} 관련 다가오는 일정이 없어요.`
          : '다가오는 가족 일정이 없어요.',
        speakText: '일정이 없어요.',
      }
    }
    if (parsed.kind === 'ask_next') {
      const n = upcoming[0]!
      return {
        handled: true,
        text: `다음 일정: ${n.title}\n${formatFriendly(n.scheduledAtMs)}`,
        speakText: `${n.title}, ${formatFriendly(n.scheduledAtMs)}`,
        reminder: n,
      }
    }
    const lines = upcoming.slice(0, 8).map((r) => `• ${formatFriendly(r.scheduledAtMs)} — ${r.title}`)
    return {
      handled: true,
      text: `【${key} 일정】\n${lines.join('\n')}`,
      speakText: `${key} 일정 ${upcoming.length}건이에요.`,
    }
  }

  if (parsed.kind === 'cancel') {
    const id = getLastReminderContext()
    const r = id ? getSmartReminder(id) : listActiveReminders()[0]
    if (!r || r.status === 'cancelled') {
      return { handled: true, text: '취소할 최근 일정을 찾지 못했어요.', speakText: '일정을 찾지 못했어요.' }
    }
    if (r.mainAlarmId) cancelAlarm(r.mainAlarmId)
    for (const a of r.advanceAlarmIds) cancelAlarm(a)
    let updated = updateSmartReminder(r.id, { status: 'cancelled', mainAlarmId: null, advanceAlarmIds: [] })!
    try {
      updated = await syncReminderPushCancel(updated)
    } catch {
      /* local cancel kept */
    }
    return {
      handled: true,
      text: `「${updated.title}」 일정을 취소했어요.\n${formatPushScheduleLabel(updated)}`,
      speakText: '취소했어요.',
      reminder: updated,
    }
  }

  if (parsed.kind === 'complete') {
    const id = getLastReminderContext()
    const r = id ? getSmartReminder(id) : null
    if (!r) return { handled: true, text: '완료 처리할 최근 일정이 없어요.', speakText: '일정이 없어요.' }
    if (r.mainAlarmId) cancelAlarm(r.mainAlarmId)
    const updated = updateSmartReminder(r.id, { status: 'completed' })!
    return { handled: true, text: `「${updated.title}」을(를) 완료했어요.`, speakText: '완료했어요.', reminder: updated }
  }

  if (parsed.kind === 'snooze') {
    const id = getLastReminderContext()
    const r = id ? getSmartReminder(id) : null
    if (!r) return { handled: true, text: '다시 알림할 일정이 없어요.', speakText: '일정이 없어요.' }
    const mins = parsed.snoozeMinutes || 10
    const whenAt = Date.now() + mins * 60_000
    if (r.mainAlarmId) cancelAlarm(r.mainAlarmId)
    const alarm = scheduleAlarm('AIZIO 알림', previewBody(r), whenAt)
    const updated = updateSmartReminder(r.id, {
      status: 'snoozed',
      scheduledAtMs: whenAt,
      scheduledAt: new Date(whenAt).toISOString(),
      mainAlarmId: alarm.id,
      notificationStatus: 'pending',
    })!
    setLastReminderContext(updated.id)
    return {
      handled: true,
      text: `${mins}분 뒤에 「${updated.title}」을(를) 다시 알려드릴게요.`,
      speakText: `${mins}분 뒤에 다시 알려드릴게요.`,
      reminder: updated,
    }
  }

  if (parsed.kind === 'add_advance') {
    const id = getLastReminderContext()
    const r = id ? getSmartReminder(id) : null
    if (!r) return { handled: true, text: '사전 알림을 붙일 최근 일정이 없어요.', speakText: '일정이 없어요.' }
    const mins = parsed.advanceMinutes || 30
    const ms = mins * 60_000
    if (!r.advanceAlertsMs.includes(ms)) r.advanceAlertsMs.push(ms)
    const updated = await armAlarms({ ...r, updatedAt: new Date().toISOString() })
    setLastReminderContext(updated.id)
    return {
      handled: true,
      text: `${formatFriendly(updated.scheduledAtMs)} 「${updated.title}」에 ${mins}분 전 알림을 추가했어요.`,
      speakText: `${mins}분 전 알림을 추가했어요.`,
      reminder: updated,
    }
  }

  if (parsed.kind === 'update_time') {
    const id = getLastReminderContext()
    const r = id ? getSmartReminder(id) : null
    if (!r) return { handled: true, text: '시간을 바꿀 최근 일정이 없어요.', speakText: '일정이 없어요.' }
    const dt = parseScheduleDateTime(raw)
    if (!dt) return { handled: true, text: '바꿀 시간을 이해하지 못했어요. 예: 「3시로 바꿔줘」', speakText: '시간을 말해 주세요.' }
    if (dt.past) {
      return {
        handled: true,
        text: `${dt.label}은(는) 이미 지난 시간이에요. 날짜를 바꾸지 않고 그대로 두었어요.`,
        speakText: '이미 지난 시간이에요.',
        reminder: r,
      }
    }
    r.scheduledAtMs = dt.whenAt
    r.scheduledAt = new Date(dt.whenAt).toISOString()
    const updated = await armAlarms(r)
    setLastReminderContext(updated.id)
    return {
      handled: true,
      text: `「${updated.title}」 시간을 ${formatFriendly(updated.scheduledAtMs)}(으)로 바꿨어요.`,
      speakText: '시간을 바꿨어요.',
      reminder: updated,
    }
  }

  if (parsed.kind !== 'create') return null

  const dt = parseScheduleDateTime(raw)
  if (!dt) {
    return {
      handled: true,
      text: '날짜와 시간을 함께 말해 주세요. 예: 「오늘 오후 2시에 엄마 병원 진찰 예약 있어」',
      speakText: '시간과 날짜를 알려 주세요.',
    }
  }

  const person = resolvePerson(parsed.personDisplay, parsed.personRelation)
  const title = parsed.title || '일정'

  if (dt.past) {
    const id = createSmartReminderId()
    const nowIso = new Date().toISOString()
    const reminder: SmartReminder = {
      id,
      title,
      description: '',
      personId: person?.id || null,
      personRelation: (parsed.personRelation as RelationCode) || person?.relationship || null,
      personDisplay: parsed.personDisplay || person?.displayRelation || null,
      scheduledAt: new Date(dt.whenAt).toISOString(),
      scheduledAtMs: dt.whenAt,
      timezone: dt.timezone,
      advanceAlertsMs: [],
      advanceAlarmIds: [],
      mainAlarmId: null,
      repeatRule: /매주/.test(raw) ? 'weekly' : null,
      status: 'missed',
      notificationStatus: 'skipped_past',
      category: parsed.category || null,
      createdFrom: 'conversation',
      originalText: raw,
      createdAt: nowIso,
      updatedAt: nowIso,
      previewMode: resolveReminderPrivacyMode(
        { category: parsed.category || null, personDisplay: parsed.personDisplay || null, personRelation: (parsed.personRelation as RelationCode) || null, previewMode: 'simple' },
        loadSettings(),
      ),
      pushScheduleStatus: 'not_applicable',
      serverScheduleId: null,
      lastPushSyncAt: null,
      pushSyncErrorCode: null,
    }
    saveSmartReminder(reminder)
    setLastReminderContext(reminder.id)
    return {
      handled: true,
      text: `${dt.label}은(는) 이미 지난 시간이에요. 「${title}」은 기록만 저장했고, 알림은 만들지 않았어요.`,
      speakText: '이미 지난 시간이라 알림은 생략했어요.',
      reminder,
    }
  }

  const dup = findDuplicate({ title, scheduledAtMs: dt.whenAt, personDisplay: parsed.personDisplay })
  if (dup) {
    setLastReminderContext(dup.id)
    return {
      handled: true,
      text: `같은 일정이 이미 저장되어 있어요.\n${formatFriendly(dup.scheduledAtMs)} — ${dup.title}`,
      speakText: '같은 일정이 이미 있어요.',
      reminder: dup,
    }
  }

  const id = createSmartReminderId()
  const nowIso = new Date().toISOString()
  const advance: number[] = []
  const advMin = parsed.advanceMinutes ?? parseAdvanceMinutes(raw)
  if (advMin) advance.push(advMin * 60_000)

  let reminder: SmartReminder = {
    id,
    title,
    description: '',
    personId: person?.id || null,
    personRelation: (parsed.personRelation as RelationCode) || person?.relationship || null,
    personDisplay: parsed.personDisplay || person?.displayRelation || null,
    scheduledAt: new Date(dt.whenAt).toISOString(),
    scheduledAtMs: dt.whenAt,
    timezone: dt.timezone,
    advanceAlertsMs: advance,
    advanceAlarmIds: [],
    mainAlarmId: null,
    repeatRule: /매주/.test(raw) ? 'weekly' : null,
    status: 'scheduled',
    notificationStatus: 'pending',
    category: parsed.category || null,
    createdFrom: 'conversation',
    originalText: raw,
    createdAt: nowIso,
    updatedAt: nowIso,
    previewMode: 'simple',
    pushScheduleStatus: 'pending',
    serverScheduleId: null,
    lastPushSyncAt: null,
    pushSyncErrorCode: null,
  }
  reminder.previewMode = resolveReminderPrivacyMode(reminder, loadSettings())

  reminder = await armAlarms(reminder)
  setLastReminderContext(reminder.id)

  const needsPerm = reminder.notificationStatus === 'permission_denied' || typeof Notification !== 'undefined' && Notification.permission === 'default'
  const advText =
    reminder.advanceAlertsMs.length > 0
      ? `\n사전 알림: ${reminder.advanceAlertsMs.map((m) => `${m / 60000}분 전`).join(', ')}`
      : ''

  return {
    handled: true,
    text: `${formatFriendly(reminder.scheduledAtMs)}, 「${reminder.title}」을(를) 저장했어요.${advText}${permissionNote(reminder)}`,
    speakText: `${formatFriendly(reminder.scheduledAtMs)} ${reminder.title}을 저장했어요.`,
    reminder,
    needsPermissionHint: needsPerm,
  }
}
