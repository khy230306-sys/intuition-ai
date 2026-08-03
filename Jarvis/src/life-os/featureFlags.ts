/**
 * Life OS feature flags — localStorage `aizio_life_flags_v1`.
 * Incomplete / server-dependent features default OFF or documented as foundation.
 */

export type LifeFeatureFlag =
  | 'dnaEnabled'
  | 'goalsEnabled'
  | 'ideasEnabled'
  | 'projectsEnabled'
  | 'aiMeetingEnabled'
  | 'timelineEnabled'
  | 'routinesEnabled'
  | 'familySpaceEnabled'
  | 'emergencyModeEnabled'
  | 'healthEnabled'
  | 'financeEnabled'
  | 'travelEnabled'
  | 'learningEnabled'
  | 'skillStoreEnabled'
  | 'proactiveSuggestionsEnabled'

export type LifeFeatureFlags = Record<LifeFeatureFlag, boolean>

const KEY = 'aizio_life_flags_v1'

/** Safe production defaults — local capabilities ON; external/risky stay conservative. */
export const DEFAULT_LIFE_FLAGS: LifeFeatureFlags = {
  dnaEnabled: true,
  goalsEnabled: true,
  ideasEnabled: true,
  projectsEnabled: true,
  aiMeetingEnabled: true, // local template always; AI only if providers configured
  timelineEnabled: true,
  routinesEnabled: true,
  familySpaceEnabled: true, // local profiles only — not multi-user realtime server
  emergencyModeEnabled: true, // display + dial intent only; no auto-call/auto-share
  healthEnabled: true, // local logs only — no diagnosis
  financeEnabled: true, // manual expense/budget only
  travelEnabled: true, // local plans only
  learningEnabled: true,
  skillStoreEnabled: true, // catalog + permissions; no remote code install
  proactiveSuggestionsEnabled: false, // opt-in to avoid notification spam
}

export function loadLifeFlags(): LifeFeatureFlags {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_LIFE_FLAGS }
    const parsed = JSON.parse(raw) as Partial<LifeFeatureFlags>
    return { ...DEFAULT_LIFE_FLAGS, ...parsed }
  } catch {
    return { ...DEFAULT_LIFE_FLAGS }
  }
}

export function saveLifeFlags(patch: Partial<LifeFeatureFlags>): LifeFeatureFlags {
  const next = { ...loadLifeFlags(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function isLifeFeatureEnabled(flag: LifeFeatureFlag): boolean {
  return Boolean(loadLifeFlags()[flag])
}

export function resetLifeFlagsForTests(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
