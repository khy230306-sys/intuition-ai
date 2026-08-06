import { loadSettings, saveSettings } from '../storage'
import { defaultModelFor, OPENAI_API_BASE } from './models'
import { deobfuscateSecret, obfuscateSecret } from './keyVault'
import type { HybridAiConfig, HybridProviderId, ProviderSlotConfig } from './types'

export const HYBRID_AI_KEY = 'jarvis_hybrid_ai_v1'

const EMPTY: HybridAiConfig = {
  mode: 'auto',
  allowPaidFallback: false,
  wizardDismissed: false,
  providers: {},
}

function defaultSlot(id: HybridProviderId): ProviderSlotConfig {
  return {
    apiKey: '',
    model: defaultModelFor(id),
    apiBase: id === 'openai' || id === 'custom' ? OPENAI_API_BASE : undefined,
    enabled: true,
    status: 'unconfigured',
  }
}

/** Merge legacy OpenAI settings into hybrid openai slot. */
function migrateFromLegacySettings(cfg: HybridAiConfig): HybridAiConfig {
  const settings = loadSettings()
  const openai = { ...defaultSlot('openai'), ...cfg.providers.openai }
  if (!openai.apiKey.trim() && settings.apiKey.trim()) {
    openai.apiKey = settings.apiKey.trim()
  }
  if (settings.apiBase?.trim()) openai.apiBase = settings.apiBase.trim()
  if (settings.model?.trim()) openai.model = settings.model.trim()
  if (openai.apiKey.trim() && openai.status === 'unconfigured') openai.status = 'unknown'
  return {
    ...cfg,
    providers: { ...cfg.providers, openai },
  }
}

function decodeStored(raw: unknown): HybridAiConfig {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, providers: {} }
  const o = raw as Partial<HybridAiConfig> & {
    providers?: Partial<Record<HybridProviderId, ProviderSlotConfig & { apiKeyEnc?: string }>>
  }
  const providers: HybridAiConfig['providers'] = {}
  for (const id of Object.keys(o.providers || {}) as HybridProviderId[]) {
    const slot = o.providers![id]!
    const plain = slot.apiKeyEnc
      ? deobfuscateSecret(slot.apiKeyEnc)
      : deobfuscateSecret(slot.apiKey || '')
    providers[id] = {
      ...defaultSlot(id),
      ...slot,
      apiKey: plain,
    }
  }
  return {
    mode: o.mode === 'fixed' ? 'fixed' : 'auto',
    fixedProvider: o.fixedProvider,
    allowPaidFallback: o.allowPaidFallback === true,
    wizardDismissed: o.wizardDismissed === true,
    providers,
  }
}

export function loadHybridAiConfig(): HybridAiConfig {
  try {
    const raw = localStorage.getItem(HYBRID_AI_KEY)
    const parsed = raw ? decodeStored(JSON.parse(raw)) : { ...EMPTY, providers: {} }
    return migrateFromLegacySettings(parsed)
  } catch {
    return migrateFromLegacySettings({ ...EMPTY, providers: {} })
  }
}

export function saveHybridAiConfig(cfg: HybridAiConfig): void {
  const encProviders: Record<string, unknown> = {}
  for (const id of Object.keys(cfg.providers) as HybridProviderId[]) {
    const slot = cfg.providers[id]!
    const { apiKey, ...rest } = slot
    encProviders[id] = {
      ...rest,
      apiKey: '',
      apiKeyEnc: apiKey.trim() ? obfuscateSecret(apiKey.trim()) : '',
    }
  }
  const payload = {
    mode: cfg.mode,
    fixedProvider: cfg.fixedProvider,
    allowPaidFallback: cfg.allowPaidFallback === true,
    wizardDismissed: cfg.wizardDismissed === true,
    providers: encProviders,
  }
  localStorage.setItem(HYBRID_AI_KEY, JSON.stringify(payload))

  // Keep legacy OpenAI settings in sync for older code paths / UI fields.
  const openai = cfg.providers.openai
  if (openai) {
    const settings = loadSettings()
    saveSettings({
      ...settings,
      apiKey: openai.apiKey || '',
      apiBase: openai.apiBase || OPENAI_API_BASE,
      model: openai.model || defaultModelFor('openai'),
    })
  }
}

export function getProviderSlot(id: HybridProviderId): ProviderSlotConfig {
  const cfg = loadHybridAiConfig()
  return { ...defaultSlot(id), ...cfg.providers[id] }
}

export function updateProviderSlot(
  id: HybridProviderId,
  patch: Partial<ProviderSlotConfig>,
): HybridAiConfig {
  const cfg = loadHybridAiConfig()
  const nextSlot = { ...defaultSlot(id), ...cfg.providers[id], ...patch }
  if (patch.apiKey !== undefined) nextSlot.apiKey = patch.apiKey.trim()
  // Key present but never tested → show "saved" rather than stuck "unconfigured".
  if (nextSlot.apiKey.trim() && (!nextSlot.status || nextSlot.status === 'unconfigured')) {
    nextSlot.status = 'unknown'
  }
  if (!nextSlot.apiKey.trim() && patch.apiKey !== undefined) {
    nextSlot.status = 'unconfigured'
  }
  const next: HybridAiConfig = {
    ...cfg,
    providers: { ...cfg.providers, [id]: nextSlot },
  }
  saveHybridAiConfig(next)
  return next
}

export function clearProviderKey(id: HybridProviderId): void {
  updateProviderSlot(id, {
    apiKey: '',
    status: 'unconfigured',
    lastError: undefined,
    lastSuccessAt: undefined,
  })
}

export function exportHybridAiSafe(): Omit<HybridAiConfig, 'providers'> & {
  providers: Partial<Record<HybridProviderId, Omit<ProviderSlotConfig, 'apiKey'> & { hasKey: boolean }>>
} {
  const cfg = loadHybridAiConfig()
  const providers: ReturnType<typeof exportHybridAiSafe>['providers'] = {}
  for (const id of Object.keys(cfg.providers) as HybridProviderId[]) {
    const s = cfg.providers[id]!
    const { apiKey: _k, ...rest } = s
    providers[id] = { ...rest, hasKey: Boolean(s.apiKey.trim()) }
  }
  return {
    mode: cfg.mode,
    fixedProvider: cfg.fixedProvider,
    allowPaidFallback: cfg.allowPaidFallback,
    wizardDismissed: cfg.wizardDismissed,
    providers,
  }
}

export function hasAnyConfiguredProvider(): boolean {
  const cfg = loadHybridAiConfig()
  return (Object.keys(cfg.providers) as HybridProviderId[]).some((id) => {
    const s = cfg.providers[id]
    return Boolean(s?.enabled !== false && s?.apiKey?.trim())
  })
}

export function dismissAiWizard(): void {
  const cfg = loadHybridAiConfig()
  saveHybridAiConfig({ ...cfg, wizardDismissed: true })
}

export function shouldShowAiWizard(): boolean {
  const cfg = loadHybridAiConfig()
  if (cfg.wizardDismissed) return false
  return !hasAnyConfiguredProvider()
}
