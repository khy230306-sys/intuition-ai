import { isLifeOs2Enabled } from '../featureFlags'
import { loadLos2Privacy } from '../privacyBoundary'
import { loadItems, saveItems, LOS2_KEYS, los2Id, nowIso } from '../repository'
import type { CompanionEntry, CompanionKind } from './companionTypes'

export type CompanionPrefs = {
  id: 'companion_prefs'
  morningEnabled: boolean
  eveningEnabled: boolean
  quietStartHour: number
  quietEndHour: number
}

const DEFAULT_PREFS: CompanionPrefs = {
  id: 'companion_prefs',
  morningEnabled: true,
  eveningEnabled: true,
  quietStartHour: 22,
  quietEndHour: 7,
}

export function loadCompanionPrefs(): CompanionPrefs {
  const rows = loadItems<CompanionPrefs>(LOS2_KEYS.companion)
  const prefs = rows.find((r) => r.id === 'companion_prefs')
  return prefs ? { ...DEFAULT_PREFS, ...prefs } : { ...DEFAULT_PREFS }
}

export function saveCompanionPrefs(patch: Partial<CompanionPrefs>): CompanionPrefs {
  const next = { ...loadCompanionPrefs(), ...patch, id: 'companion_prefs' as const }
  const others = loadItems<CompanionEntry | CompanionPrefs>(LOS2_KEYS.companion).filter(
    (r) => (r as CompanionPrefs).id !== 'companion_prefs',
  )
  saveItems(LOS2_KEYS.companion, [next, ...others], 40)
  return next
}

export function inQuietHours(d = new Date()): boolean {
  const p = loadCompanionPrefs()
  const h = d.getHours()
  if (p.quietStartHour > p.quietEndHour) {
    return h >= p.quietStartHour || h < p.quietEndHour
  }
  return h >= p.quietStartHour && h < p.quietEndHour
}

export function companionAllowed(
  kind: CompanionKind,
  opts?: { bypassQuietHours?: boolean },
): boolean {
  if (!isLifeOs2Enabled('companionEnabled')) return false
  if (!loadLos2Privacy().companionEnabled) return false
  const p = loadCompanionPrefs()
  if (kind === 'morning' && !p.morningEnabled) return false
  if (kind === 'evening' && !p.eveningEnabled) return false
  // Quiet hours block proactive pushes only — explicit user asks always win
  if (!opts?.bypassQuietHours && inQuietHours()) return false
  return true
}

export function rememberCompanion(kind: CompanionKind, text: string, fingerprint: string): void {
  const entry: CompanionEntry = {
    id: los2Id('cmp'),
    kind,
    text: text.slice(0, 2000),
    fingerprint,
    at: nowIso(),
  }
  const prefs = loadCompanionPrefs()
  const hist = loadItems<CompanionEntry | CompanionPrefs>(LOS2_KEYS.companion).filter(
    (r) => (r as CompanionPrefs).id !== 'companion_prefs',
  ) as CompanionEntry[]
  saveItems(LOS2_KEYS.companion, [prefs, entry, ...hist].slice(0, 40), 40)
}

export function wasSameCompanionRecently(fingerprint: string, withinMs = 20 * 3600_000): boolean {
  const hist = loadItems<CompanionEntry | CompanionPrefs>(LOS2_KEYS.companion).filter(
    (r) => (r as { kind?: string }).kind,
  ) as CompanionEntry[]
  return hist.some((h) => h.fingerprint === fingerprint && Date.now() - Date.parse(h.at) < withinMs)
}
