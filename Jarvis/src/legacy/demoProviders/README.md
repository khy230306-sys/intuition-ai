# Legacy DEMO providers (deprecated for user-facing paths)

Mock/DEMO travel and restaurant providers remain under:

- `src/travelAgent/providers/mockFlightProvider.ts`
- `src/travelAgent/providers/mockHotelProvider.ts`
- `src/restaurantAgent/providers/mockRestaurantProvider.ts`
- `src/ai-camera/providers/mockVision.ts`
- `src/actionAgent/providers/flight.ts` / `hotel.ts` (fixture helpers)

**Production:** registries return unavailable providers unless
`setLegacyDemoProvidersEnabled(true)` (tests only) or Action Agent
`allowFixtures` is set.

Do not re-enable DEMO catalogs in user UI without a live API connection.
