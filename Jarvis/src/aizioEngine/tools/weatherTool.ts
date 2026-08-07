/**
 * Real weather via Open-Meteo — returns standardized ToolResult.
 */

import { fetchWeather, weatherLabel, type WeatherSnap } from '../../weather'
import { makeToolResult, type ToolResult } from '../toolResult'
import type { EngineWeatherSnapshot } from '../types'

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

export async function runWeatherTool(
  city: string,
  day: EngineWeatherSnapshot['dayLabel'],
): Promise<ToolResult<EngineWeatherSnapshot>> {
  const coords = resolveCityCoords(city)
  if (!coords) {
    return makeToolResult({
      toolId: 'weather.forecast',
      success: false,
      status: 'needs_input',
      source: 'none',
      sourceType: 'none',
      isRealData: false,
      errorCode: 'unknown_city',
      errorMessage: `알 수 없는 지역: ${city}`,
      confidence: 0,
    })
  }

  if (day === '지금' || day === '오늘') {
    const snap: WeatherSnap | null = await fetchWeather(coords.lat, coords.lon, coords.place)
    if (!snap) {
      return makeToolResult({
        toolId: 'weather.forecast',
        success: false,
        source: 'open-meteo',
        sourceType: 'live_api',
        isRealData: false,
        errorCode: 'weather_fetch_failed',
        errorMessage: '현재 날씨 API 응답 없음',
        confidence: 0,
      })
    }
    const precip = snap.precipProb
    const data: EngineWeatherSnapshot = {
      city: coords.place,
      dayLabel: day === '지금' ? '지금' : '오늘',
      label: snap.label,
      tempC: snap.tempC,
      precipProb: precip,
      rainingLikely: (precip != null && precip >= 40) || /비|소나기|뇌우|이슬비/.test(snap.label),
      source: snap.source,
      fetchedAt: Date.now(),
    }
    return makeToolResult({
      toolId: 'weather.forecast',
      success: true,
      data,
      source: snap.source,
      sourceType: 'live_api',
      isRealData: true,
      confidence: 0.9,
    })
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return makeToolResult({
      toolId: 'weather.forecast',
      success: false,
      source: 'open-meteo',
      sourceType: 'live_api',
      isRealData: false,
      errorCode: 'offline',
      errorMessage: '오프라인',
      confidence: 0,
    })
  }

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
    if (!res.ok) {
      return makeToolResult({
        toolId: 'weather.forecast',
        success: false,
        source: 'open-meteo-daily',
        sourceType: 'live_api',
        isRealData: false,
        errorCode: 'http_error',
        errorMessage: `HTTP ${res.status}`,
        confidence: 0,
      })
    }
    const payload = (await res.json()) as DailyPayload
    const times = payload.daily?.time || []
    const codes = payload.daily?.weather_code || []
    const precip = payload.daily?.precipitation_probability_max || []
    const temps = payload.daily?.temperature_2m_max || []
    const idx = dayOffset(day)
    if (!times[idx] || codes[idx] == null) {
      return makeToolResult({
        toolId: 'weather.forecast',
        success: false,
        source: 'open-meteo-daily',
        sourceType: 'live_api',
        isRealData: false,
        errorCode: 'daily_missing',
        errorMessage: '일별 예보 슬롯 없음',
        confidence: 0,
      })
    }
    const label = weatherLabel(codes[idx]!)
    const precipProb = precip[idx] ?? null
    const data: EngineWeatherSnapshot = {
      city: coords.place,
      dayLabel: day,
      label,
      tempC: temps[idx] ?? null,
      precipProb,
      rainingLikely:
        (precipProb != null && precipProb >= 40) || /비|소나기|뇌우|이슬비/.test(label),
      source: 'open-meteo-daily',
      fetchedAt: Date.now(),
    }
    return makeToolResult({
      toolId: 'weather.forecast',
      success: true,
      data,
      source: 'open-meteo-daily',
      sourceType: 'live_api',
      isRealData: true,
      confidence: 0.9,
    })
  } catch (e) {
    return makeToolResult({
      toolId: 'weather.forecast',
      success: false,
      source: 'open-meteo-daily',
      sourceType: 'live_api',
      isRealData: false,
      errorCode: 'exception',
      errorMessage: e instanceof Error ? e.message : 'fetch error',
      confidence: 0,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** @deprecated use runWeatherTool */
export async function fetchCityDayWeather(
  city: string,
  day: EngineWeatherSnapshot['dayLabel'],
): Promise<EngineWeatherSnapshot | null> {
  const r = await runWeatherTool(city, day)
  return r.success ? r.data : null
}

export function formatWeatherReply(w: EngineWeatherSnapshot, isRealData?: boolean): string {
  const temp = w.tempC != null ? ` · 최고 ${Math.round(w.tempC)}°` : ''
  const rain = w.precipProb != null ? ` · 강수확률 ${Math.round(w.precipProb)}%` : ''
  const rainLine = w.rainingLikely
    ? `${w.dayLabel} ${w.city}은(는) 비 올 가능성이 있어요.`
    : `${w.dayLabel} ${w.city}은(는) 비 올 가능성이 낮아요.`
  const srcTag = isRealData === false ? `${w.source} · 비실데이터` : w.source
  return [`【날씨 · ${srcTag}】`, rainLine, `${w.label}${temp}${rain}`].join('\n')
}
