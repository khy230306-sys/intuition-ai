import type { ActionAgentDiag, TaskSession } from '../types'
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
  // Independent departure / return fields — never a single overwritten "date"
  const dep = s.departureDate ? `출발: ${esc(s.departureDate.resolvedDate)}` : ''
  const ret = s.returnDate ? `귀국: ${esc(s.returnDate.resolvedDate)}` : ''
  const trip =
    s.tripType && s.tripType !== 'unknown'
      ? s.tripType === 'round_trip'
        ? '왕복'
        : '편도'
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
      ${route ? `<div class="aizio-task-card-line" data-slot="route">${route}</div>` : ''}
      ${dep ? `<div class="aizio-task-card-line" data-slot="departureDate">${dep}</div>` : ''}
      ${ret ? `<div class="aizio-task-card-line" data-slot="returnDate">${ret}</div>` : ''}
      ${trip ? `<div class="aizio-task-card-line" data-slot="tripType">${esc(trip)}</div>` : ''}
      ${s.passengers ? `<div class="aizio-task-card-line" data-slot="passengers">${esc(String(s.passengers))}명</div>` : ''}
      <div class="aizio-task-card-status">${esc(statusLabel)}</div>
    </aside>
  `
}

export function renderActionAgentDiagPanel(diag: ActionAgentDiag): string {
  const t = diag.activeTask
  const turn = diag.lastTurn || t?.lastDiag
  const fail = t?.lastParseFailure
  return `
    <section class="aizio-aa-diag" data-aa-diag="1">
      <h3 class="subsection-title">Action Agent 진단</h3>
      <ul class="hint">
        <li>Current Intent: <code>${esc(diag.currentIntent || '—')}</code></li>
        <li>Active Mode: <code>${esc(diag.activeMode || 'normal')}</code></li>
        <li>Active Task: <code>${esc(t?.type || 'none')}</code> · ${esc(t?.status || '—')}</li>
        <li>Expected Slot: <code>${esc(diag.expectedSlot || t?.expectedSlot || t?.pendingQuestion || '—')}</code></li>
        <li>Pending Question: <code>${esc(diag.pendingQuestion || t?.pendingQuestion || '—')}</code></li>
        <li>Question Id: <code>${esc(t?.questionId || '—')}</code></li>
        <li>Collected: ${esc(diag.collectedSlots.join(', ') || '—')}</li>
        <li>Missing: ${esc(diag.missingSlots.join(', ') || '—')}</li>
        <li>Planned Action: <code>${esc(diag.plannedAction || '—')}</code></li>
        <li>Last Result: <code>${esc(diag.lastActionResult || '—')}</code></li>
      </ul>
      ${
        turn
          ? `<h4 class="subsection-title">Last Slot Turn</h4>
      <ul class="hint">
        <li>Raw Input: <code>${esc(turn.rawInput || '—')}</code></li>
        <li>Normalized: <code>${esc(turn.normalizedInput || '—')}</code></li>
        <li>Extracted: <code>${esc(JSON.stringify(turn.extractedSlots || {}))}</code></li>
        <li>Applied: <code>${esc(JSON.stringify(turn.appliedSlots || []))}</code></li>
        <li>Rejected: <code>${esc(JSON.stringify(turn.rejectedSlotUpdates || []))}</code></li>
        <li>Next Question: <code>${esc(turn.nextQuestion || '—')}</code></li>
        ${turn.parseFailed ? `<li>Parse Failed: <code>true</code></li>` : ''}
        ${turn.validationError ? `<li>Validation: <code>${esc(turn.validationError)}</code></li>` : ''}
      </ul>`
          : ''
      }
      ${
        fail
          ? `<h4 class="subsection-title">Slot Parse Failure</h4>
      <ul class="hint">
        <li>expectedSlot: <code>${esc(fail.expectedSlot)}</code></li>
        <li>rawInput: <code>${esc(fail.rawInput)}</code></li>
        <li>normalizedInput: <code>${esc(fail.normalizedInput)}</code></li>
        <li>count: <code>${esc(String(fail.count))}</code></li>
      </ul>`
          : ''
      }
    </section>
  `
}
