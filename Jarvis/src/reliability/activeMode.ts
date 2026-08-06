/**
 * Unified Active Mode — translation > travel > restaurant > normal.
 * Does not change storage keys; reads existing session stores.
 */

import { loadInterpretMode } from '../translateBrain'
import { hasActiveRestaurantSession, loadRestaurantSession } from '../restaurantAgent/session'
import { hasActiveTravelSession, loadTravelSession } from '../travelAgent/session'

export type CoreActiveMode = 'normal' | 'translation' | 'travel' | 'restaurant'

export function resolveActiveMode(): CoreActiveMode {
  try {
    if (loadInterpretMode().active) return 'translation'
  } catch {
    /* ignore */
  }
  const travel = hasActiveTravelSession() ? loadTravelSession() : null
  const rest = hasActiveRestaurantSession() ? loadRestaurantSession() : null
  if (travel && rest) {
    return (travel.updatedAt || 0) >= (rest.updatedAt || 0) ? 'travel' : 'restaurant'
  }
  if (travel) return 'travel'
  if (rest) return 'restaurant'
  return 'normal'
}

export function activeModeLabel(mode = resolveActiveMode()): string {
  if (mode === 'translation') return '번역 모드'
  if (mode === 'travel') return '여행 모드'
  if (mode === 'restaurant') return '맛집 모드'
  return '일반'
}
