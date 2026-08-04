/** Append-only audit log (local, capped). Never store secrets. */

import { looksLikeForbiddenSecret } from './privacyPolicy'
import { lifeId, nowIso } from './types'

const KEY = 'aizio_life_audit_v1'
const MAX = 200

export type AuditEntry = {
  id: string
  action: string
  detail: string
  at: string
}

export function appendAudit(action: string, detail: string): void {
  if (looksLikeForbiddenSecret(detail)) return
  try {
    const raw = localStorage.getItem(KEY)
    const list: AuditEntry[] = raw ? (JSON.parse(raw) as AuditEntry[]) : []
    list.unshift({
      id: lifeId('aud'),
      action: String(action).slice(0, 80),
      detail: String(detail).slice(0, 240),
      at: nowIso(),
    })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* ignore */
  }
}

export function loadAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AuditEntry[]) : []
  } catch {
    return []
  }
}
