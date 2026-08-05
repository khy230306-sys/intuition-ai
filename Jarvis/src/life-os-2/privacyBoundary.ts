import { LOS2_KEYS, loadItems, saveItems, clearLos2Store, clearAllLos2Stores } from './repository'
import { saveLifeOs2Flags } from './featureFlags'

export type Los2PrivacySettings = {
  shareContextWithAi: boolean
  recordContext: boolean
  habitInference: boolean
  companionEnabled: boolean
  storePreciseLocation: boolean
}

const DEFAULT_PRIVACY: Los2PrivacySettings = {
  shareContextWithAi: false,
  recordContext: true,
  habitInference: true,
  companionEnabled: true,
  storePreciseLocation: false,
}

type PrivacyRow = Los2PrivacySettings & { id: 'privacy' }

export function loadLos2Privacy(): Los2PrivacySettings {
  const rows = loadItems<PrivacyRow>(LOS2_KEYS.privacy)
  return rows[0] ? { ...DEFAULT_PRIVACY, ...rows[0] } : { ...DEFAULT_PRIVACY }
}

export function saveLos2Privacy(patch: Partial<Los2PrivacySettings>): Los2PrivacySettings {
  const next = { ...loadLos2Privacy(), ...patch, id: 'privacy' as const }
  saveItems(LOS2_KEYS.privacy, [next], 1)
  // Mirror sensitive toggles into flags
  saveLifeOs2Flags({
    contextRecordingEnabled: next.recordContext,
    habitInferenceEnabled: next.habitInference,
    companionEnabled: next.companionEnabled,
  })
  return next
}

/** Strip / shorten fields before any AI prompt (never send raw fused dump by default). */
export function redactContextForAi(block: string, maxChars = 800): string {
  if (!loadLos2Privacy().shareContextWithAi) return ''
  return block
    .replace(/\d{2,3}-\d{3,4}-\d{4}/g, '[phone]')
    .replace(/[-\d.]{10,}/g, '[coords?]')
    .slice(0, maxChars)
}

export function deleteLos2Category(
  category: 'habits' | 'focus' | 'relationships' | 'knowledge' | 'automations' | 'predictions' | 'companion' | 'all',
): void {
  if (category === 'all') {
    clearAllLos2Stores()
    return
  }
  const map = {
    habits: [LOS2_KEYS.habits, LOS2_KEYS.habitObservations],
    focus: [LOS2_KEYS.focus],
    relationships: [LOS2_KEYS.relationships],
    knowledge: [LOS2_KEYS.knowledge],
    automations: [LOS2_KEYS.automations, LOS2_KEYS.automationRuns],
    predictions: [LOS2_KEYS.predictions],
    companion: [LOS2_KEYS.companion, LOS2_KEYS.proactive],
  } as const
  for (const k of map[category]) clearLos2Store(k)
}
