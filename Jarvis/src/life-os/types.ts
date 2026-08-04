/** Shared Life OS primitives. */

export type IsoDate = string

export type LifePrivacyLevel = 'private' | 'family' | 'shared'

export type LifeSource =
  | 'conversation'
  | 'explicit-user-statement'
  | 'inference'
  | 'system'
  | 'import'

export function nowIso(): IsoDate {
  return new Date().toISOString()
}

export function lifeId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${rnd}`
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
