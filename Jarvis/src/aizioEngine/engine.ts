/**
 * AIZIO Core Engine V1.2 — Context → Permission → Tool → Verify → Reply
 * Places/Calendar via Provider Registry (no curated Production fallback).
 */

import { openMaps } from '../actions'
import { getActiveTask } from '../actionAgent'
import { parseSelectionIndex } from '../actionAgent/slotResolver'
import type { BrainReply } from '../types'
import {
  isDuplicateRequest,
  mergeDateTime,
  rememberTool,
  requestFingerprint,
  resolveContextRef,
  updateGoal,
} from './context'
import {
  classifyEngineTurn,
  extractEngineCity,
  extractWeatherDay,
} from './detect'
import { checkPermission } from './permission'
import {
  clearEngineSession,
  ensureEngineSession,
  getSessionContext,
  loadEngineSession,
} from './session'
import { formatCalendarReply, runCalendarWriteTool } from './tools/calendarTool'
// aiEnrich intentionally unused on the critical path (release speed gate).
import {
  formatPlacesDegradedNote,
  formatPlacesReply,
  formatPlacesUnavailable,
  runPlacesTool,
} from './tools/placesTool'
import { formatWeatherReply, runWeatherTool } from './tools/weatherTool'
import { offlineUserMessage } from '../offline/connectionModel'
import {
  containsForbiddenSuccessClaim,
  verifyCalendarWrite,
  verifyPlacesResult,
  verifyWeatherResult,
} from './verifier'

