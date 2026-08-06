/**
 * Korea place search for Navigation v2.
 * Pipeline: local catalog → Photon (browser-safe) → optional custom Nominatim URL.
 * Query variants remove spaces (덕신 소공원 → 덕신소공원) because OSM/Photon often omit spaces.
 */

import { KOREA_PLACE_CATALOG, NEARBY_CATEGORY_KEYS, type CatalogPlace } from './koreaPlaceCatalog'
import { formatDistance, haversineM } from './geolocationService'
import type { LatLng, PlaceCandidate, PlaceSearchResult, PlaceSource } from './types'

const cache = new Map<string, { at: number; result: PlaceSearchResult }>()
const CACHE_TTL = 5 * 60_000
let lastRemoteAt = 0
const REMOTE_MIN_GAP = 900

const PHOTON_URL = 'https://photon.komoot.io/api/'

function env(key: string): string {
  try {
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

/** Search variants — Korean POIs in OSM/Photon often omit spaces. Compact first. */
export function buildSearchQueryVariants(query: string): string[] {
  const q = String(query || '').replace(/\s+/g, ' ').trim()
  if (!q) return []
  const compact = q.replace(/\s+/g, '')
  const noParticles = q
    .replace(/\s*(으로|로|까지|에서|가는|길)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Photon returns empty for "덕신 소공원" but hits "덕신소공원" — try compact first.
  const variants: string[] = compact !== q ? [compact, q] : [q]
  if (noParticles && noParticles !== q && noParticles !== compact) {
    variants.push(noParticles.replace(/\s+/g, ''))
    variants.push(noParticles)
  }
  // Soften "소공원" ↔ "공원"
  if (compact.includes('소공원')) variants.push(compact.replace(/소공원/g, '공원'))
  return [...new Set(variants.filter((v) => v.length >= 1))].slice(0, 6)
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
  if (nq.includes('스벅') && names.some((n) => n.includes('스벅') || n.includes('스타벅스'))) best = Math.max(best, 80)
  if (nq.includes('케이티엑스') && names.some((n) => n.includes('ktx') || n.includes('울산역'))) best = Math.max(best, 85)
  if (/주$/.test(q.trim()) && p.name.includes('주민센터') && normalize(q).includes('역삼')) best = Math.max(best, 88)
  return best
}

function toCandidate(p: CatalogPlace, origin: LatLng | null, source: PlaceSource, score: number): PlaceCandidate {
  const distanceM = origin ? haversineM(origin, { lat: p.lat, lng: p.lng }) : null
  const etaSec = distanceM != null ? Math.round((distanceM / 1000 / 28) * 3600) : null
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
  const variants = buildSearchQueryVariants(query)
  const nearbyKey = detectNearbyCategory(query)
  let hits: PlaceCandidate[] = []

  if (nearbyKey) {
    const labels = NEARBY_CATEGORY_KEYS[nearbyKey] || []
    hits = KOREA_PLACE_CATALOG.filter((p) =>
      labels.some((l) => p.category.includes(l) || p.tags.some((t) => t.includes(l))),
    ).map((p) => toCandidate(p, origin, 'local_catalog', 70))
  } else {
    const scored = new Map<string, { p: CatalogPlace; s: number }>()
    for (const v of variants) {
      for (const p of KOREA_PLACE_CATALOG) {
        const s = scorePlace(v, p)
        if (s < 55) continue
        const prev = scored.get(p.id)
        if (!prev || s > prev.s) scored.set(p.id, { p, s })
      }
    }
    hits = [...scored.values()].map((x) => toCandidate(x.p, origin, 'local_catalog', x.s))
  }

  hits.sort((a, b) => {
    if (origin && a.distanceM != null && b.distanceM != null && Math.abs(a.distanceM - b.distanceM) > 50) {
      return a.distanceM - b.distanceM
    }
    return b.score - a.score
  })

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

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    county?: string
    state?: string
    country?: string
    countrycode?: string
    type?: string
    osm_key?: string
    osm_value?: string
  }
}

function photonAddress(p: NonNullable<PhotonFeature['properties']>): string {
  const parts = [p.state, p.county, p.city, p.district, p.street, p.housenumber].filter(Boolean)
  return parts.join(' ') || p.country || '대한민국'
}

function photonCategory(p: NonNullable<PhotonFeature['properties']>): string {
  const v = `${p.osm_value || ''} ${p.type || ''} ${p.osm_key || ''}`
  if (/park|garden|leisure/i.test(v)) return '공원'
  if (/station|subway|rail/i.test(v)) return '역'
  if (/hospital|clinic/i.test(v)) return '병원'
  if (/cafe|coffee/i.test(v)) return '카페'
  if (/restaurant|food/i.test(v)) return '식당'
  if (/school|university/i.test(v)) return '교육'
  if (/place|village|suburb|city|town/i.test(v)) return '지역'
  return p.type || p.osm_value || '장소'
}

async function searchPhoton(
  query: string,
  origin: LatLng | null,
  signal?: AbortSignal,
  nearbyOnly = false,
): Promise<PlaceCandidate[]> {
  const variants = buildSearchQueryVariants(query)
  const out: PlaceCandidate[] = []
  const seen = new Set<string>()

  for (const v of variants) {
    if (Date.now() - lastRemoteAt < REMOTE_MIN_GAP && out.length) break
    lastRemoteAt = Date.now()
    const url = new URL(PHOTON_URL)
    url.searchParams.set('q', v)
    url.searchParams.set('limit', '8')
    url.searchParams.set('lang', 'default')
    if (origin) {
      // Soft bias only — hard bbox hid distant Korean POIs (e.g. Ulsan while in Seoul).
      url.searchParams.set('lat', String(origin.lat))
      url.searchParams.set('lon', String(origin.lng))
      if (nearbyOnly) {
        const d = 0.35
        url.searchParams.set(
          'bbox',
          `${origin.lng - d},${origin.lat - d},${origin.lng + d},${origin.lat + d}`,
        )
      }
    }
    let res: Response
    try {
      res = await fetch(url.toString(), {
        signal,
        headers: { Accept: 'application/json' },
      })
    } catch {
      continue
    }
    if (!res.ok) continue
    const data = (await res.json()) as { features?: PhotonFeature[] }
    const features = Array.isArray(data.features) ? data.features : []
    for (const f of features) {
      const props = f.properties || {}
      const coords = f.geometry?.coordinates
      if (!coords || coords.length < 2) continue
      const lng = Number(coords[0])
      const lat = Number(coords[1])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const cc = String(props.countrycode || '').toUpperCase()
      if (cc && cc !== 'KR') continue
      const name = String(props.name || '').trim() || v
      const key = `${name}|${lat.toFixed(4)}|${lng.toFixed(4)}`
      if (seen.has(key)) continue
      seen.add(key)
      const distanceM = origin ? haversineM(origin, { lat, lng }) : null
      // Prefer names that match compact query
      const nq = normalize(query)
      const nn = normalize(name)
      let score = 72
      if (nn === nq) score = 98
      else if (nn.includes(nq) || nq.includes(nn)) score = 88
      out.push({
        id: `photon_${props.osm_id ?? key}`,
        name,
        category: photonCategory(props),
        address: photonAddress(props),
        lat,
        lng,
        source: 'remote',
        distanceM,
        etaSec: distanceM != null ? Math.round((distanceM / 1000 / 28) * 3600) : null,
        score,
      })
    }
    if (out.length >= 8) break
  }
  return out
}

/** Optional custom Nominatim/Pelias endpoint when configured. */
async function searchCustomRemote(
  query: string,
  origin: LatLng | null,
  signal?: AbortSignal,
): Promise<PlaceCandidate[]> {
  const base = env('VITE_AIZIO_PLACE_SEARCH_URL') || env('AIZIO_PLACE_SEARCH_URL')
  if (!base) return []
  if (Date.now() - lastRemoteAt < REMOTE_MIN_GAP) return []
  lastRemoteAt = Date.now()
  const url = new URL(base)
  url.searchParams.set('q', query.replace(/\s+/g, ''))
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '8')
  url.searchParams.set('countrycodes', 'kr')
  if (origin) {
    url.searchParams.set('lat', String(origin.lat))
    url.searchParams.set('lon', String(origin.lng))
  }
  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: 'application/json' },
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

function mergeCandidates(lists: PlaceCandidate[][], limit: number, origin: LatLng | null): PlaceCandidate[] {
  const seen = new Set<string>()
  const merged: PlaceCandidate[] = []
  for (const list of lists) {
    for (const c of list) {
      const k = `${normalize(c.name)}|${c.lat.toFixed(3)}|${c.lng.toFixed(3)}`
      if (seen.has(k)) continue
      if (merged.some((m) => haversineM(m, c) < 45 && normalize(m.name) === normalize(c.name))) continue
      seen.add(k)
      merged.push(c)
    }
  }
  merged.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (origin && a.distanceM != null && b.distanceM != null) return a.distanceM - b.distanceM
    return 0
  })
  return merged.slice(0, limit)
}

