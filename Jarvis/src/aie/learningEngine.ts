/**
 * Learning Engine — adjust recommendation frequency from user behavior.
 * Never invents facts; only mutates local learning weights.
 */

import { loadForgottenKeys, loadLearning, rememberForgottenKey, saveLearning } from './storage'
import type { AieRecommendation } from './types'

/** Ignore threshold after which a signal is heavily suppressed. */
const IGNORE_SOFT = 2
const IGNORE_HARD = 5

export function recordRecommendationShown(recs: AieRecommendation[]): void {
  if (!recs.length) return
  const state = loadLearning()
  const ids = recs.map((r) => r.signalKey || r.id)
  state.lastShown = [...ids, ...state.lastShown].slice(0, 40)
  saveLearning(state)
}

/** Call when user continues without acting on last suggestions. */
export function recordRecommendationsIgnored(signalKeys?: string[]): void {
  const state = loadLearning()
  const keys = signalKeys?.length ? signalKeys : state.lastShown
  for (const k of keys) {
    const key = String(k)
    state.ignoreCounts[key] = (state.ignoreCounts[key] || 0) + 1
  }
  saveLearning(state)
}

export function recordSkillUse(skillOrFeature: string): void {
  const id = skillOrFeature.trim().toLowerCase()
  if (!id) return
  const state = loadLearning()
  state.skillBoosts[id] = (state.skillBoosts[id] || 0) + 1
  saveLearning(state)
}

/** Forgotten DNA / memories must not be re-suggested. */
export function recordForgottenMemory(query: string): void {
  rememberForgottenKey(query)
}

export function isForgottenSuppressed(text: string): boolean {
  const forgotten = loadForgottenKeys()
  const t = text.toLowerCase()
  return forgotten.some((k) => k && t.includes(k))
}

export function filterByLearning(recs: AieRecommendation[]): AieRecommendation[] {
  const state = loadLearning()
  const forgotten = loadForgottenKeys()

  return recs
    .filter((r) => {
      const msg = r.message.toLowerCase()
      if (forgotten.some((k) => k && msg.includes(k))) return false
      const ignores = state.ignoreCounts[r.signalKey] || state.ignoreCounts[r.id] || 0
      if (ignores >= IGNORE_HARD) return false
      return true
    })
    .map((r) => {
      const ignores = state.ignoreCounts[r.signalKey] || 0
      const boost = state.skillBoosts[r.kind] || 0
      let priority = r.priority
      if (ignores >= IGNORE_SOFT) priority -= ignores * 2
      priority += Math.min(5, Math.floor(boost / 3))
      return { ...r, priority }
    })
    .sort((a, b) => b.priority - a.priority)
}
