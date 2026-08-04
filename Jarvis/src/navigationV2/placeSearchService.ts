import { KOREA_PLACE_CATALOG, NEARBY_CATEGORY_KEYS, type CatalogPlace } from './koreaPlaceCatalog'
import { formatDistance, haversineM } from './geolocationService'
import type { LatLng, PlaceCandidate, PlaceSearchResult, PlaceSource } from './types'

const cache = new Map<string, { at: number; result: PlaceSearchResult }>()
const CACHE_TTL = 5 * 60_000
let lastRemoteAt = 0
const REMOTE_MIN_GAP = 1200

function env(key: string): string {
  try {
    // Vite injects import.meta.env
    const e = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    return String(e?.[key] || '').trim()
  } catch {
    return ''
  }
}

function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/스타벅스/g, '스벅')
}

function scorePlace(q: string, p: CatalogPlace): number {
  const nq = normalize(q)
  if (!nq) return 0
  const names = [p.name, ...p.aliases, ...p.tags].map(normalize)
  let best = 0
  for (const n of names) {
    if (n === nq) best = Math.max(best, 100)
    else if (n.startsWith(nq)) best = Math.max(best, 90)
    else if (n.includes(nq)) best = Math.max(best, 75)
    else if (nq.includes(n) && n.length >= 2) best = Math.max(best, 60)
  }
  // partial / voice typo helpers
  if (nq.includes('스벅') && names.some((n) => n.includes('스벅') || n.includes('스타벅스'))) best = Math.max(best, 80)
  if (nq.includes('케이티엑스') && names.some((n) => n.includes('ktx') || n.includes('울산역'))) best = Math.max(best, 85)
  if (/주$/.test(q.trim()) && p.name.includes('주민센터') && normalize(q).includes('역삼')) best = Math.max(best, 88)
  return best
}

function toCandidate(p: CatalogPlace, origin: LatLng | null, source: PlaceSource, score: number): PlaceCandidate {
  const distanceM = origin ? haversineM(origin, { lat: p.lat, lng: p.lng }) : null
  const etaSec = distanceM != null ? Math.round((distanceM / 1000 / 28) * 3600) : null // ~28km/h urban
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    source,
    distanceM,
    etaSec,
    score,
  }
}

function detectNearbyCategory(q: string): string | null {
  if (!/(근처|주변|가까운)/.test(q)) return null
  for (const [key, labels] of Object.entries(NEARBY_CATEGORY_KEYS)) {
    if (labels.some((l) => q.includes(l))) return key
  }
  return null
}

