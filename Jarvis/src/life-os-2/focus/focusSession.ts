import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { invalidateContextCache } from '../context-fusion/contextCache'
import { loadItems, saveItems, LOS2_KEYS, los2Id, nowIso } from '../repository'
import type { FocusSession } from './focusTypes'
import { focusOsLimitationsNotice, parseFocusMinutes, parseFocusTitle } from './focusPolicy'

export function loadFocusSessions(): FocusSession[] {
  return loadItems<FocusSession>(LOS2_KEYS.focus)
}

function save(sessions: FocusSession[]): void {
  saveItems(LOS2_KEYS.focus, sessions, 60)
}

export function getActiveFocus(): FocusSession | null {
  return loadFocusSessions().find((s) => s.status === 'active') || null
}

export function startFocus(text: string, projectName?: string | null): string {
  if (!isLifeOs2Enabled('focusEnabled')) return '집중 모드가 꺼져 있습니다.'
  const existing = getActiveFocus()
  if (existing) {
    return `이미 집중 중입니다: 「${existing.title}」. 「집중 끝」으로 종료할 수 있어요.`
  }
  const minutes = parseFocusMinutes(text)
  const title = parseFocusTitle(text)
  const started = Date.now()
  const session: FocusSession = {
    id: los2Id('focus'),
    title,
    startedAt: new Date(started).toISOString(),
    plannedEndAt: new Date(started + minutes * 60_000).toISOString(),
    endedAt: null,
    status: 'active',
    relatedProjectId: null,
    relatedProjectName: projectName || (/프로젝트|개발|AIZIO/i.test(text) ? title : null),
    musicRequested: /음악/.test(text),
    notificationPolicy: 'reduced',
    completedMinutes: 0,
    plannedMinutes: minutes,
  }
  const all = loadFocusSessions()
  all.unshift(session)
  save(all)
  invalidateContextCache()
  emitLifeOs2Event('focus.started', { id: session.id, minutes })
  const musicHint = session.musicRequested
    ? '\n집중 음악이 필요하면 「조용한 음악 틀어줘」라고 말해 주세요. (자동 재생을 단정하지 않습니다.)'
    : ''
  return [
    `집중 모드를 시작했습니다: 「${title}」 · ${minutes}분`,
    `예정 종료: ${session.plannedEndAt}`,
    session.relatedProjectName ? `연결: ${session.relatedProjectName}` : null,
    focusOsLimitationsNotice(),
    musicHint,
  ]
    .filter(Boolean)
    .join('\n')
}

export function stopFocus(cancel = false): string {
  if (!isLifeOs2Enabled('focusEnabled')) return '집중 모드가 꺼져 있습니다.'
  const all = loadFocusSessions()
  const active = all.find((s) => s.status === 'active')
  if (!active) return '진행 중인 집중 세션이 없습니다.'
  const started = Date.parse(active.startedAt)
  const mins = Number.isFinite(started) ? Math.max(0, Math.round((Date.now() - started) / 60_000)) : 0
  active.endedAt = nowIso()
  active.completedMinutes = mins
  active.status = cancel ? 'cancelled' : 'completed'
  save(all)
  invalidateContextCache()
  emitLifeOs2Event('focus.ended', { id: active.id, minutes: mins })
  return `집중 「${active.title}」을(를) ${cancel ? '취소' : '종료'}했습니다. 기록 ${mins}분.`
}

export function formatFocusStatus(): string {
  const active = getActiveFocus()
  if (active) {
    const left = Math.max(0, Math.round((Date.parse(active.plannedEndAt) - Date.now()) / 60_000))
    return `집중 진행 중: 「${active.title}」 · 남은 약 ${left}분 (앱 타이머 기준)`
  }
  const done = loadFocusSessions().filter((s) => s.status === 'completed')
  const today = new Date().toISOString().slice(0, 10)
  const todayMins = done
    .filter((s) => s.endedAt?.startsWith(today))
    .reduce((a, s) => a + (s.completedMinutes || 0), 0)
  return `진행 중인 집중 없음. 오늘 완료 합계 약 ${todayMins}분.`
}

export function formatFocusHistory(): string {
  const done = loadFocusSessions().filter((s) => s.status === 'completed').slice(0, 8)
  if (!done.length) return '집중 기록이 없습니다.'
  return [
    '【오늘·최근 집중】',
    ...done.map((s) => `• ${s.title} · ${s.completedMinutes}분 · ${s.endedAt || ''}`),
  ].join('\n')
}