function stampRequest(
  sessionId: string,
  ctxUpdate: ReturnType<typeof getSessionContext>,
  key: string,
) {
  return ensureEngineSession({
    id: sessionId,
    context: {
      ...ctxUpdate,
      lastRequestKey: key,
      lastRequestAt: Date.now(),
    },
  })
}

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

  let ctx = getSessionContext(session)
  ctx = mergeDateTime(ctx, text)

  // —— WEATHER (LEVEL 0) ——
  if (kind === 'weather') {
    const active = getActiveTask()
    if (active?.type?.startsWith('travel') && active.status !== 'cancelled') return null

    const perm = checkPermission('weather.read')
    if (!perm.allowed) {
      return { text: perm.reason, speak: true }
    }

    const city = extractEngineCity(text) || ctx.city || ''
    if (!city) {
      session = ensureEngineSession({ context: updateGoal(ctx, 'weather_only') })
      return { text: '어느 지역 날씨를 볼까요? (예: 울산, 서울)', speak: true }
    }

    const day = extractWeatherDay(text)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { text: offlineUserMessage('weather'), speak: true }
    }
    const reqKey = requestFingerprint('weather', `${city}|${day}`)
    if (session && isDuplicateRequest(ctx, reqKey)) {
      const prev = ctx.lastTools['weather.forecast']
      if (prev?.success && prev.data) {
        return {
          text: formatWeatherReply(prev.data as never, prev.isRealData) + '\n(방금 조회한 결과예요)',
          speak: true,
        }
      }
    }

    const toolRaw = await runWeatherTool(city, day)
    const verified = verifyWeatherResult(toolRaw)
    ctx = rememberTool(updateGoal({ ...ctx, city }, 'outings_plan', '나들이 계획'), verified.result)
    if (verified.ok && verified.result.data) {
      ctx = { ...ctx, weather: verified.result.data, city }
    }
    session = ensureEngineSession({
      context: { ...ctx, lastRequestKey: reqKey, lastRequestAt: Date.now() },
      lastVerified: { weather: verified.ok },
    })

    if (!verified.ok || !verified.result.data) {
      const msg =
        verified.userMessage ||
        verified.result.errorMessage ||
        `${day} ${city} 날씨를 확인하지 못했어요.`
      if (containsForbiddenSuccessClaim(msg)) {
        return { text: '날씨 조회에 실패했습니다.', speak: true }
      }
      return { text: msg, speak: true }
    }

    const w = verified.result.data
    const rainHint = w.rainingLikely
      ? '\n비 소식이 있으면 실내 위주로 찾아볼까요?'
      : '\n비 걱정이 적으면 야외도 괜찮아요. 아이와 갈 곳을 찾아볼까요?'
    const tip = ''
    return {
      text:
        formatWeatherReply(w, verified.result.isRealData) +
        rainHint +
        (tip ? `\n\n💡 ${tip}` : ''),
      speak: true,
    }
  }

  // —— PLACES (LEVEL 0) ——
  if (kind === 'place_seek') {
    const perm = checkPermission('places.search')
    if (!perm.allowed) return { text: perm.reason, speak: true }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { text: offlineUserMessage('places'), speak: true }
    }
    const city = extractEngineCity(text) || ctx.city || ctx.weather?.city || ''
    if (!city) {
      session = ensureEngineSession({ context: ctx })
      return { text: '어느 지역에서 찾을까요? (예: 울산)', speak: true }
    }

    const reqKey = requestFingerprint('places', `${city}|${text}`)
    if (session && isDuplicateRequest(ctx, reqKey) && ctx.places.length) {
      return {
        text: formatPlacesReply(city, ctx.places, undefined, '(방금 찾은 목록이에요)'),
        speak: true,
      }
    }

    let weatherNote: string | undefined
    if (ctx.weather) {
      weatherNote = ctx.weather.rainingLikely
        ? `${ctx.weather.dayLabel} ${city} 강수확률을 감안해 실내·체험 위주로 골랐어요.`
        : `${ctx.weather.dayLabel} ${city}은(는) 비 가능성이 낮아 야외도 포함했어요.`
    }

    const toolRaw = await runPlacesTool({ city, utterance: text })
    const verified = verifyPlacesResult(toolRaw)
    ctx = rememberTool({ ...ctx, city }, verified.result)

    if (!verified.ok || !verified.result.data?.candidates.length) {
      session = ensureEngineSession({
        context: { ...ctx, places: [], lastRequestKey: reqKey, lastRequestAt: Date.now() },
        lastVerified: { places: false },
      })
      const msg =
        verified.userMessage ||
        verified.result.errorMessage ||
        '실제 장소 검색 서비스를 연결해야 합니다.'
      return {
        text: formatPlacesUnavailable(msg),
        speak: true,
      }
    }

    const candidates = verified.result.data.candidates
    const toolData = verified.result.data
    const sourceNote =
      toolData.degraded || verified.result.degraded
        ? formatPlacesDegradedNote(
            toolData.provider || verified.result.provider || 'provider',
            toolData.missingCapabilities || verified.result.missingCapabilities || [],
            toolData.fallbackFrom || null,
          )
        : verified.result.isRealData
          ? `※ 실제 외부 장소 데이터 (${verified.result.provider || 'provider'})`
          : '※ 장소 데이터가 REAL 검증을 통과하지 못했습니다.'

    ctx = {
      ...ctx,
      city,
      places: candidates,
      placesQuery: verified.result.data.query,
      selected: undefined,
      selectedRank: undefined,
      lastRequestKey: reqKey,
      lastRequestAt: Date.now(),
    }
    ctx = updateGoal(ctx, 'outings_plan', '나들이 계획')
    session = ensureEngineSession({
      context: ctx,
      lastVerified: { places: true },
    })

    const mapsQ = candidates[0]?.mapsQuery || verified.result.data.query
    const body = formatPlacesReply(city, candidates, weatherNote, sourceNote)
    return {
      text: body,
      speak: true,
      action: () => {
        void openMaps(mapsQ)
      },
    }
  }

  // —— SELECT (LEVEL 0) ——
  if (kind === 'select') {
    const perm = checkPermission('places.select')
    if (!perm.allowed) return { text: perm.reason, speak: true }

    if (!ctx.places.length) {
      return {
        text: '선택할 장소 후보가 없어요. 먼저 「아이들이랑 갈 만한 곳 찾아줘」처럼 찾아 주세요.',
        speak: true,
      }
    }

    let hit = ctx.selected
    const ref = resolveContextRef(text, ctx)
    if (ref?.kind === 'place_by_rank') hit = ref.place
    else if (ref?.kind === 'selected_place') hit = ref.place
    else if (ref?.kind === 'unresolved' && ref.reason === 'no_place_at_rank') {
      return {
        text: `그 번호는 없어요. 1~${ctx.places.length}번 중에서 골라 주세요.`,
        speak: true,
      }
    } else {
      const idx = parseSelectionIndex(text)
      if (idx == null) {
        return { text: '몇 번을 고를까요? 예: 「두 번째」 / 「아까 두 번째 말한 곳」', speak: true }
      }
      hit = ctx.places.find((p) => p.rank === idx) || ctx.places[idx - 1]
      if (!hit) {
        return {
          text: `그 번호는 없어요. 1~${ctx.places.length}번 중에서 골라 주세요.`,
          speak: true,
        }
      }
    }

    if (!hit) {
      return { text: '장소를 특정하지 못했어요.', speak: true }
    }

    ctx = {
      ...ctx,
      selected: hit,
      selectedRank: hit.rank,
    }
    session = ensureEngineSession({
      context: ctx,
      lastVerified: { select: true },
    })

    // memory verify
    const memOk =
      loadEngineSession()?.context.selected?.id === hit.id &&
      loadEngineSession()?.context.selected?.title === hit.title

    return {
      text: [
        `「${hit.title}」을(를) 선택했어요.`,
        hit.subtitle ? hit.subtitle : '',
        memOk ? '' : '선택 기억 확인에 실패했어요. 다시 번호를 말해 주세요.',
        '일정을 잡을까요? 예: 「토요일 오후 2시에 일정에 넣어줘」 / 「거기 일정 넣어줘」',
      ]
        .filter(Boolean)
        .join('\n'),
      speak: true,
      action: () => {
        void openMaps(hit!.mapsQuery)
      },
    }
  }

  // —— PLACE HOURS (selected place; never invent opening hours) ——
  if (kind === 'place_hours') {
    const place = ctx.selected || session?.selected
    if (!place) {
      return {
        text: '어떤 장소의 영업 시간을 볼까요? 먼저 목록에서 번호를 골라 주세요.',
        speak: true,
      }
    }
    return {
      text: [
        `「${place.title}」의 정확한 영업 시간은 이 검색 결과에 포함되어 있지 않아요.`,
        '지도를 열어 영업시간을 확인해 드릴까요? 예: 「지도로 보여줘」',
        place.address ? `주소: ${place.address}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      speak: true,
      action: () => {
        void openMaps(place.mapsQuery)
      },
    }
  }

  // —— CALENDAR LOCAL WRITE (LEVEL 1) ——
  if (kind === 'calendar_write') {
    // Resolve 「거기」 etc.
    const ref = resolveContextRef(text, ctx)
    if (ref?.kind === 'selected_place') {
      ctx = { ...ctx, selected: ref.place, selectedRank: ref.place.rank }
    } else if (ref?.kind === 'place_by_rank') {
      ctx = { ...ctx, selected: ref.place, selectedRank: ref.rank }
    } else if (ref?.kind === 'unresolved' && /거기|그거|아까|지난번/.test(text)) {
      return {
        text:
          ref.reason === 'ambiguous_place'
            ? '어느 곳인지 헷갈려요. 「두 번째」처럼 골라 주세요.'
            : '기억된 장소가 없어요. 먼저 장소를 찾아 선택해 주세요.',
        speak: true,
      }
    }

    const selected =
      ctx.selected || (ctx.places.length === 1 ? ctx.places[0] : undefined)
    if (!selected) {
      return {
        text: '먼저 장소를 골라 주세요. 예: 「두 번째가 괜찮네」 / 「아까 두 번째 말한 곳」',
        speak: true,
      }
    }

    const reqKey = requestFingerprint(
      'calendar',
      `${selected.id}|${text}|${ctx.dateTime.dayHint || ''}|${ctx.dateTime.timeHint || ''}`,
    )
    if (session && isDuplicateRequest(ctx, reqKey) && ctx.lastTools['calendar.local_write']?.success) {
      const prev = ctx.lastTools['calendar.local_write']
      if (prev.data && prev.verifiedAt) {
        return {
          text: formatCalendarReply(prev.data as never, true) + '\n(방금 저장한 일정이에요)',
          speak: true,
        }
      }
    }

    const toolRaw = await runCalendarWriteTool({
      utterance: text,
      selected,
      city: ctx.city,
      dateTime: ctx.dateTime,
    })

    if (toolRaw.status === 'needs_input') {
      session = ensureEngineSession({ context: { ...ctx, selected } })
      return { text: toolRaw.errorMessage || '언제로 잡을까요?', speak: true }
    }

    const verified = await verifyCalendarWrite(toolRaw)
    ctx = rememberTool(
      {
        ...ctx,
        selected,
        dateTime: verified.ok && verified.result.data
          ? {
              ...ctx.dateTime,
              whenAt: verified.result.data.whenAt,
              whenLabel: verified.result.data.whenLabel,
            }
          : ctx.dateTime,
        lastRequestKey: reqKey,
        lastRequestAt: Date.now(),
      },
      verified.result,
    )

    session = ensureEngineSession({
      context: ctx,
      lastCalendar: verified.result.data || undefined,
      lastVerified: { calendar: verified.ok },
    })

    if (!verified.ok || !verified.result.data) {
      const msg = verified.userMessage || verified.result.errorMessage || '일정 저장을 확인하지 못했어요.'
      if (containsForbiddenSuccessClaim(msg)) {
        return { text: '일정 저장을 확인하지 못했어요.', speak: true }
      }
      return { text: msg, speak: true }
    }

    return { text: formatCalendarReply(verified.result.data, true), speak: true }
  }

  return null
}

export async function tryHandleAizioEngine(raw: string): Promise<BrainReply | null> {
  try {
    return await runAizioEngineTurn(raw)
  } catch {
    return null
  }
}

// keep helper referenced for future dedupe helpers
void stampRequest
