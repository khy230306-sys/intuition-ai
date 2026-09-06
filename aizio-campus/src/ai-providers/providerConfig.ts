/** Provider slot config for Campus standalone. */

export type HybridProviderId = 'openai' | 'groq' | 'openrouter' | 'gemini'

export type ProviderSlotConfig = {
  apiKey: string
  model: string
  apiBase?: string
  enabled: boolean
}

export type HybridAiConfig = {
  providers: Partial<Record<HybridProviderId, ProviderSlotConfig>>
}

const KEY = 'aizio_campus_hybrid_ai_v1'

const DEFAULTS: Record<HybridProviderId, { model: string; apiBase: string }> = {
  openai: { model: 'gpt-4o-mini', apiBase: 'https://api.openai.com/v1' },
  groq: { model: 'llama-3.3-70b-versatile', apiBase: 'https://api.groq.com/openai/v1' },
  openrouter: { model: 'openrouter/auto', apiBase: 'https://openrouter.ai/api/v1' },
  gemini: {
    model: 'gemini-2.0-flash',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
}

function defaultSlot(id: HybridProviderId): ProviderSlotConfig {
  return {
    apiKey: '',
    model: DEFAULTS[id].model,
    apiBase: DEFAULTS[id].apiBase,
    enabled: true,
  }
}

export function loadHybridAiConfig(): HybridAiConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { providers: {} }
    return JSON.parse(raw) as HybridAiConfig
  } catch {
    return { providers: {} }
  }
}

export function saveHybridAiConfig(cfg: HybridAiConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function getProviderSlot(id: HybridProviderId): ProviderSlotConfig {
  const cfg = loadHybridAiConfig()
  return { ...defaultSlot(id), ...(cfg.providers?.[id] || {}) }
}

export function updateProviderSlot(id: HybridProviderId, patch: Partial<ProviderSlotConfig>): void {
  const cfg = loadHybridAiConfig()
  cfg.providers = cfg.providers || {}
  cfg.providers[id] = { ...getProviderSlot(id), ...patch }
  saveHybridAiConfig(cfg)
}

export function hasAnyConfiguredProvider(): boolean {
  return (['openai', 'groq', 'openrouter', 'gemini'] as HybridProviderId[]).some((id) =>
    Boolean(getProviderSlot(id).apiKey.trim()),
  )
}
