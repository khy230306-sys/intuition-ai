/** AI 길안내 v1 — types only. No server-side location storage. */

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling' | 'unspecified'

export type MapProviderId = 'system' | 'apple' | 'google' | 'kakao' | 'naver'

export type DestinationType = 'address' | 'place' | 'category' | 'saved_place' | 'unknown'

export type NavIntentId =
  | 'navigation.open_route'
  | 'navigation.search_nearby'
  | 'navigation.save_place'
  | 'navigation.open_map'
  | 'navigation.route_preview'

export type NavigationIntent = {
  intent: NavIntentId
  confidence: number
  destinationText: string
  destinationType: DestinationType
  originMode: 'current_location' | 'manual' | 'none'
  travelMode: TravelMode
  preferredMap: MapProviderId
  requiresConfirmation: boolean
  missingFields: string[]
  originalText: string
  /** Nearby category key when destinationType === 'category' */
  categoryKey?: string
  savedPlaceId?: 'home' | 'work' | string
}

export type SavedPlace = {
  id: string
  label: string
  addressText: string
  placeName: string
  mapPreference?: MapProviderId
  createdAt: string
  updatedAt: string
}

export type NavigationSettings = {
  defaultMap: MapProviderId
  defaultTravelMode: TravelMode
  home: SavedPlace | null
  work: SavedPlace | null
  favorites: SavedPlace[]
  updatedAt: string
}

/** Future departure-reminder hook (not implemented in v1). */
export type DepartureReminderDraft = {
  destination: string
  scheduledArrivalAt?: string
  preferredTravelMode: TravelMode
  departureReminderEnabled: boolean
  departureBufferMinutes: number
  navigationProvider: MapProviderId
  routeStatus: 'draft' | 'ready' | 'unsupported'
}

export type GeoPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'

export type LocationAttemptResult = {
  ok: boolean
  permission: GeoPermissionState
  accuracyGrade: 'high' | 'medium' | 'low' | 'none'
  errorCode?: string
  /** Coordinates kept ephemeral — never persist */
  coords?: { lat: number; lng: number }
}

export type BuiltMapLinks = {
  provider: MapProviderId
  label: string
  appUrl: string | null
  webUrl: string
  querySummary: string
}

export const NEARBY_CATEGORIES: Record<string, string> = {
  hospital: '병원',
  pharmacy: '약국',
  parking: '주차장',
  gas: '주유소',
  convenience: '편의점',
  cafe: '카페',
  restaurant: '식당',
  restroom: '화장실',
  bank: '은행',
  atm: 'ATM',
  police: '경찰서',
  fire: '소방서',
}
