import { isLegacyDemoProvidersEnabled } from '../../featureTruth'
import { isDemoRestaurantMode, loadRestaurantConfig, restaurantProviderStatus } from '../config'
import { deepLinkRestaurantProvider } from './deepLinkRestaurantProvider'
import { ExternalRestaurantProvider } from './externalRestaurantProvider'
import { mockRestaurantProvider } from './mockRestaurantProvider'
import type { RestaurantProvider } from './types'
import { unavailableRestaurantProvider } from './unavailableProvider'

export function getRestaurantProvider(): RestaurantProvider {
  const cfg = loadRestaurantConfig()
  const status = restaurantProviderStatus(cfg)

  if (status === 'connected' && cfg.provider === 'external' && cfg.externalKey) {
    return new ExternalRestaurantProvider(cfg.externalKey)
  }

  // Deep-link still wraps mock catalog — treat as DEMO unless legacy fixtures on
  if (isLegacyDemoProvidersEnabled()) {
    if (cfg.provider === 'deeplink') return deepLinkRestaurantProvider
    return mockRestaurantProvider
  }

  if (status !== 'connected' || isDemoRestaurantMode(cfg) || cfg.provider === 'deeplink') {
    return unavailableRestaurantProvider
  }

  return unavailableRestaurantProvider
}
