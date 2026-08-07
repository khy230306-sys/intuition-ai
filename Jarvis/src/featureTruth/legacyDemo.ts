/**
 * Legacy DEMO / mock providers (travel, restaurant, vision fixtures).
 * Production default: OFF — never show seeded offers as live results.
 * Vitest / reliability harness may enable temporarily.
 */

let legacyDemoProvidersEnabled = false

export function setLegacyDemoProvidersEnabled(enabled: boolean): void {
  legacyDemoProvidersEnabled = enabled
}

export function isLegacyDemoProvidersEnabled(): boolean {
  return legacyDemoProvidersEnabled
}
