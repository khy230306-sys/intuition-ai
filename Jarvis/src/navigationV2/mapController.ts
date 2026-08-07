import type { LatLng, NavRoute, PlaceCandidate } from './types'

export type MapController = {
  ready: boolean
  mount: (el: HTMLElement) => Promise<void>
  destroy: () => void
  setUserLocation: (p: LatLng | null) => void
  setCandidates: (places: PlaceCandidate[], selectedId?: string | null) => void
  setRoute: (route: NavRoute | null, alts?: NavRoute[]) => void
  flyTo: (p: LatLng, zoom?: number) => void
  fitPlaces: (places: PlaceCandidate[]) => void
  fitRoute: (route: NavRoute) => void
}

function styleUrl(): string {
  try {
    const e = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    return (
      e?.VITE_AIZIO_MAP_STYLE_URL ||
      e?.AIZIO_MAP_STYLE_URL ||
      'https://tiles.openfreemap.org/styles/dark'
    )
  } catch {
    return 'https://tiles.openfreemap.org/styles/dark'
  }
}

export function createMapController(): MapController {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let map: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maplibregl: any = null
  let destroyed = false

  const api: MapController = {
    ready: false,
    async mount(el: HTMLElement) {
      if (destroyed) return
      // Already attached to this live container — just resize.
      if (map && api.ready && map.getContainer?.() === el && el.isConnected) {
        try {
          map.resize()
        } catch {
          /* ignore */
        }
        return
      }
      // Stale map from a previous HTML remount — tear down before recreating.
      if (map) {
        try {
          map.remove()
        } catch {
          /* ignore */
        }
        map = null
        api.ready = false
      }
      const mod = await import('maplibre-gl')
      await import('maplibre-gl/dist/maplibre-gl.css')
      maplibregl = mod.default || mod
      map = new maplibregl.Map({
        container: el,
        style: styleUrl(),
        center: [127.0276, 37.4979],
        zoom: 12,
        attributionControl: true,
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
      await new Promise<void>((resolve) => {
        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          resolve()
        }
        map.on('load', done)
        map.on('error', () => window.setTimeout(done, 50))
        window.setTimeout(done, 8_000)
      })
      if (destroyed) {
        try {
          map.remove()
        } catch {
          /* ignore */
        }
        map = null
        return
      }
      api.ready = true
      try {
        map.resize()
      } catch {
        /* ignore */
      }
    },
    destroy() {
      destroyed = true
      api.ready = false
      try {
        map?.remove()
      } catch {
        /* ignore */
      }
      map = null
      // Allow a fresh controller to mount after view remounts.
      destroyed = false
    },
    setUserLocation(p) {
      if (!map || !api.ready) return
      ensureSource(map, 'user', {
        type: 'FeatureCollection',
        features: p
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }]
          : [],
      })
      if (!map.getLayer('user-dot')) {
        map.addLayer({
          id: 'user-dot',
          type: 'circle',
          source: 'user',
          paint: { 'circle-radius': 8, 'circle-color': '#00d2be', 'circle-stroke-width': 2, 'circle-stroke-color': '#041018' },
        })
      }
    },
    setCandidates(places, selectedId) {
      if (!map || !api.ready) return
      ensureSource(map, 'candidates', {
        type: 'FeatureCollection',
        features: places.map((c, i) => ({
          type: 'Feature',
          properties: { id: c.id, selected: c.id === selectedId ? 1 : 0, n: i + 1 },
          geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        })),
      })
      if (!map.getLayer('cand-circles')) {
        map.addLayer({
          id: 'cand-circles',
          type: 'circle',
          source: 'candidates',
          paint: {
            'circle-radius': ['case', ['==', ['get', 'selected'], 1], 11, 8],
            'circle-color': ['case', ['==', ['get', 'selected'], 1], '#ffe08a', '#5eead4'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#041018',
          },
        })
      }
    },
    setRoute(route, alts = []) {
      if (!map || !api.ready) return
      const mkLine = (r: NavRoute | null, id: string, color: string, width: number) => {
        ensureSource(map, id, {
          type: 'FeatureCollection',
          features: r
            ? [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: r.geometry.map((g) => [g.lng, g.lat]),
                  },
                },
              ]
            : [],
        })
        if (!map.getLayer(`${id}-line`)) {
          map.addLayer({
            id: `${id}-line`,
            type: 'line',
            source: id,
            paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.9 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          })
        }
      }
      mkLine(route, 'route-main', '#00d2be', 5)
      mkLine(alts[0] || null, 'route-alt', '#64748b', 3)
      if (route?.geometry.length) {
        ensureSource(map, 'route-ends', {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { kind: 'start' },
              geometry: {
                type: 'Point',
                coordinates: [route.geometry[0]!.lng, route.geometry[0]!.lat],
              },
            },
            {
              type: 'Feature',
              properties: { kind: 'end' },
              geometry: {
                type: 'Point',
                coordinates: [
                  route.geometry[route.geometry.length - 1]!.lng,
                  route.geometry[route.geometry.length - 1]!.lat,
                ],
              },
            },
          ],
        })
        if (!map.getLayer('route-ends-circles')) {
          map.addLayer({
            id: 'route-ends-circles',
            type: 'circle',
            source: 'route-ends',
            paint: {
              'circle-radius': 7,
              'circle-color': ['match', ['get', 'kind'], 'start', '#34d399', '#f87171'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#041018',
            },
          })
        }
      }
    },
    flyTo(p, zoom = 14) {
      map?.flyTo({ center: [p.lng, p.lat], zoom, essential: true })
    },
    fitPlaces(places) {
      if (!map || !places.length || !maplibregl) return
      if (places.length === 1) {
        api.flyTo({ lat: places[0]!.lat, lng: places[0]!.lng }, 15)
        return
      }
      const b = new maplibregl.LngLatBounds()
      places.forEach((p) => b.extend([p.lng, p.lat]))
      map.fitBounds(b, { padding: 60, maxZoom: 15 })
    },
    fitRoute(route) {
      if (!map || !route.geometry.length || !maplibregl) return
      const b = new maplibregl.LngLatBounds()
      route.geometry.forEach((p) => b.extend([p.lng, p.lat]))
      map.fitBounds(b, { padding: 70, maxZoom: 16 })
    },
  }
  return api
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureSource(map: any, id: string, data: unknown): void {
  if (map.getSource(id)) {
    map.getSource(id).setData(data)
  } else {
    map.addSource(id, { type: 'geojson', data })
  }
}
