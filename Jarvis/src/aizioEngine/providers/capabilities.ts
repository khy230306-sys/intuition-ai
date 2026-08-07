/**
 * Provider capabilities — Engine selects by capability, not vendor name.
 */

export type ProviderCapability =
  | 'SEARCH_BY_TEXT'
  | 'NEARBY_SEARCH'
  | 'PLACE_DETAILS'
  | 'RATING'
  | 'REVIEWS'
  | 'PHOTO'
  | 'NAVIGATION'
  | 'ADDRESS_SEARCH'

/** Commercial primary vs free/auxiliary geocoder. */
export type ProviderTier = 'commercial' | 'auxiliary' | 'test'

export const ALL_PLACE_CAPABILITIES: ProviderCapability[] = [
  'SEARCH_BY_TEXT',
  'NEARBY_SEARCH',
  'PLACE_DETAILS',
  'RATING',
  'REVIEWS',
  'PHOTO',
  'NAVIGATION',
  'ADDRESS_SEARCH',
]

export const GOOGLE_PLACES_CAPABILITIES: ProviderCapability[] = [
  'SEARCH_BY_TEXT',
  'NEARBY_SEARCH',
  'PLACE_DETAILS',
  'RATING',
  'REVIEWS',
  'PHOTO',
  'NAVIGATION',
  'ADDRESS_SEARCH',
]

/** Photon: location/address only — never invent ratings/reviews. */
export const PHOTON_CAPABILITIES: ProviderCapability[] = [
  'SEARCH_BY_TEXT',
  'ADDRESS_SEARCH',
  'NAVIGATION',
]

export const TEST_PLACES_CAPABILITIES: ProviderCapability[] = [
  'SEARCH_BY_TEXT',
  'ADDRESS_SEARCH',
  'NAVIGATION',
  'PLACE_DETAILS',
]

/** Family outing seek: must search + navigate; ratings preferred (Google). */
export const FAMILY_SEEK_REQUIRED: ProviderCapability[] = [
  'SEARCH_BY_TEXT',
  'ADDRESS_SEARCH',
  'NAVIGATION',
]

export const FAMILY_SEEK_PREFERRED: ProviderCapability[] = [
  'RATING',
  'REVIEWS',
  'PLACE_DETAILS',
]

export function missingCapabilities(
  have: readonly ProviderCapability[],
  want: readonly ProviderCapability[],
): ProviderCapability[] {
  const set = new Set(have)
  return want.filter((c) => !set.has(c))
}

export function hasAllCapabilities(
  have: readonly ProviderCapability[],
  need: readonly ProviderCapability[],
): boolean {
  const set = new Set(have)
  return need.every((c) => set.has(c))
}
