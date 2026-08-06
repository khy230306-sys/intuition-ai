import { isDemoRestaurantMode, loadRestaurantConfig, restaurantProviderStatus } from '../config'
import { deepLinkRestaurantProvider } from './deepLinkRestaurantProvider'
import { ExternalRestaurantProvider } from './externalRestaurantProvider'
import { mockRestaurantProvider } from './mockRestaurantProvider'
import type { RestaurantProvider } from './types'

export function getRestaurantProvider(): RestaurantProvider {
  const cfg = loadRestaurantConfig()
  if (restaurantProviderStatus(cfg) !== 'connected' || isDemoRestaurantMode(cfg)) {
    if (cfg.provider === 'deeplink') return deepLinkRestaurantProvider
    return mockRestaurantProvider
  }
  if (cfg.provider === 'external' && cfg.externalKey) {
    return new ExternalRestaurantProvider(cfg.externalKey)
  }
  return mockRestaurantProvider
}
