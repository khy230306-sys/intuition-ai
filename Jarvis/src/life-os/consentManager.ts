/** Minimal consent toggles for sensitive Life OS categories. */

export type ConsentCategory = 'dna' | 'health' | 'finance' | 'familyShare' | 'timeline' | 'aiExport'

export type ConsentMap = Record<ConsentCategory, boolean>

const KEY = 'aizio_life_consent_v1'

const DEFAULTS: ConsentMap = {
  dna: true,
  health: true,
  finance: true,
  familyShare: false, // explicit — no silent family share of health/finance
  timeline: true,
  aiExport: false, // do not send DNA dumps to cloud AI unless opted in
}

export function loadConsent(): ConsentMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ConsentMap>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setConsent(category: ConsentCategory, allowed: boolean): ConsentMap {
  const next = { ...loadConsent(), [category]: allowed }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function hasConsent(category: ConsentCategory): boolean {
  return Boolean(loadConsent()[category])
}
