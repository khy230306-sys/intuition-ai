/**
 * Chat/voice entry for Navigation v2 — never auto-opens external maps.
 */

import { classifyNavV2Intent, type NavV2Intent } from './navigationIntent'
import {
  clearNavV2Context,
  getNavV2Context,
  hasActiveNavContext,
  patchNavV2Context,
  selectCandidateByIndex,
  setCandidates,
  setRoutes,
} from './navigationContext'
import { requestCurrentPosition } from './geolocationService'
import { formatDistance, formatDuration } from './geolocationService'
import { searchPlaces } from './placeSearchService'
import { calculateRoutes } from './routingService'
import { loadNavV2Settings, pushRecentSearch, saveNavV2Settings } from './navigationStorage'
import type { PlaceCandidate } from './types'

export type NavV2HandleResult = {
  handled: boolean
  text: string
  speak?: boolean
  view?: 'navigation'
  /** Structured candidates for chat cards */
  candidates?: PlaceCandidate[]
  query?: string
  catalogOnly?: boolean
  openNav?: boolean
  /** When local catalog is empty for food/venue — open maps with this query */
  mapsQuery?: string
  searchQuery?: string
}

function cardsPreview(list: PlaceCandidate[], catalogOnly: boolean): string {
  const head = catalogOnly
    ? 'Preview 로컬 카탈로그 결과입니다. (전국 실시간 검색이 아닙니다)'
    : '검색 결과입니다.'
  const lines = list.slice(0, 3).map((c, i) => {
    const dist = c.distanceM != null ? formatDistance(c.distanceM) : '거리 미확인'
    return `${i + 1}. ${c.name}\n   ${c.address}\n   ${dist}`
  })
  const more = list.length > 3 ? `\n나머지 ${list.length - 3}곳은 지도에서 더 볼 수 있어요.` : ''
  return `${head}\n${lines.join('\n')}${more}\n「1번」「두 번째」「지도에서 보기」로 선택하세요.`
}

async function originOrNull() {
  const loc = await requestCurrentPosition({ timeoutMs: 6000 })
  return loc.ok && loc.fix ? loc.fix.coords : null
}

async function runSearch(query: string): Promise<NavV2HandleResult> {
  const origin = await originOrNull()
  if (origin) patchNavV2Context({ origin })
  const result = await searchPlaces(query, { origin, limit: 7, allowRemote: true })
  pushRecentSearch(query)
  if (!result.ok && result.errorCode === 'empty') {
    return { handled: true, text: '장소를 입력해 주세요.', speak: true }
  }
  if (!result.candidates.length) {
    const mapsQ = result.externalMapsQuery || query
    const foodish = /맛집|식당|음식점|밥집|카페|술집|먹을\s*곳|브런치|분식/.test(query)
    if (foodish) {
      return {
        handled: true,
        text:
          `「${query}」로 지도·웹 검색을 열게요.\n` +
          `AIZIO 목록에 아직 이 지역 식당이 없어요. 카카오맵·T맵에서 바로 고르거나, 「한식」「고기집」처럼 메뉴를 더해 주세요.`,
        speak: true,
        candidates: [],
        query,
        catalogOnly: true,
        mapsQuery: mapsQ,
        searchQuery: `${query} 추천`,
      }
    }
    return {
      handled: true,
      text:
        `「${query}」관련 장소를 찾지 못했어요.\n` +
        `검색어를 바꿔 보시거나, 카카오맵·T맵에서 「${mapsQ}」로 바로 찾아보세요.`,
      speak: true,
      candidates: [],
      query,
      catalogOnly: true,
      mapsQuery: mapsQ,
    }
  }
  setCandidates(query, result.candidates, origin)
  const locNote = origin
    ? ''
    : '\n위치 권한을 허용하면 가까운 순서로 볼 수 있어요.'
  return {
    handled: true,
    text: `「${query}」관련 장소를 ${result.candidates.length}곳 찾았어요.\n${cardsPreview(result.candidates, result.catalogOnly)}${locNote}`,
    speak: true,
    // Stay in chat so place cards render; user opens map via 「지도에서 보기」
    openNav: false,
    candidates: result.candidates,
    query,
    catalogOnly: result.catalogOnly,
  }
}

