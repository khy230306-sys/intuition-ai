import { deobfuscateSecret, obfuscateSecret } from '../ai-providers/keyVault'

const KEY = 'aizio_restaurant_services_v1'

export type RestaurantProviderId = 'demo' | 'external' | 'deeplink'

export type RestaurantServicesConfig = {
  provider: RestaurantProviderId
  externalKey?: string
  updatedAt: string
}

const DEFAULT: RestaurantServicesConfig = {
  provider: 'demo',
  updatedAt: new Date(0).toISOString(),
}

export function loadRestaurantConfig(): RestaurantServicesConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const p = JSON.parse(raw) as RestaurantServicesConfig
    return {
      ...DEFAULT,
      ...p,
      externalKey: p.externalKey ? deobfuscateSecret(p.externalKey) : undefined,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveRestaurantConfig(patch: Partial<RestaurantServicesConfig>): RestaurantServicesConfig {
  const cur = loadRestaurantConfig()
  const next: RestaurantServicesConfig = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...next,
      externalKey: next.externalKey ? obfuscateSecret(next.externalKey) : undefined,
    }),
  )
  return next
}

export function restaurantProviderStatus(cfg = loadRestaurantConfig()): 'demo' | 'connected' | 'not_configured' {
  if (cfg.provider === 'demo' || cfg.provider === 'deeplink') return 'demo'
  if (cfg.provider === 'external') return cfg.externalKey ? 'connected' : 'not_configured'
  return 'not_configured'
}

export function isDemoRestaurantMode(cfg = loadRestaurantConfig()): boolean {
  const st = restaurantProviderStatus(cfg)
  return st === 'demo' || st === 'not_configured'
}
