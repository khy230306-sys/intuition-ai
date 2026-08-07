/**
 * Safe slot merge — protected slots cannot be overwritten by lower-confidence generics.
 */

import type { ResolvedDate, SlotMeta, SlotSource, TaskSlots } from './types'

export const PROTECTED_SLOTS = [
  'departureDate',
  'returnDate',
  'origin',
  'destination',
  'tripType',
  'passengers',
] as const

const SOURCE_RANK: Record<SlotSource, number> = {
  explicit_correction: 100,
  expected_question: 90,
  explicit_semantic: 70,
  multi_slot: 50,
  generic_fallback: 20,
}

export type SlotUpdateProposal = {
  key: string
  value: unknown
  source: SlotSource
  confidence: number
  explicit?: boolean
  expectedByQuestion?: string
}

export type MergeDiag = {
  applied: Array<{ key: string; value: unknown; source: SlotSource }>
  rejected: Array<{ key: string; value: unknown; reason: string }>
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || v === 'unknown'
}

function dateKey(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null
  const d = v as ResolvedDate
  return d.resolvedDate || null
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  const da = dateKey(a)
  const db = dateKey(b)
  if (da && db) return da === db
  return JSON.stringify(a) === JSON.stringify(b)
}

export function sourceRank(source: SlotSource): number {
  return SOURCE_RANK[source] ?? 0
}

/**
 * Merge proposals onto existing slots with protection metadata.
 */
export function safeMergeSlots(
  existing: TaskSlots,
  existingMeta: Record<string, SlotMeta> | undefined,
  proposals: SlotUpdateProposal[],
): { slots: TaskSlots; meta: Record<string, SlotMeta>; diag: MergeDiag } {
  const slots: TaskSlots = { ...existing }
  const meta: Record<string, SlotMeta> = { ...(existingMeta || {}) }
  const diag: MergeDiag = { applied: [], rejected: [] }
  const now = new Date().toISOString()

  for (const p of proposals) {
    if (isEmpty(p.value)) continue
    const prev = slots[p.key]
    const prevMeta = meta[p.key]
    const incomingRank = sourceRank(p.source) + p.confidence

    if (!isEmpty(prev) && !valuesEqual(prev, p.value)) {
      const prevRank = prevMeta
        ? sourceRank(prevMeta.source) + (prevMeta.confidence || 0)
        : sourceRank('multi_slot') + 0.5
      // Protected: never let generic/multi overwrite a stronger committed value
      if (PROTECTED_SLOTS.includes(p.key as (typeof PROTECTED_SLOTS)[number])) {
        if (incomingRank < prevRank || (p.source === 'generic_fallback' && prevMeta?.source === 'expected_question')) {
          diag.rejected.push({
            key: p.key,
            value: p.value,
            reason: `${p.key} overwrite blocked (${p.source} < ${prevMeta?.source || 'existing'})`,
          })
          continue
        }
        // Same-rank generic must not clobber expected/explicit
        if (
          p.source === 'multi_slot' ||
          p.source === 'generic_fallback'
        ) {
          if (
            prevMeta?.source === 'expected_question' ||
            prevMeta?.source === 'explicit_correction' ||
            prevMeta?.source === 'explicit_semantic'
          ) {
            diag.rejected.push({
              key: p.key,
              value: p.value,
              reason: `${p.key} overwrite blocked by committed ${prevMeta.source}`,
            })
            continue
          }
          // Bare multi_slot must not overwrite any existing protected date/place
          if (PROTECTED_SLOTS.includes(p.key as (typeof PROTECTED_SLOTS)[number]) && p.source === 'generic_fallback') {
            diag.rejected.push({
              key: p.key,
              value: p.value,
              reason: `${p.key} overwrite blocked (generic_fallback)`,
            })
            continue
          }
        }
      } else if (incomingRank < prevRank) {
        diag.rejected.push({
          key: p.key,
          value: p.value,
          reason: `${p.key} overwrite blocked (lower confidence)`,
        })
        continue
      }
    }

    ;(slots as Record<string, unknown>)[p.key] = p.value
    meta[p.key] = {
      source: p.source,
      confidence: p.confidence,
      updatedAt: now,
      explicit: p.explicit,
      expectedByQuestion: p.expectedByQuestion,
    }
    diag.applied.push({ key: p.key, value: p.value, source: p.source })
  }

  return { slots, meta, diag }
}
