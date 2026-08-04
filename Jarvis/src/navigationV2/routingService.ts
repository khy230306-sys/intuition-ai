import { bearingDeg, haversineM } from './geolocationService'
import type { LatLng, NavRoute, NavTravelMode, RouteCalcResult, RouteLegStep } from './types'

function env(key: string): string {
  try {
    const e = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    return String(e?.[key] || '').trim()
  } catch {
    return ''
  }
}

function profileFor(mode: NavTravelMode): string {
  if (mode === 'walking') return 'foot'
  if (mode === 'cycling') return 'bike'
  return 'driving'
}

function decodePolyline(str: string, precision = 5): LatLng[] {
  let index = 0
  let lat = 0
  let lng = 0
  const coords: LatLng[] = []
  const factor = 10 ** precision
  while (index < str.length) {
    let result = 0
    let shift = 0
    let b: number
    do {
      b = str.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat
    result = 0
    shift = 0
    do {
      b = str.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng
    coords.push({ lat: lat / factor, lng: lng / factor })
  }
  return coords
}

function turnLabel(prev: LatLng, cur: LatLng, next: LatLng): string {
  const a = bearingDeg(prev, cur)
  const b = bearingDeg(cur, next)
  let d = ((b - a + 540) % 360) - 180
  if (Math.abs(d) < 25) return '직진하세요'
  if (d > 25 && d < 140) return '우회전하세요'
  if (d < -25 && d > -140) return '좌회전하세요'
  return '유턴에 주의하세요'
}

function stepsFromGeometry(geometry: LatLng[], totalM: number, totalSec: number): RouteLegStep[] {
  if (geometry.length < 2) {
    return [
      {
        instruction: '목적지로 이동하세요',
        distanceM: totalM,
        durationSec: totalSec,
        maneuver: 'depart',
        location: geometry[0] || { lat: 0, lng: 0 },
      },
    ]
  }
  const steps: RouteLegStep[] = []
  const stride = Math.max(1, Math.floor(geometry.length / 8))
  for (let i = stride; i < geometry.length - 1; i += stride) {
    const prev = geometry[i - stride] || geometry[0]!
    const cur = geometry[i]!
    const next = geometry[Math.min(geometry.length - 1, i + stride)]!
    const seg = haversineM(prev, cur)
    steps.push({
      instruction: turnLabel(prev, cur, next),
      distanceM: seg,
      durationSec: Math.round((seg / Math.max(1, totalM)) * totalSec),
      maneuver: 'turn',
      location: cur,
    })
  }
  steps.push({
    instruction: '목적지에 도착했습니다',
    distanceM: 0,
    durationSec: 0,
    maneuver: 'arrive',
    location: geometry[geometry.length - 1]!,
  })
  return steps
}

function approximateRoute(origin: LatLng, dest: LatLng, mode: NavTravelMode): NavRoute {
  const distanceM = haversineM(origin, dest)
  const speed = mode === 'walking' ? 1.3 : mode === 'cycling' ? 4.5 : 11 // m/s approx
  const durationSec = Math.max(60, Math.round(distanceM / speed))
  // simple intermediate points
  const geometry: LatLng[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    geometry.push({
      lat: origin.lat + (dest.lat - origin.lat) * t,
      lng: origin.lng + (dest.lng - origin.lng) * t,
    })
  }
  return {
    id: `approx_${Date.now()}`,
    mode,
    distanceM,
    durationSec,
    geometry,
    steps: stepsFromGeometry(geometry, distanceM, durationSec),
    approximate: true,
    provider: 'approximate',
    summary: '대략 경로 (라우팅 서버 미연결 · 직선 기반)',
  }
}

async function osrmRoute(origin: LatLng, dest: LatLng, mode: NavTravelMode, signal?: AbortSignal): Promise<NavRoute | null> {
  const base =
    env('VITE_AIZIO_ROUTING_URL') ||
    env('AIZIO_ROUTING_URL') ||
    'https://router.project-osrm.org'
  const profile = profileFor(mode)
  const url = `${base.replace(/\/$/, '')}/route/v1/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=polyline&steps=true&alternatives=true`
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    code?: string
    routes?: Array<{
      distance: number
      duration: number
      geometry: string
      legs?: Array<{ steps?: Array<{ name?: string; maneuver?: { type?: string; modifier?: string; location?: number[] }; distance?: number; duration?: number }> }>
    }>
  }
  if (data.code !== 'Ok' || !data.routes?.length) return null
  const routes = data.routes.slice(0, 3).map((r, idx) => {
    const geometry = decodePolyline(r.geometry)
    const steps: RouteLegStep[] =
      r.legs?.[0]?.steps?.map((s) => {
        const loc = s.maneuver?.location
        const mod = s.maneuver?.modifier || ''
        const type = s.maneuver?.type || ''
        let instruction = '직진하세요'
        if (type === 'arrive') instruction = '목적지에 도착했습니다'
        else if (mod.includes('left')) instruction = '좌회전하세요'
        else if (mod.includes('right')) instruction = '우회전하세요'
        else if (type === 'depart') instruction = '안내를 시작합니다'
        const road = s.name ? `${s.name}에서 ` : ''
        return {
          instruction: type === 'arrive' ? instruction : `${road}${instruction}`.trim(),
          distanceM: s.distance || 0,
          durationSec: Math.round(s.duration || 0),
          maneuver: type || 'turn',
          location: loc ? { lat: loc[1]!, lng: loc[0]! } : geometry[0]!,
        }
      }) || stepsFromGeometry(geometry, r.distance, r.duration)
    return {
      id: `osrm_${idx}_${Date.now()}`,
      mode,
      distanceM: r.distance,
      durationSec: Math.round(r.duration),
      geometry,
      steps,
      approximate: false,
      provider: 'osrm',
      summary: idx === 0 ? '추천 경로' : `대안 경로 ${idx}`,
    } satisfies NavRoute
  })
  return routes[0] || null
}

async function osrmRoutes(
  origin: LatLng,
  dest: LatLng,
  mode: NavTravelMode,
  signal?: AbortSignal,
): Promise<NavRoute[]> {
  const base =
    env('VITE_AIZIO_ROUTING_URL') ||
    env('AIZIO_ROUTING_URL') ||
    'https://router.project-osrm.org'
  const profile = profileFor(mode)
  const url = `${base.replace(/\/$/, '')}/route/v1/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=polyline&steps=true&alternatives=true`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = (await res.json()) as {
    code?: string
    routes?: Array<{
      distance: number
      duration: number
      geometry: string
      legs?: Array<{
        steps?: Array<{
          name?: string
          maneuver?: { type?: string; modifier?: string; location?: number[] }
          distance?: number
          duration?: number
        }>
      }>
    }>
  }
  if (data.code !== 'Ok' || !data.routes?.length) return []
  return data.routes.slice(0, 3).map((r, idx) => {
    const geometry = decodePolyline(r.geometry)
    const steps: RouteLegStep[] =
      r.legs?.[0]?.steps?.map((s) => {
        const loc = s.maneuver?.location
        const mod = s.maneuver?.modifier || ''
        const type = s.maneuver?.type || ''
        let instruction = '직진하세요'
        if (type === 'arrive') instruction = '목적지에 도착했습니다'
        else if (mod.includes('left')) instruction = '좌회전하세요'
        else if (mod.includes('right')) instruction = '우회전하세요'
        else if (type === 'depart') instruction = '안내를 시작합니다'
        const road = s.name ? `${s.name}에서 ` : ''
        return {
          instruction: type === 'arrive' ? instruction : `${road}${instruction}`.trim(),
          distanceM: s.distance || 0,
          durationSec: Math.round(s.duration || 0),
          maneuver: type || 'turn',
          location: loc ? { lat: loc[1]!, lng: loc[0]! } : geometry[0]!,
        }
      }) || stepsFromGeometry(geometry, r.distance, r.duration)
    return {
      id: `osrm_${idx}_${Date.now()}`,
      mode,
      distanceM: r.distance,
      durationSec: Math.round(r.duration),
      geometry,
      steps,
      approximate: false,
      provider: 'osrm',
      summary: idx === 0 ? '추천 경로' : `대안 경로 ${idx}`,
    }
  })
}

export async function calculateRoutes(
  origin: LatLng,
  dest: LatLng,
  mode: NavTravelMode,
  opts?: { signal?: AbortSignal },
): Promise<RouteCalcResult> {
  if (haversineM(origin, dest) < 15) {
    return { ok: false, routes: [], errorCode: 'same_point', provider: 'none' }
  }
  try {
    const preferred = (env('VITE_AIZIO_ROUTING_PROVIDER') || env('AIZIO_ROUTING_PROVIDER') || 'osrm').toLowerCase()
    if (preferred === 'osrm' || preferred === 'valhalla' || preferred === 'auto') {
      const routes = await osrmRoutes(origin, dest, mode, opts?.signal)
      if (routes.length) {
        return { ok: true, routes, provider: routes[0]!.provider }
      }
      // keep unused helper referenced for single-route callers
      void osrmRoute
    }
  } catch {
    /* fall through */
  }
  const approx = approximateRoute(origin, dest, mode)
  return { ok: true, routes: [approx], provider: 'approximate', errorCode: 'routing_fallback' }
}

export function findOffRoute(current: LatLng, route: NavRoute, thresholdM = 60): boolean {
  if (!route.geometry.length) return false
  let min = Infinity
  for (const p of route.geometry) {
    min = Math.min(min, haversineM(current, p))
    if (min < thresholdM) return false
  }
  return min > thresholdM
}

export function nextStepIndex(current: LatLng, route: NavRoute, from = 0): number {
  let best = from
  let bestD = Infinity
  for (let i = from; i < route.steps.length; i++) {
    const d = haversineM(current, route.steps[i]!.location)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}
