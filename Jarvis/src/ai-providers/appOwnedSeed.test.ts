import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('app-owned provider seed', () => {
  beforeEach(() => {
    store.clear()
    vi.resetModules()
    vi.stubEnv('VITE_AIZIO_OPENAI_API_KEY', 'sk-proj-test-openai-xxxxxxxxxxxx')
    vi.stubEnv('VITE_AIZIO_GEMINI_API_KEY', 'AQ.test-gemini-key-xxxxxxxx')
  })

  it('seeds Gemini-first auto mode when both VITE keys are present', async () => {
    const { seedAppOwnedProvidersFromBuild } = await import('./appOwnedSeed')
    const { getProviderSlot, hasAnyConfiguredProvider, loadHybridAiConfig } = await import(
      './providerConfig'
    )
    const r = seedAppOwnedProvidersFromBuild()
    expect(r.openai).toBe(true)
    expect(r.gemini).toBe(true)
    expect(getProviderSlot('openai').apiKey.startsWith('sk-proj-test')).toBe(true)
    expect(getProviderSlot('gemini').apiKey.startsWith('AQ.test')).toBe(true)
    expect(hasAnyConfiguredProvider()).toBe(true)
    expect(loadHybridAiConfig().mode).toBe('auto')
    expect(loadHybridAiConfig().fixedProvider).toBe('gemini')
    expect(loadHybridAiConfig().allowPaidFallback).toBe(true)
  })
})