export type SearchOpts = {
  origin?: LatLng | null
  limit?: number
  signal?: AbortSignal
  /** Allow Photon / custom remote (submit / voice). Keystroke keeps local-only. */
  allowRemote?: boolean
}

export async function searchPlaces(query: string, opts: SearchOpts = {}): Promise<PlaceSearchResult> {
  const q = String(query || '').trim()
  const limit = Math.min(10, Math.max(3, opts.limit ?? 5))
  const origin = opts.origin ?? null
  if (q.length < 1) {
    return {
      ok: false,
      query: q,
      candidates: [],
      provider: 'none',
      errorCode: 'empty',
      catalogOnly: true,
      externalMapsQuery: undefined,
    }
  }

  const cacheKey = `${q}|${origin ? `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}` : 'noloc'}|${limit}|r${opts.allowRemote ? 1 : 0}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.result

  try {
    const catalog = searchCatalog(q, origin, limit)
    let remote: PlaceCandidate[] = []
    let provider = 'aizio-local-catalog'
    let catalogOnly = true

    if (opts.allowRemote && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const nearbyOnly = Boolean(detectNearbyCategory(q))
        remote = await searchPhoton(q, origin, opts.signal, nearbyOnly)
        if (remote.length) {
          provider = catalog.length ? 'local+photon' : 'photon'
          catalogOnly = false
        }
        if (remote.length < 2) {
          try {
            const custom = await searchCustomRemote(q, origin, opts.signal)
            if (custom.length) {
              remote = [...remote, ...custom]
              provider = catalog.length ? 'local+remote' : 'remote'
              catalogOnly = false
            }
          } catch {
            /* keep photon */
          }
        }
      } catch {
        /* catalog only */
      }
    }

    const candidates = mergeCandidates([catalog, remote], limit, origin)
    const result: PlaceSearchResult = {
      ok: true,
      query: q,
      candidates,
      provider: candidates.length ? provider : 'none',
      catalogOnly: candidates.length ? catalogOnly : true,
      errorCode: candidates.length ? undefined : 'no_results',
      // Always expose query for Kakao/TMAP handoff when empty or as secondary action
      externalMapsQuery: q,
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
      externalMapsQuery: q,
    }
  }
}

export function candidateSubtitle(c: PlaceCandidate, hasLocation: boolean): string {
  const dist = hasLocation ? formatDistance(c.distanceM) : '위치 권한을 허용하면 가까운 순서로 볼 수 있어요'
  return `${c.category} · ${c.address} · ${dist}`
}

export function clearPlaceSearchCache(): void {
  cache.clear()
  lastRemoteAt = 0
}
