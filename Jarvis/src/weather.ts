/** Open-Meteo current weather (no API key, CORS OK). */

export type WeatherSnap = {
  tempC: number
  code: number
  label: string
  precipProb: number | null
  place: string
  at: number
  source: string
  lat?: number
  lon?: number
}

const CACHE_KEY = 'jarvis_weather_cache_v1'
const CACHE_MS = 20 * 60_000
/** ~5km — reuse cache only when coordinates match. */
const COORD_EPS = 0.05

const WMO: Record<number, string> = {
  0: '맑음',
  1: '대체로 맑음',
  2: '구름 조금',
  3: '흐림',
  45: '안개',
  48: '안개',
  51: '이슬비',
  53: '이슬비',
  55: '이슬비',
  61: '비',
  63: '비',
  65: '강한 비',
  71: '눈',
  73: '눈',
  75: '강한 눈',
  80: '소나기',
  81: '소나기',
  82: '강한 소나기',
  95: '뇌우',
  96: '뇌우',
  99: '뇌우',
}

export function weatherLabel(code: number): string {
  return WMO[code] || `날씨코드 ${code}`
}

function readCache(): WeatherSnap | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WeatherSnap
  } catch {
    return null
  }
}

function writeCache(snap: WeatherSnap): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(snap))
}

export function weatherCoordsMatch(
  snap: WeatherSnap,
  lat: number,
  lon: number,
  eps = COORD_EPS,
): boolean {
  if (snap.lat == null || snap.lon == null) return false
  return Math.abs(snap.lat - lat) <= eps && Math.abs(snap.lon - lon) <= eps
}

/** True when cached place is usable for the asked city (empty city = current location). */
export function weatherPlaceMatches(cachedPlace: string, city: string): boolean {
  const place = cachedPlace.replace(/\s+/g, '')
  const want = city.replace(/\s+/g, '')
  if (!want) return true
  if (!place) return false
  return place.includes(want) || want.includes(place)
}

export function loadCachedWeather(): WeatherSnap | null {
  const c = readCache()
  if (!c) return null
  if (Date.now() - c.at > CACHE_MS * 3) return null
  return c
}

export async function fetchWeather(
  lat: number,
  lon: number,
  place = '현재 위치',
  timeoutMs = 4000,
): Promise<WeatherSnap | null> {
  const cached = readCache()
  if (
    cached &&
    Date.now() - cached.at < CACHE_MS &&
    weatherCoordsMatch(cached, lat, lon)
  ) {
    // Keep temperature cache, but correct a stale city label (e.g. GPS=울산, label=서울).
    if (place && place !== '현재 위치' && place !== cached.place) {
      const fixed: WeatherSnap = { ...cached, place, lat, lon }
      writeCache(fixed)
      return fixed
    }
    return cached
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(String(lat))}` +
      `&longitude=${encodeURIComponent(String(lon))}` +
      `&current=temperature_2m,weather_code,precipitation_probability&timezone=auto`
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return cached && weatherCoordsMatch(cached, lat, lon) ? cached : null
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number
        weather_code?: number
        precipitation_probability?: number
      }
    }
    const cur = data.current
    if (cur?.temperature_2m == null || cur.weather_code == null) {
      return cached && weatherCoordsMatch(cached, lat, lon) ? cached : null
    }
    const snap: WeatherSnap = {
      tempC: cur.temperature_2m,
      code: cur.weather_code,
      label: weatherLabel(cur.weather_code),
      precipProb: cur.precipitation_probability ?? null,
      place,
      at: Date.now(),
      source: 'open-meteo',
      lat,
      lon,
    }
    writeCache(snap)
    return snap
  } catch {
    return cached && weatherCoordsMatch(cached, lat, lon) ? cached : null
  } finally {
    clearTimeout(timer)
  }
}

export function formatWeatherLine(w: WeatherSnap): string {
  const rain =
    w.precipProb != null && w.precipProb >= 30 ? ` · 강수 ${w.precipProb}%` : ''
  return `${w.label} ${Math.round(w.tempC)}°${rain} · ${w.place}`
}
