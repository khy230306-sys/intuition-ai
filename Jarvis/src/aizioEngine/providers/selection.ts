/**
 * Provider Selection Engine — capability + availability (+ optional live verify).
 */

import {
  FAMILY_SEEK_PREFERRED,
  FAMILY_SEEK_REQUIRED,
  hasAllCapabilities,
  missingCapabilities,
  type ProviderCapability,
} from './capabilities'
import { googlePlacesApiKey } from './places/googlePlacesClient'
import { googlePlacesProvider } from './places/googlePlacesProvider'
import { photonPlacesProvider } from './places/photonPlacesProvider'
import type { PlacesProvider, ProviderAvailability, ProviderHealth } from './types'

export type PlacesSelectionIntent = {
  requiredCapabilities: ProviderCapability[]
  preferredCapabilities?: ProviderCapability[]
  /** When true, try Google live verify if key present but not yet verified. */
  allowLiveVerify?: boolean
}

export type PlacesSelection = {
  provider: PlacesProvider | null
  health: ProviderHealth | null
  availability: ProviderAvailability
  degraded: boolean
  missingCapabilities: ProviderCapability[]
  preferredProviderId: string | null
  fallbackFrom: string | null
}

let placesOverrideRef: PlacesProvider | null = null

/** Wired from registry so selection respects test overrides. */
export function setSelectionPlacesOverride(p: PlacesProvider | null): void {
  placesOverrideRef = p
}

export async function selectPlacesProvider(
  intent: PlacesSelectionIntent,
): Promise<PlacesSelection> {
  const preferred = intent.preferredCapabilities || []
  const required = intent.requiredCapabilities

  if (placesOverrideRef) {
    const health = await placesOverrideRef.healthCheck()
    return {
      provider: placesOverrideRef,
      health,
      availability: health.availability,
      degraded: missingCapabilities(placesOverrideRef.capabilities, preferred).length > 0,
      missingCapabilities: missingCapabilities(placesOverrideRef.capabilities, preferred),
      preferredProviderId: placesOverrideRef.id,
      fallbackFrom: null,
    }
  }

  // Commercial first: Google — probe only when key present
  if (intent.allowLiveVerify !== false && googlePlacesApiKey()) {
    const g0 = await googlePlacesProvider.healthCheck()
    if (g0.availability !== 'READY') {
      await googlePlacesProvider.tryLiveVerify()
    }
  }

  const googleHealth = await googlePlacesProvider.healthCheck()
  if (
    googleHealth.availability === 'READY' &&
    hasAllCapabilities(googlePlacesProvider.capabilities, required)
  ) {
    return {
      provider: googlePlacesProvider,
      health: googleHealth,
      availability: 'READY',
      degraded: false,
      missingCapabilities: [],
      preferredProviderId: googlePlacesProvider.id,
      fallbackFrom: null,
    }
  }

  // Auxiliary: Photon — only within its capability range; never invent ratings
  const photonHealth = await photonPlacesProvider.healthCheck()
  if (
    photonHealth.availability === 'READY' &&
    hasAllCapabilities(photonPlacesProvider.capabilities, required)
  ) {
    const missingPref = missingCapabilities(photonPlacesProvider.capabilities, preferred)
    return {
      provider: photonPlacesProvider,
      health: photonHealth,
      availability: 'READY',
      degraded: true,
      missingCapabilities: missingPref,
      preferredProviderId: googlePlacesProvider.id,
      fallbackFrom: googlePlacesProvider.id,
    }
  }

  if (
    googleHealth.availability === 'PENDING_EXTERNAL_SETUP' ||
    (googlePlacesApiKey() === '' && photonHealth.availability !== 'READY')
  ) {
    return {
      provider: null,
      health: googleHealth.availability === 'PENDING_EXTERNAL_SETUP' ? googleHealth : photonHealth,
      availability:
        googleHealth.availability === 'PENDING_EXTERNAL_SETUP'
          ? 'PENDING_EXTERNAL_SETUP'
          : 'UNAVAILABLE',
      degraded: false,
      missingCapabilities: preferred,
      preferredProviderId: googlePlacesProvider.id,
      fallbackFrom: null,
    }
  }

  return {
    provider: null,
    health: photonHealth,
    availability: 'UNAVAILABLE',
    degraded: false,
    missingCapabilities: preferred,
    preferredProviderId: googlePlacesProvider.id,
    fallbackFrom: null,
  }
}

export function familySeekSelectionIntent(): PlacesSelectionIntent {
  return {
    requiredCapabilities: FAMILY_SEEK_REQUIRED,
    preferredCapabilities: FAMILY_SEEK_PREFERRED,
    allowLiveVerify: true,
  }
}
