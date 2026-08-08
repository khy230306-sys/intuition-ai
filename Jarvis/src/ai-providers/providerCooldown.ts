/**
 * Provider health cooldown — skip confirmed-dead providers briefly
 * so every chat turn does not re-hit OpenAI billing / quota errors.
 */

import type { HybridErrorCode } from './providerErrors'
import { getProviderSlot, updateProviderSlot } from './providerConfig'
import type { HybridProviderId, ProviderHealthStatus, ProviderSlotConfig } from './types'

const COOLDOWN_MS: Partial<Record<HybridErrorCode, number>> = {
  payment_required: 30 * 60_000,
  invalid_key: 30 * 60_000,
  quota: 15 * 60_000,
  rate_limit: 45_000,
  server: 30_000,
  network: 20_000,
  offline: 15_000,
  model_unavailable: 10 * 60_000,
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

/** True when configured, enabled, and not in failure cooldown. */
export function isProviderRoutable(id: HybridProviderId): boolean {
  const slot = getProviderSlot(id)
  if (slot.enabled === false) return false
  if (!slot.apiKey?.trim()) return false
  if (isProviderInCooldown(slot)) return false
  return true
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