async function buildRouteForSelected(): Promise<NavV2HandleResult> {
  const ctx = getNavV2Context()
  const dest = ctx.destination || ctx.selected
  if (!dest) {
    return { handled: true, text: '먼저 장소 후보를 선택해 주세요. 예: 「두 번째」', speak: true }
  }
  let origin = ctx.origin
  if (!origin) {
    origin = await originOrNull()
    if (origin) patchNavV2Context({ origin })
  }
  if (!origin) {
    // Use a city center near destination so preview still works; label approximate
    origin = { lat: dest.lat + 0.01, lng: dest.lng + 0.01 }
    patchNavV2Context({ origin })
  }
  const mode = loadNavV2Settings().travelMode
  const calc = await calculateRoutes(origin, dest, mode)
  if (!calc.ok || !calc.routes.length) {
    return {
      handled: true,
      text: '경로를 계산하지 못했어요. 출발지와 목적지를 확인한 뒤 다시 시도해 주세요.',
      speak: true,
      view: 'navigation',
      openNav: true,
    }
  }
  setRoutes(calc.routes, mode)
  const r = calc.routes[0]!
  const approx = r.approximate ? ' (대략 경로 · 라우팅 서버 제한 가능)' : ''
  return {
    handled: true,
    text: `${dest.name}까지 ${mode === 'walking' ? '도보' : mode === 'cycling' ? '자전거' : '자동차'} 경로를 준비했어요${approx}.\n거리 ${formatDistance(r.distanceM)} · ${formatDuration(r.durationSec)}\n지도에서 「안내 시작」을 누르거나 「안내 시작」이라고 말해 주세요.`,
    speak: true,
    view: 'navigation',
    openNav: true,
  }
}

export async function tryHandleNavigationV2(text: string): Promise<NavV2HandleResult | null> {
  const active = hasActiveNavContext()
  const intent = classifyNavV2Intent(text, { hasActiveContext: active })
  if (intent.kind === 'none' || intent.kind === 'chat_about_place') return null

  if (intent.kind === 'open_navigation') {
    return {
      handled: true,
      text: 'AIZIO 내부 길안내 지도를 열게요. 목적지를 검색해 주세요.',
      speak: true,
      view: 'navigation',
      openNav: true,
    }
  }

  if (intent.kind === 'clear') {
    clearNavV2Context()
    return { handled: true, text: '길안내 검색을 초기화했어요. 새 장소를 말해 주세요.', speak: true }
  }

  if (intent.kind === 'select_index' && intent.index != null) {
    const selected = selectCandidateByIndex(intent.index)
    if (!selected) {
      return { handled: true, text: '선택할 후보가 없어요. 먼저 장소를 검색해 주세요.', speak: true }
    }
    return {
      handled: true,
      text: `AIZIO가 ${intent.index === -1 ? '마지막' : intent.index + '번'} 「${selected.name}」을(를) 선택했습니다. 여기로 안내할까요? 「자동차로」「걸어서」「안내 시작」또는 「지도에서 보기」로 이어가세요.`,
      speak: true,
      openNav: false,
    }
  }

  if (intent.kind === 'change_mode' && intent.mode) {
    saveNavV2Settings({ travelMode: intent.mode })
    patchNavV2Context({ travelMode: intent.mode })
    if (getNavV2Context().destination || getNavV2Context().selected) {
      return buildRouteForSelected()
    }
    return {
      handled: true,
      text: `이동수단을 ${intent.mode === 'walking' ? '도보' : intent.mode === 'cycling' ? '자전거' : '자동차'}로 설정했어요.`,
      speak: true,
    }
  }

  if (intent.kind === 'start_guidance') {
    const ctx = getNavV2Context()
    if (!ctx.routes.length) {
      if (ctx.selected || ctx.destination) return buildRouteForSelected()
      return { handled: true, text: '안내할 경로가 없어요. 장소를 선택한 뒤 다시 시도해 주세요.', speak: true }
    }
    patchNavV2Context({ guiding: true, stepIndex: 0 })
    const step = ctx.routes.find((r) => r.id === ctx.activeRouteId)?.steps[0]
    return {
      handled: true,
      text: `안내를 시작할게요. ${step?.instruction || '경로를 따라가 주세요.'}`,
      speak: true,
      view: 'navigation',
      openNav: true,
    }
  }

  if (intent.kind === 'stop_guidance') {
    patchNavV2Context({ guiding: false })
    return { handled: true, text: '안내를 종료했어요.', speak: true, view: 'navigation', openNav: true }
  }

  if (intent.kind === 'place_search' || intent.kind === 'nearby_search') {
    return runSearch(intent.query || text)
  }

  if (intent.kind === 'show_more') {
    return {
      handled: true,
      text: '지도에서 전체 후보를 확인해 주세요.',
      speak: true,
      view: 'navigation',
      openNav: true,
      candidates: getNavV2Context().candidates,
      query: getNavV2Context().lastQuery,
    }
  }

  return null
}

export function peekNavV2Intent(text: string): NavV2Intent {
  return classifyNavV2Intent(text, { hasActiveContext: hasActiveNavContext() })
}
