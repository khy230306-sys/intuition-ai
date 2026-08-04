import type { LatLng, NavRoute, NavTravelMode, NavV2Context, PlaceCandidate } from './types'

const SESSION_KEY = 'aizio.navV2.context.v1'
const MAX_AGE = 45 * 60_000

function empty(): NavV2Context {
  return {
    lastQuery: '',
    candidates: [],
    selected: null,
    origin: null,
    destination: null,
    travelMode: 'driving',
    routes: [],
    activeRouteId: null,
    guiding: false,
    stepIndex: 0,
    voiceEnabled: true,
    updatedAt: Date.now(),
  }
}

export function loadNavV2Context(): NavV2Context {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return empty()
    const c = JSON.parse(raw) as NavV2Context
    if (!c || Date.now() - (c.updatedAt || 0) > MAX_AGE) return empty()
    return { ...empty(), ...c }
  } catch {
    return empty()
  }
}

export function saveNavV2Context(ctx: NavV2Context): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...ctx, updatedAt: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function clearNavV2Context(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  activeMemory = empty()
}

/** In-memory + session mirror for fast chat turns */
let activeMemory: NavV2Context = empty()

export function getNavV2Context(): NavV2Context {
  if (!activeMemory.updatedAt) activeMemory = loadNavV2Context()
  return activeMemory
}

export function patchNavV2Context(patch: Partial<NavV2Context>): NavV2Context {
  activeMemory = { ...getNavV2Context(), ...patch, updatedAt: Date.now() }
  saveNavV2Context(activeMemory)
  return activeMemory
}

export function setCandidates(query: string, candidates: PlaceCandidate[], origin: LatLng | null): NavV2Context {
  return patchNavV2Context({
    lastQuery: query,
    candidates,
    selected: null,
    origin,
    destination: null,
    routes: [],
    activeRouteId: null,
    guiding: false,
    stepIndex: 0,
  })
}

export function selectCandidateByIndex(index1: number): PlaceCandidate | null {
  const ctx = getNavV2Context()
  if (!ctx.candidates.length) return null
  const idx = index1 === -1 ? ctx.candidates.length - 1 : index1 - 1
  if (idx < 0 || idx >= ctx.candidates.length) return null
  const selected = ctx.candidates[idx]!
  patchNavV2Context({ selected, destination: selected, routes: [], activeRouteId: null, guiding: false })
  return selected
}

export function setRoutes(routes: NavRoute[], mode: NavTravelMode): NavV2Context {
  return patchNavV2Context({
    routes,
    travelMode: mode,
    activeRouteId: routes[0]?.id || null,
    guiding: false,
    stepIndex: 0,
  })
}

export function hasActiveNavContext(): boolean {
  const c = getNavV2Context()
  return Boolean(c.candidates.length || c.destination || c.guiding || c.lastQuery)
}