function searchCatalog(query: string, origin: LatLng | null, limit: number): PlaceCandidate[] {
  const q = query.trim()
  const nearbyKey = detectNearbyCategory(q)
  let hits: PlaceCandidate[] = []

  if (nearbyKey) {
    const labels = NEARBY_CATEGORY_KEYS[nearbyKey] || []
    hits = KOREA_PLACE_CATALOG.filter((p) => labels.some((l) => p.category.includes(l) || p.tags.some((t) => t.includes(l))))
      .map((p) => toCandidate(p, origin, 'local_catalog', 70))
  } else {
    hits = KOREA_PLACE_CATALOG.map((p) => ({ p, s: scorePlace(q, p) }))
      .filter((x) => x.s >= 55)
      .map((x) => toCandidate(x.p, origin, 'local_catalog', x.s))
  }

  hits.sort((a, b) => {
    if (origin && a.distanceM != null && b.distanceM != null && Math.abs(a.distanceM - b.distanceM) > 50) {
      return a.distanceM - b.distanceM
    }
    return b.score - a.score
  })

  // dedupe by name+approx coords
  const seen = new Set<string>()
  const out: PlaceCandidate[] = []
  for (const h of hits) {
    const k = `${h.name}|${h.lat.toFixed(3)}|${h.lng.toFixed(3)}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(h)
    if (out.length >= limit) break
  }
  return out
}

/** Optional remote geocoder — only when AIZIO_PLACE_SEARCH_URL is set. Never for each keystroke. */
async function searchRemote(
  query: string,
  origin: LatLng | null,
  signal?: AbortSignal,
): Promise<PlaceCandidate[]> {
  const base = env('VITE_AIZIO_PLACE_SEARCH_URL') || env('AIZIO_PLACE_SEARCH_URL')
  if (!base) return []
  if (Date.now() - lastRemoteAt < REMOTE_MIN_GAP) return []
  lastRemoteAt = Date.now()
  const url = new URL(base)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '8')
  url.searchParams.set('countrycodes', 'kr')
  if (origin) {
    url.searchParams.set('lat', String(origin.lat))
    url.searchParams.set('lon', String(origin.lng))
  }
  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: 'application/json', 'User-Agent': 'AIZIO-NavigationV2/1.0 (preview; contact local)' },
  })
  if (!res.ok) throw new Error(`remote_${res.status}`)
  const data = (await res.json()) as Array<{
    place_id?: string | number
    display_name?: string
    name?: string
    lat?: string
    lon?: string
    type?: string
    class?: string
  }>
  if (!Array.isArray(data)) return []
  return data
    .map((row, i) => {
      const lat = Number(row.lat)
      const lng = Number(row.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      const name = row.name || String(row.display_name || '').split(',')[0] || query
      const address = String(row.display_name || '')
      const distanceM = origin ? haversineM(origin, { lat, lng }) : null
      return {
        id: `remote_${row.place_id ?? i}`,
        name,
        category: row.type || row.class || '장소',
        address,
        lat,
        lng,
        source: 'remote' as const,
        distanceM,
        etaSec: distanceM != null ? Math.round((distanceM / 1000 / 28) * 3600) : null,
        score: 70,
      } satisfies PlaceCandidate
    })
    .filter(Boolean) as PlaceCandidate[]
}

export type SearchOpts = {
  origin?: LatLng | null
  limit?: number
  signal?: AbortSignal
  /** Allow optional remote only when explicitly requested (submit / voice) */
  allowRemote?: boolean
}

export async function searchPlaces(query: string, opts: SearchOpts = {}): Promise<PlaceSearchResult> {
  const q = String(query || '').trim()
  const limit = Math.min(10, Math.max(3, opts.limit ?? 5))
  const origin = opts.origin ?? null
  if (q.length < 1) {
    return { ok: false, query: q, candidates: [], provider: 'none', errorCode: 'empty', catalogOnly: true }
  }

  const cacheKey = `${q}|${origin ? `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}` : 'noloc'}|${limit}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.result

  try {
    let candidates = searchCatalog(q, origin, limit)
    let provider = 'aizio-local-catalog'
    let catalogOnly = true

    if (opts.allowRemote && candidates.length < 3) {
      try {
        const remote = await searchRemote(q, origin, opts.signal)
        if (remote.length) {
          const merged = [...candidates]
          for (const r of remote) {
            if (!merged.some((m) => haversineM(m, r) < 40)) merged.push(r)
          }
          merged.sort((a, b) => (a.distanceM ?? 1e12) - (b.distanceM ?? 1e12))
          candidates = merged.slice(0, limit)
          provider = 'local+remote'
          catalogOnly = candidates.every((c) => c.source === 'local_catalog')
        }
      } catch {
        /* keep catalog */
      }
    }

    const result: PlaceSearchResult = {
      ok: true,
      query: q,
      candidates,
      provider,
      catalogOnly,
      errorCode: candidates.length ? undefined : 'no_results',
    }
    cache.set(cacheKey, { at: Date.now(), result })
    return result
  } catch (e) {
    return {
      ok: false,
      query: q,
      candidates: [],
      provider: 'error',
      catalogOnly: true,
      errorCode: e instanceof Error ? e.message : 'search_failed',
    }
  }
}

export function candidateSubtitle(c: PlaceCandidate, hasLocation: boolean): string {
  const dist = hasLocation ? formatDistance(c.distanceM) : '위치 권한을 허용하면 가까운 순서로 볼 수 있어요'
  return `${c.category} · ${c.address} · ${dist}`
}

export function clearPlaceSearchCache(): void {
  cache.clear()
}
