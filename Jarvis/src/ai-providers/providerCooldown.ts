/**
 * Provider health cooldown — skip confirmed-dead providers so every chat turn
 * does not re-hit OpenAI billing / quota errors (release speed gate).
 */

import type { HybridErrorCode } from './providerErrors'
import { getProviderSlot, isProviderConfigured, updateProviderSlot } from './providerConfig'
import type { HybridProviderId, ProviderHealthStatus, ProviderSlotConfig } from './types'

/** Sticky / long-lived failures must not add multi-second latency per turn. */
const COOLDOWN_MS: Partial<Record<HybridErrorCode, number>> = {
  payment_required: 24 * 60 * 60_000,
  invalid_key: 24 * 60 * 60_000,
  quota: 6 * 60 * 60_000,
  rate_limit: 60_000,
  server: 45_000,
  network: 25_000,
  offline: 15_000,
  model_unavailable: 2 * 60 * 60_000,
  all_failed: 30_000,
  unknown: 30_000,
}

export function isProviderInCooldown(slot: ProviderSlotConfig | null | undefined): boolean {
  const until = slot?.cooldownUntil
  if (!until || typeof until !== 'number') return false
  return until > Date.now()
}

export function providerCooldownRemainingMs(slot: ProviderSlotConfig | null | undefined): number {
  if (!isProviderInCooldown(slot)) return 0
  return Math.max(0, (slot!.cooldownUntil || 0) - Date.now())
}

/**
 * Sticky auth/quota: do not route until cooldown expires.
 * Prevents “try OpenAI → wait timeout → Gemini” on every utterance.
 */
export function isProviderRoutable(id: HybridProviderId): boolean {
  if (!isProviderConfigured(id)) return false
  const slot = getProviderSlot(id)
  if (slot.enabled === false) return false
  if (isProviderInCooldown(slot)) return false
  // Sticky billing / invalid key / quota — do not probe until cooldown cleared
  if (slot.status === 'auth' || slot.status === 'quota') return false
  return true
}

export function markProviderCooldown(
  id: HybridProviderId,
  code: HybridErrorCode,
  status: ProviderHealthStatus,
  lastError: string,
): void {
  const ms = COOLDOWN_MS[code] ?? COOLDOWN_MS.unknown ?? 30_000
  updateProviderSlot(id, {
    status,
    lastError: lastError.slice(0, 240),
    cooldownUntil: Date.now() + ms,
  })
}

export function clearProviderCooldown(id: HybridProviderId): void {
  updateProviderSlot(id, {
    status: 'ok',
    lastError: '',
    cooldownUntil: 0,
    lastSuccessAt: new Date().toISOString(),
  })
}

export function describeProviderHealth(id: HybridProviderId): {
  id: HybridProviderId
  status: ProviderHealthStatus
  inCooldown: boolean
  cooldownRemainingMs: number
  lastError: string
} {
  const slot = getProviderSlot(id)
  return {
    id,
    status: slot.status || 'unconfigured',
    inCooldown: isProviderInCooldown(slot),
    cooldownRemainingMs: providerCooldownRemainingMs(slot),
    lastError: slot.lastError || '',
  }
}
