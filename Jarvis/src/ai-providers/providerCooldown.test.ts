import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HYBRID_AI_KEY, saveHybridAiConfig, updateProviderSlot, getProviderSlot } from './providerConfig'
import {
  clearProviderCooldown,
  isProviderInCooldown,
  isProviderRoutable,
  markProviderCooldown,
} from './providerCooldown'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('providerCooldown', () => {
  beforeEach(() => {
    store.clear()
    saveHybridAiConfig({
      mode: 'auto',
      allowPaidFallback: true,
      wizardDismissed: true,
      providers: {},
    })
    updateProviderSlot('openai', {
      apiKey: 'sk-test-openai-key-xxxxxxxxxxxx',
      enabled: true,
      status: 'unknown',
    })
    updateProviderSlot('gemini', {
      apiKey: 'AQ.test-gemini-key-xxxxxxxxxxxx',
      enabled: true,
      status: 'unknown',
    })
  })

  it('marks payment_required with long cooldown and blocks routing', () => {
    markProviderCooldown('openai', 'payment_required', 'auth', 'billing hard limit')
    const slot = getProviderSlot('openai')
    expect(isProviderInCooldown(slot)).toBe(true)
    expect(isProviderRoutable('openai')).toBe(false)
    expect(isProviderRoutable('gemini')).toBe(true)
    expect((slot.cooldownUntil || 0) - Date.now()).toBeGreaterThan(12 * 60 * 60_000)
  })

  it('clears cooldown on success', () => {
    markProviderCooldown('openai', 'rate_limit', 'rate_limit', '429')
    expect(isProviderInCooldown(getProviderSlot('openai'))).toBe(true)
    clearProviderCooldown('openai')
    expect(isProviderInCooldown(getProviderSlot('openai'))).toBe(false)
    expect(getProviderSlot('openai').status).toBe('ok')
  })

  it('expires cooldown after ttl for transient network errors', () => {
    vi.useFakeTimers()
    markProviderCooldown('openai', 'network', 'error', 'fetch failed')
    expect(isProviderRoutable('openai')).toBe(false)
    vi.advanceTimersByTime(30_000)
    expect(isProviderRoutable('openai')).toBe(true)
    vi.useRealTimers()
  })

  it('keeps sticky auth blocked even after short clock skew', () => {
    markProviderCooldown('openai', 'payment_required', 'auth', 'billing')
    expect(isProviderRoutable('openai')).toBe(false)
    expect(getProviderSlot('openai').status).toBe('auth')
  })

  it('persists cooldownUntil in hybrid config storage', () => {
    markProviderCooldown('openai', 'quota', 'quota', 'quota')
    const raw = localStorage.getItem(HYBRID_AI_KEY)
    expect(raw).toBeTruthy()
    expect(raw!).toMatch(/cooldownUntil/)
  })
})
