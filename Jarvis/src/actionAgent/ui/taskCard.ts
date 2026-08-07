import type { TaskSession } from '../types'
import { getActiveTask } from '../sessionStore'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderActiveTaskCard(task?: TaskSession | null): string {
  const t = task === undefined ? getActiveTask() : task
  if (!t || t.status === 'cancelled' || t.status === 'suspended') return ''
  const s = t.slots
  const route =
    s.origin || s.destination ? `${esc(String(s.origin || '?'))} → ${esc(String(s.destination || '?'))}` : ''
  const dates = s.departureDate
    ? `${esc(s.departureDate.resolvedDate)}${s.returnDate ? ` ~ ${esc(s.returnDate.resolvedDate)}` : ''}`
    : ''
  const statusLabel =
    t.status === 'collecting'
      ? '정보 수집 중'
      : t.status === 'needs_provider'
        ? '제공자 연결 필요'
        : t.status === 'ready' || t.status === 'executing'
          ? '진행 중'
          : t.status === 'success'
            ? '준비됨'
            : t.status
  return `
    <aside class="aizio-task-card" data-task-id="${esc(t.id)}" data-task-status="${esc(t.status)}" aria-label="진행 중인 작업">
      <div class="aizio-task-card-title">${esc(t.label)}</div>
      ${route ? `<div class="aizio-task-card-line">${route}</div>` : ''}
      ${dates ? `<div class="aizio-task-card-line">${dates}</div>` : ''}
      ${s.passengers ? `<div class="aizio-task-card-line">${esc(String(s.passengers))}명</div>` : ''}
      <div class="aizio-task-card-status">${esc(statusLabel)}</div>
    </aside>
  `
}

export function renderActionAgentDiagPanel(diag: {
  currentIntent: string
  activeMode: string
  activeTask: TaskSession | null
  collectedSlots: string[]
  missingSlots: string[]
  plannedAction: string | null
  lastActionResult: string | null
}): string {
  const t = diag.activeTask
  return `
    <section class="aizio-aa-diag" data-aa-diag="1">
      <h3 class="subsection-title">Action Agent 진단</h3>
      <ul class="hint">
        <li>Current Intent: <code>${esc(diag.currentIntent || '—')}</code></li>
        <li>Active Mode: <code>${esc(diag.activeMode || 'normal')}</code></li>
        <li>Active Task: <code>${esc(t?.type || 'none')}</code> · ${esc(t?.status || '—')}</li>
        <li>Collected: ${esc(diag.collectedSlots.join(', ') || '—')}</li>
        <li>Missing: ${esc(diag.missingSlots.join(', ') || '—')}</li>
        <li>Planned Action: <code>${esc(diag.plannedAction || '—')}</code></li>
        <li>Last Result: <code>${esc(diag.lastActionResult || '—')}</code></li>
      </ul>
    </section>
  `
}
