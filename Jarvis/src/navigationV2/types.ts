/** AIZIO Navigation v2 — internal map, search, routing (no auto external apps). */

export type NavTravelMode = 'driving' | 'walking' | 'cycling'

export type PlaceSource = 'local_catalog' | 'remote' | 'favorite' | 'recent' | 'saved_home' | 'saved_work'

export type PlaceCandidate = {
  id: string
  name: string
  category: string
  address: string
  lat: number
  lng: number
  source: PlaceSource
  /** meters; null when location unknown */
  distanceM: number | null
  /** seconds estimate; null when unknown */
  etaSec: number | null
  score: number
}

export type LatLng = { lat: number; lng: number }

export type RouteLegStep = {
  instruction: string
  distanceM: number
  durationSec: number
  maneuver: string
  location: LatLng
}

export type NavRoute = {
  id: string
  mode: NavTravelMode
  distanceM: number
  durationSec: number
  geometry: LatLng[]
  steps: RouteLegStep[]
  /** true when not from a real routing engine */
  approximate: boolean
  provider: string
  summary: string
}

export type NavScreenPhase =
  | 'idle'
  | 'searching'
  | 'candidates'
  | 'place_detail'
  | 'route_preview'
  | 'guiding'
  | 'error'

export type NavV2Context = {
  lastQuery: string
  candidates: PlaceCandidate[]
  selected: PlaceCandidate | null
  origin: LatLng | null
  destination: PlaceCandidate | null
  travelMode: NavTravelMode
  routes: NavRoute[]
  activeRouteId: string | null
  guiding: boolean
  stepIndex: number
  voiceEnabled: boolean
  updatedAt: number
}

export type PlaceSearchResult = {
  ok: boolean
  query: string
  candidates: PlaceCandidate[]
  provider: string
  errorCode?: string
  /** When true, results are Preview seed catalog — must be labeled in UI */
  catalogOnly: boolean
}

export type RouteCalcResult = {
  ok: boolean
  routes: NavRoute[]
  errorCode?: string
  provider: string
}

export type GeoFix = {
  coords: LatLng
  accuracyM: number
  heading: number | null
  speedMps: number | null
  at: number
}

export type NavV2Settings = {
  travelMode: NavTravelMode
  voiceEnabled: boolean
  followHeading: boolean
  externalMapDefault: 'kakao' | 'tmap' | 'naver' | 'apple' | 'google'
  updatedAt: string
}
