import { describe, expect, it } from 'vitest'
import { searchFeatures } from '../navShell/featureCatalog'
import { getRestaurantProvider } from '../restaurantAgent/providers/registry'
import { getFlightProvider } from '../travelAgent/providers/registry'
import {
  isHiddenFromUserMenu,
  isLegacyDemoProvidersEnabled,
  MSG_TRAVEL_UNAVAILABLE,
  setLegacyDemoProvidersEnabled,
} from './index'

describe('featureTruth gating', () => {
  it('hides travel/restaurant from user menus', () => {
    expect(isHiddenFromUserMenu('travel')).toBe(true)
    expect(isHiddenFromUserMenu('restaurant')).toBe(true)
    expect(searchFeatures('여행').every((f) => f.id !== 'travel')).toBe(true)
    expect(searchFeatures('맛집').every((f) => f.id !== 'restaurant')).toBe(true)
  })

  it('production registries do not return mock catalogs', async () => {
    setLegacyDemoProvidersEnabled(false)
    expect(isLegacyDemoProvidersEnabled()).toBe(false)
    expect(getFlightProvider().id).toBe('unavailable')
    const flights = await getFlightProvider().searchFlights({
      origin: 'GMP',
      destination: 'CJU',
      departureDate: '2026-09-04',
      adults: 1,
    })
    expect(flights.offers).toHaveLength(0)
    const food = await getRestaurantProvider().searchRestaurants({ location: '울산 삼산' })
    expect(food.offers).toHaveLength(0)
    expect(MSG_TRAVEL_UNAVAILABLE).toMatch(/실검색/)
  })

  it('legacy flag restores mock flight catalog for tests', async () => {
    setLegacyDemoProvidersEnabled(true)
    try {
      const flights = await getFlightProvider().searchFlights({
        origin: 'GMP',
        destination: 'CJU',
        departureDate: '2026-09-04',
        adults: 1,
      })
      expect(flights.offers.length).toBeGreaterThan(0)
      expect(flights.demo).toBe(true)
    } finally {
      setLegacyDemoProvidersEnabled(false)
    }
  })
})
