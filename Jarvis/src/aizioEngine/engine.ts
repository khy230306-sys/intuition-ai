/**
 * AIZIO Core Engine V1 — orchestrates REAL tools for a short multi-turn goal.
 *
 * Success criteria (single conversation):
 * 1) weather query with city → Open-Meteo
 * 2) family place seek → search/curated (never DEMO restaurant)
 * 3) ordinal select → session memory
 * 4) calendar write → real reminder storage + verify
 */

import { openMaps } from '../actions'
import { getActiveTask } from '../actionAgent'
import { parseSelectionIndex } from '../actionAgent/slotResolver'
import type { BrainReply } from '../types'
import {
  classifyEngineTurn,
  extractEngineCity,
  extractWeatherDay,
} from './detect'
import {
  clearEngineSession,
  ensureEngineSession,
  loadEngineSession,
  saveEngineSession,
} from './session'
import { formatCalendarReply, writeCalendarFromSelection } from './tools/calendarTool'
import { formatPlacesReply, seekFamilyPlaces } from './tools/placesTool'
import { fetchCityDayWeather, formatWeatherReply } from './tools/weatherTool'
/** Exposed for tests — full turn handler. */
export async function runAizioEngineTurn(raw: string): Promise<BrainReply | null> {
  const text = raw.trim()
  if (!text) return null

  let session = loadEngineSession()
  const kind = classifyEngineTurn(text, session)

  if (kind === 'none') return null

  if (kind === 'cancel') {
    clearEngineSession()
    return { text: '진행 중이던 작업을 초기화했어요.', speak: true }
  }

  if (kind === 'weather') {
    // Yield to Action Agent travel interrupt / resume flow
    const active = getActiveTask()
    if (active?.type?.startsWith('travel') && active.status !== 'cancelled') {
      return null
    }
    const city = extractEngineCity(text) || session?.city || ''
    if (!city) {
      session = ensureEngineSession({})
      return {
        text: '어느 지역 날씨를 볼까요? (예: 울산, 서울)',
        speak: true,
      }
    }
    const day = extractWeatherDay(text)
    const weather = await fetchCityDayWeather(city, day)
    if (!weather) {
      return {
        text: `${day} ${city} 날씨를 가져오지 못했어요. 네트워크를 확인한 뒤 다시 물어봐 주세요.`,
        speak: true,
      }
    }
    session = ensureEngineSession({
      city,
      weather,
      lastVerified: { ...(session?.lastVerified || {}), weather: true },
    })
    const rainHint = weather.rainingLikely
      ? '\n비 소식이 있으면 실내 위주로 찾아볼까요?'
      : '\n비 걱정이 적으면 야외도 괜찮아요. 아이와 갈 곳을 찾아볼까요?'
    return {
      text: formatWeatherReply(weather) + rainHint,
      speak: true,
    }
  }

  if (kind === 'place_seek') {
    const city =
      extractEngineCity(text) || session?.city || session?.weather?.city || ''
    if (!city) {
      session = ensureEngineSession({})
      return { text: '어느 지역에서 찾을까요? (예: 울산)', speak: true }
    }

    // Optional: if prior weather said rain likely and user said "비 안 오면", note it
    let weatherNote: string | undefined
    if (session?.weather) {
      weatherNote = session.weather.rainingLikely
        ? `${session.weather.dayLabel} ${city} 강수확률을 감안해 실내·체험 위주로 골랐어요.`
        : `${session.weather.dayLabel} ${city}은(는) 비 가능성이 낮아 야외도 포함했어요.`
    }

    const found = await seekFamilyPlaces({ city, utterance: text })
    session = ensureEngineSession({
      city,
      places: found.candidates,
      placesQuery: found.query,
      selected: undefined,
      lastVerified: {
        ...(session?.lastVerified || {}),
        places: found.candidates.length > 0,
      },
    })

    const mapsQ = found.candidates[0]?.mapsQuery || found.query
    return {
      text: formatPlacesReply(city, found.candidates, weatherNote),
      speak: true,
      action: () => {
        void openMaps(mapsQ)
      },
    }
  }

  if (kind === 'select') {
    if (!session?.places?.length) return null
    const idx = parseSelectionIndex(text)
    if (idx == null) {
      return { text: '몇 번을 고를까요? 예: 「두 번째」', speak: true }
    }
    const hit = session.places.find((p) => p.rank === idx) || session.places[idx - 1]
    if (!hit) {
      return {
        text: `그 번호는 없어요. 1~${session.places.length}번 중에서 골라 주세요.`,
        speak: true,
      }
    }
    session = saveEngineSession({
      ...session,
      selected: hit,
      lastVerified: { ...(session.lastVerified || {}), select: true },
    })
    return {
      text: [
        `「${hit.title}」을(를) 선택했어요.`,
        hit.subtitle ? hit.subtitle : '',
        '일정을 잡을까요? 예: 「토요일 오후 2시에 일정 잡아줘」',
      ]
        .filter(Boolean)
        .join('\n'),
      speak: true,
      action: () => {
        void openMaps(hit.mapsQuery)
      },
    }
  }

  if (kind === 'calendar_write') {
    if (!session) return null
    const selected =
      session.selected ||
      (session.places.length === 1 ? session.places[0] : undefined)
    if (!selected) {
      return {
        text: '먼저 장소를 골라 주세요. 예: 「두 번째가 괜찮네」',
        speak: true,
      }
    }
    const written = await writeCalendarFromSelection({
      utterance: text,
      selected,
      city: session.city,
    })
    if (!written.ok) {
      return { text: written.message, speak: true }
    }
    session = saveEngineSession({
      ...session,
      selected,
      lastCalendar: written.write,
      lastVerified: { ...(session.lastVerified || {}), calendar: written.write.verified },
    })
    return {
      text: formatCalendarReply(written.write),
      speak: true,
    }
  }

  return null
}

/**
 * Chat entry — returns null when utterance is outside engine scope
 * so legacy / Action Agent / Core Brain continue.
 */
export async function tryHandleAizioEngine(raw: string): Promise<BrainReply | null> {
  try {
    return await runAizioEngineTurn(raw)
  } catch {
    return null
  }
}
