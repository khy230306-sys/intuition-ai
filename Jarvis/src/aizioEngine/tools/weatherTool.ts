/**
 * Real weather via Open-Meteo daily forecast (no API key).
 * Never invents precip — returns null on failure.
 */

import { fetchWeather, weatherLabel, type WeatherSnap } from '../../weather'
import type { EngineWeatherSnapshot } from '../types'

/** Major KR city centers — Open-Meteo coords. */
export const CITY_COORDS: Record<string, { lat: number; lon: number; place: string }> = {
  서울: { lat: 37.5665, lon: 126.978, place: '서울' },
  부산: { lat: 35.1796, lon: 129.0756, place: '부산' },
  대구: { lat: 35.8714, lon: 128.6014, place: '대구' },
  인천: { lat: 37.4563, lon: 126.7052, place: '인천' },
  광주: { lat: 35.1595, lon: 126.8526, place: '광주' },
  대전: { lat: 36.3504, lon: 127.3845, place: '대전' },
  울산: { lat: 35.5384, lon: 129.3114, place: '울산' },
  제주: { lat: 33.4996, lon: 126.5312, place: '제주' },
  수원: { lat: 37.2636, lon: 127.0286, place: '수원' },
  창원: { lat: 35.228, lon: 128.6811, place: '창원' },
}

export function resolveCityCoords(city: string): { lat: number; lon: number; place: string } | null {
  const key = city.trim().replace(/광역시|특별시|시$/g, '')
  return CITY_COORDS[key] || CITY_COORDS[city] || null
}

function dayOffset(day: EngineWeatherSnapshot['dayLabel']): number {
  if (day === '모레') return 2
  if (day === '내일') return 1
  return 0
}

type DailyPayload = {
  daily?: {
    time?: string[]
    weather_code?: number[]
    precipitation_probability_max?: number[]
    temperature_2m_max?: number[]
  }
}

export async function fetchCityDayWeather(
  city: string,
  day: EngineWeatherSnapshot['dayLabel'],
): Promise<EngineWeatherSnapshot | null> {
  const coords = resolveCityCoords(city)
  if (!coords) return null

  // 「지금/오늘」 prefer current endpoint
  if (day === '지금' || (day === '오늘' && dayOffset(day) === 0)) {
    const snap: WeatherSnap | null = await fetchWeather(coords.lat, coords.lon, coords.place)
    if (!snap) return null
    const precip = snap.precipProb
    const rainingLikely =
      (precip != null && precip >= 40) ||
      /비|소나기|뇌우|이슬비/.test(snap.label)
    return {
      city: coords.place,
      dayLabel: day === '지금' ? '지금' : '오늘',
      label: snap.label,
      tempC: snap.tempC,
      precipProb: precip,
      rainingLikely,
      source: snap.source,
      fetchedAt: Date.now(),
    }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 5000) : null
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=weather_code,precipitation_probability_max,temperature_2m_max&timezone=Asia%2FSeoul&forecast_days=4`
    const res = await fetch(url, {
      signal: ctrl?.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as DailyPayload
    const times = data.daily?.time || []
    const codes = data.daily?.weather_code || []
    const precip = data.daily?.precipitation_probability_max || []
    const temps = data.daily?.temperature_2m_max || []
    const idx = dayOffset(day)
    if (!times[idx] || codes[idx] == null) return null
    const label = weatherLabel(codes[idx]!)
    const precipProb = precip[idx] ?? null
    const rainingLikely =
      (precipProb != null && precipProb >= 40) || /비|소나기|뇌우|이슬비/.test(label)
    return {
      city: coords.place,
      dayLabel: day,
      label,
      tempC: temps[idx] ?? null,
      precipProb,
      rainingLikely,
      source: 'open-meteo-daily',
      fetchedAt: Date.now(),
    }
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function formatWeatherReply(w: EngineWeatherSnapshot): string {
  const temp = w.tempC != null ? ` · 최고 ${Math.round(w.tempC)}°` : ''
  const rain =
    w.precipProb != null ? ` · 강수확률 ${Math.round(w.precipProb)}%` : ''
  const rainLine = w.rainingLikely
    ? `${w.dayLabel} ${w.city}은(는) 비 올 가능성이 있어요.`
    : `${w.dayLabel} ${w.city}은(는) 비 올 가능성이 낮아요.`
  return [
    `【날씨 · ${w.source}】`,
    rainLine,
    `${w.label}${temp}${rain}`,
  ].join('\n')
}
