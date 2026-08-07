/**
 * Photon (Komoot) PlacesProvider — free external geocoder, no API key.
 * REAL when osm_id + coordinates + address/name present.
 */

import type {
  PlacesProvider,
  PlacesSearchInput,
  PlacesSearchOutput,
  ProviderHealth,
  ProviderPlace,
} from '../types'

const PHOTON_URL = 'https://photon.komoot.io/api/'

type PhotonFeature = {
  geometry?: { coordinates?: number[] }
  properties?: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
    osm_id?: number | string
    osm_type?: string
    osm_key?: string
    osm_value?: string
    type?: string
  }
}

function addressOf(p: NonNullable<PhotonFeature['properties']>): string {
  const parts = [p.street, p.housenumber, p.city || p.state, p.country].filter(Boolean)
  return parts.join(' ').trim()
}

export class PhotonPlacesProvider implements PlacesProvider {
  readonly id = 'photon'
  readonly label = 'Photon (Komoot / OSM)'

  async healthCheck(): Promise<ProviderHealth> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        providerId: this.id,
        availability: 'UNAVAILABLE',
        message: '오프라인 — Photon 호출 불가',
        checkedAt: Date.now(),
      }
    }
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'Photon 공개 API (키 불필요)',
      checkedAt: Date.now(),
    }
  }

  async searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchOutput> {
    const requestId = `photon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const q = `${input.city ? input.city + ' ' : ''}${input.query}`.trim()
    const limit = Math.min(8, Math.max(1, input.limit ?? 5))
    const url = new URL(PHOTON_URL)
    url.searchParams.set('q', q.replace(/\s+/g, ' '))
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('lang', 'default')

    const res = await fetch(url.toString(), {
      signal: input.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`photon_http_${res.status}`)
    }
    const data = (await res.json()) as { features?: PhotonFeature[] }
    const features = Array.isArray(data.features) ? data.features : []
    const places: ProviderPlace[] = []
    const fetchedAt = Date.now()

    for (const f of features) {
      const props = f.properties || {}
      const coords = f.geometry?.coordinates
      if (!coords || coords.length < 2) continue
      const lng = Number(coords[0])
      const lat = Number(coords[1])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const cc = String(props.countrycode || '').toUpperCase()
      if (cc && cc !== 'KR') continue
      const osmId = props.osm_id != null ? String(props.osm_id) : ''
      if (!osmId) continue
      const name = String(props.name || '').trim()
      if (!name) continue
      const address = addressOf(props) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      const providerPlaceId = `${props.osm_type || 'N'}/${osmId}`
      places.push({
        provider: this.id,
        providerPlaceId,
        name,
        address,
        latitude: lat,
        longitude: lng,
        category: props.osm_value || props.type || 'place',
        mapsUrl: `https://www.openstreetmap.org/${props.osm_type === 'W' ? 'way' : props.osm_type === 'R' ? 'relation' : 'node'}/${osmId}`,
        navigationQuery: address.includes(name) ? address : `${name} ${address}`.trim(),
        fetchedAt,
        rawSourceAvailable: true,
      })
      if (places.length >= limit) break
    }

    return { places, providerRequestId: requestId, provider: this.id }
  }

  async getPlaceDetails(providerPlaceId: string): Promise<ProviderPlace | null> {
    // Photon has no stable details endpoint — re-search by id fragment
    const idPart = providerPlaceId.split('/').pop() || providerPlaceId
    const out = await this.searchPlaces({ query: idPart, limit: 5 })
    return out.places.find((p) => p.providerPlaceId === providerPlaceId) || out.places[0] || null
  }
}

export const photonPlacesProvider = new PhotonPlacesProvider()
