/**
 * Proactive suggestion policy — user control first.
 */

import { isLifeOs2Enabled } from '../featureFlags'
import { loadItems, saveItems, LOS2_KEYS, nowIso } from '../repository'

export type ProactivePrefs = {
  id: 'proactive_prefs'
  masterEnabled: boolean
  schedule: boolean
  goals: boolean
  projects: boolean
  habits: boolean
  navigation: boolean
  music: boolean
  companion: boolean
  maxPerDay: number
  quietStartHour: number
  quietEndHour: number
}

export type ProactiveHistoryItem = {
  id: string
  signalKey: string
  at: string
  ignored?: boolean
  rejected?: boolean
}

const DEFAULT: ProactivePrefs = {
  id: 'proactive_prefs',
  masterEnabled: false,
  schedule: true,
  goals: true,
  projects: true,
  habits: true,
  navigation: true,
  music: true,
  companion: true,
  maxPerDay: 3,
  quietStartHour: 22,
  quietEndHour: 7,
}

export function loadProactivePrefs(): ProactivePrefs {
  // Store prefs in proactive key alongside history — filter by id
  const rows = loadItems<ProactivePrefs | ProactiveHistoryItem>(LOS2_KEYS.proactive)
  const prefs = rows.find((r) => (r as ProactivePrefs).id === 'proactive_prefs') as ProactivePrefs | undefined
  const base = prefs ? { ...DEFAULT, ...prefs } : { ...DEFAULT }
  // Master also gated by Life OS 2 flag
  base.masterEnabled = base.masterEnabled && isLifeOs2Enabled('proactiveSuggestionsEnabled')
  return base
}

export function saveProactivePrefs(patch: Partial<ProactivePrefs>): ProactivePrefs {
  const next = { ...loadProactivePrefs(), ...patch, id: 'proactive_prefs' as const }
  // When enabling master, also flip feature flag expectation — caller may set flag
  const hist = loadItems<ProactivePrefs | ProactiveHistoryItem>(LOS2_KEYS.proactive).filter(
    (r) => (r as ProactivePrefs).id !== 'proactive_prefs',
  )
  saveItems(LOS2_KEYS.proactive, [next, ...hist], 100)
  return next
}

function history(): ProactiveHistoryItem[] {
  return loadItems<ProactivePrefs | ProactiveHistoryItem>(LOS2_KEYS.proactive).filter(
    (r) => (r as ProactiveHistoryItem).signalKey,
  ) as ProactiveHistoryItem[]
}

export function canShowSuggestion(signalKey: string): boolean {
  const prefs = loadProactivePrefs()
  if (!prefs.masterEnabled) return false
  const h = new Date().getHours()
  if (prefs.quietStartHour > prefs.quietEndHour) {
    if (h >= prefs.quietStartHour || h < prefs.quietEndHour) return false
  } else if (h >= prefs.quietStartHour && h < prefs.quietEndHour) return false

  const hist = history()
  if (hist.some((x) => x.signalKey === signalKey && x.rejected)) return false
  const day = new Date().toISOString().slice(0, 10)
  const todayCount = hist.filter((x) => x.at.startsWith(day)).length
  if (todayCount >= prefs.maxPerDay) return false
  const recent = hist.find((x) => x.signalKey === signalKey)
  if (recent && Date.now() - Date.parse(recent.at) < 86_400_000) return false
  return true
}

export function recordSuggestionShown(signalKey: string): void {
  const prefs = loadProactivePrefs()
  const hist = history()
  hist.unshift({ id: `ps_${Date.now()}`, signalKey, at: nowIso() })
  saveItems(LOS2_KEYS.proactive, [prefs, ...hist], 100)
}

export function recordSuggestionRejected(signalKey: string): void {
  const prefs = loadProactivePrefs()
  const hist = history()
  hist.unshift({ id: `ps_${Date.now()}`, signalKey, at: nowIso(), rejected: true })
  saveItems(LOS2_KEYS.proactive, [prefs, ...hist], 100)
}

export function formatProactivePolicyHelp(): string {
  const p = loadProactivePrefs()
  return [
    '【Proactive 정책】',
    `전체: ${p.masterEnabled ? 'ON' : 'OFF'} (기본 OFF)`,
    `하루 최대 ${p.maxPerDay}개 · 화면당 권장 1개 · 24시간 동일 제안 반복 금지`,
    `방해 금지 ${p.quietStartHour}시–${p.quietEndHour}시`,
    '거부한 제안은 재표시하지 않습니다. 광고성 제안 없음.',
  ].join('\n')
}
