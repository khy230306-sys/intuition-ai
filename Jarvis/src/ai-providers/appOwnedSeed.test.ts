import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

vi.mock('./models', async () => {
  const actual = await vi.importActual<typeof import('./models')>('./models')
  return { ...actual, GEMINI_DEFAULT_MODEL: 'gemini-flash-latest' }
})

describe('app-owned Gemini seed', () => {
  beforeEach(() => {
    store.clear()
    vi.resetModules()
  })

  it('seeds gemini slot when VITE key is present', async () => {
    vi.stubEnv('VITE_AIZIO_GEMINI_API_KEY', 'AQ.test-gemini-key-xxxxxxxx')
    const { seedAppOwnedGeminiFromBuild } = await import('./appOwnedSeed')
    const { getProviderSlot, hasAnyConfiguredProvider, loadHybridAiConfig } = await import(
      './providerConfig'
    )
    expect(seedAppOwnedGeminiFromBuild()).toBe(true)
    expect(getProviderSlot('gemini').apiKey).toContain('AQ.test-gemini')
    expect(getProviderSlot('gemini').model).toBe('gemini-flash-latest')
    expect(hasAnyConfiguredProvider()).toBe(true)
    expect(loadHybridAiConfig().fixedProvider).toBe('gemini')
  })
})
