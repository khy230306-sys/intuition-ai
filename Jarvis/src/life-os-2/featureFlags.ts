/**
 * Life OS 2.0 feature flags — independent of Life OS 1.x flags.
 * Key: aizio_life_os2_flags_v1
 */

export type LifeOs2Flag =
  | 'contextFusionEnabled'
  | 'predictionEnabled'
  | 'habitsEnabled'
  | 'focusEnabled'
  | 'relationshipEngine2Enabled'
  | 'knowledgeEngineEnabled'
  | 'automation2Enabled'
  | 'goalCoachEnabled'
  | 'companionEnabled'
  | 'proactiveSuggestionsEnabled'
  | 'habitInferenceEnabled'
  | 'contextRecordingEnabled'

export type LifeOs2Flags = Record<LifeOs2Flag, boolean>

const KEY = 'aizio_life_os2_flags_v1'

/** Conservative defaults — engines ON for local value; proactive OFF. */
export const DEFAULT_LIFE_OS2_FLAGS: LifeOs2Flags = {
  contextFusionEnabled: true,
  predictionEnabled: true,
  habitsEnabled: true,
  focusEnabled: true,
  relationshipEngine2Enabled: true,
  knowledgeEngineEnabled: true,
  automation2Enabled: true,
  goalCoachEnabled: true,
  companionEnabled: true,
  proactiveSuggestionsEnabled: false,
  habitInferenceEnabled: true,
  contextRecordingEnabled: true,
}

export function loadLifeOs2Flags(): LifeOs2Flags {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_LIFE_OS2_FLAGS }
    const parsed = JSON.parse(raw) as Partial<LifeOs2Flags>
    return { ...DEFAULT_LIFE_OS2_FLAGS, ...parsed }
  } catch {
    return { ...DEFAULT_LIFE_OS2_FLAGS }
  }
}

export function saveLifeOs2Flags(patch: Partial<LifeOs2Flags>): LifeOs2Flags {
  const next = { ...loadLifeOs2Flags(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function isLifeOs2Enabled(flag: LifeOs2Flag): boolean {
  return Boolean(loadLifeOs2Flags()[flag])
}

export function resetLifeOs2FlagsForTests(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
