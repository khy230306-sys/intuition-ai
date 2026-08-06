import type { ActiveMode, CommandRouterResult, RouteDiagEntry } from './types'

const KEY = 'aizio.commandRouter.diag.v1'
const MAX = 30

export function pushRouteDiag(r: CommandRouterResult, activeMode: ActiveMode, fallback: boolean): void {
  try {
    const entry: RouteDiagEntry = {
      at: new Date().toISOString(),
      input: r.normalized,
      normalized: r.normalized,
      intent: r.intent,
      confidence: r.confidence,
      activeMode,
      action: r.action,
      blockedActions: r.blockedActions || r.forbiddenActions || [],
      fallback,
      reason: r.reason,
    }
    const raw = localStorage.getItem(KEY)
    const list: RouteDiagEntry[] = raw ? (JSON.parse(raw) as RouteDiagEntry[]) : []
    list.unshift(entry)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* ignore */
  }
}

export function loadRouteDiagnostics(): RouteDiagEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as RouteDiagEntry[]
  } catch {
    return []
  }
}

export function renderRouteDiagPanel(show: boolean): string {
  if (!show) return ''
  const rows = loadRouteDiagnostics()
  if (!rows.length) {
    return `<details class="device-test-panel" data-cmd-router-diag="1"><summary><strong>명령 라우팅 진단</strong></summary><p class="hint">아직 기록이 없습니다.</p></details>`
  }
  const lis = rows
    .slice(0, 12)
    .map(
      (e) =>
        `<li><code>${escape(e.intent)}</code> · ${escape(e.action)} · conf ${e.confidence} · mode ${escape(e.activeMode)}<br/><span class="hint">${escape(e.normalized)} — ${escape(e.reason)}${e.blockedActions.length ? ` · blocked: ${escape(e.blockedActions.join(','))}` : ''}</span></li>`,
    )
    .join('')
  return `<details class="device-test-panel" data-cmd-router-diag="1"><summary><strong>명령 라우팅 진단</strong> (최근 ${rows.length})</summary><ul class="fdiag-list">${lis}</ul><p class="hint">API 키·개인정보는 기록하지 않습니다.</p></details>`
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
