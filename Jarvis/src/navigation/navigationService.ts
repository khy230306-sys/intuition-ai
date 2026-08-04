/**
 * Orchestrate navigation intents → safe map open.
 */

import type { ActionResult } from '../types'
import { navigateHref, openUrl } from '../actions'
import { parseNavigationIntent, wantsNavigation } from './navigationParser'
import {
  clearNavSession,
  loadNavSession,
  loadNavigationSettings,
  saveNavSession,
} from './navigationStorage'
import { queryGeoPermission, requestCurrentPosition } from './navigationPermissions'
import { buildMapLinks, buildMapTestSearchUrl, isSafeMapUrl } from './navigationUrlBuilder'
import type {
  MapProviderId,
  NavigationIntent,
  TravelMode,
} from './navigationTypes'

export type NavigationHandleResult = {
  handled: boolean
  text: string
  speak?: boolean
  action?: () => ActionResult
  /** Open settings to fill home/work */
  openSettings?: boolean
  /** Open navigation sheet on HOME v2 */
  openSheet?: boolean
  needsDestination?: boolean
}

function resolveDestination(intent: NavigationIntent): {
  query: string
  missingSaved?: 'home' | 'work'
  nearby: boolean
} {
  const settings = loadNavigationSettings()
  if (intent.savedPlaceId === 'home') {
    const addr = settings.home?.addressText?.trim()
    if (!addr) return { query: '', missingSaved: 'home', nearby: false }
    return { query: addr, nearby: false }
  }
  if (intent.savedPlaceId === 'work') {
    const addr = settings.work?.addressText?.trim()
    if (!addr) return { query: '', missingSaved: 'work', nearby: false }
    return { query: addr, nearby: false }
  }
  const nearby = intent.intent === 'navigation.search_nearby' || intent.destinationType === 'category'
  return { query: intent.destinationText.trim(), nearby }
}

function applySessionOverrides(intent: NavigationIntent): NavigationIntent {
  const session = loadNavSession()
  let next = { ...intent }
  // 「도보로 바꿔줘」 style — reuse last destination
  if ((!next.destinationText || next.missingFields.includes('destinationText')) && session) {
    const onlyModeOrMap =
      /바꿔|다시|그곳|거기|방금|같은\s*곳|도보로|차로|대중교통|카카오|네이버|구글|애플/.test(
        next.originalText,
      )
    if (onlyModeOrMap || !next.destinationText) {
      next = {
        ...next,
        destinationText: session.destinationText,
        missingFields: next.missingFields.filter((f) => f !== 'destinationText'),
        destinationType: next.destinationType === 'unknown' ? 'place' : next.destinationType,
      }
    }
  }
  const settings = loadNavigationSettings()
  if (next.travelMode === 'unspecified' && settings.defaultTravelMode !== 'unspecified') {
    next = { ...next, travelMode: settings.defaultTravelMode }
  }
  if (next.preferredMap === 'system' && settings.defaultMap !== 'system') {
    next = { ...next, preferredMap: settings.defaultMap }
  }
  return next
}

function openBuiltLinks(links: ReturnType<typeof buildMapLinks>): ActionResult {
  if (!isSafeMapUrl(links.webUrl)) {
    return { ok: false, message: '허용되지 않은 지도 링크입니다.' }
  }
  if (links.appUrl && isSafeMapUrl(links.appUrl)) {
    navigateHref(links.appUrl, { newTab: false })
  }
  return openUrl(links.webUrl, links.label)
}

export async function executeNavigationIntent(
  intentIn: NavigationIntent,
  opts?: { requestLocation?: boolean },
): Promise<NavigationHandleResult> {
  const intent = applySessionOverrides(intentIn)

  if (intent.intent === 'navigation.open_map' && !intent.destinationText) {
    const links = buildMapTestSearchUrl(intent.preferredMap)
    return {
      handled: true,
      text: `${links.label}을(를) 엽니다.`,
      speak: true,
      action: () => openBuiltLinks(links),
    }
  }

  const dest = resolveDestination(intent)
  if (dest.missingSaved === 'home') {
    return {
      handled: true,
      text: '집 주소가 아직 저장되지 않았어요. 설정 → 길안내 및 지도에서 지금 설정할까요?',
      speak: true,
      openSettings: true,
    }
  }
  if (dest.missingSaved === 'work') {
    return {
      handled: true,
      text: '회사 주소가 아직 저장되지 않았어요. 설정 → 길안내 및 지도에서 지금 설정할까요?',
      speak: true,
      openSettings: true,
    }
  }
  if (!dest.query) {
    return {
      handled: true,
      text: '어디로 안내해 드릴까요?',
      speak: true,
      needsDestination: true,
      openSheet: true,
    }
  }

  let origin: { lat: number; lng: number } | null = null
  let locationNote = ''
  if (dest.nearby || opts?.requestLocation) {
    const perm = await queryGeoPermission()
    if (perm === 'granted' || perm === 'prompt' || perm === 'unknown') {
      if (opts?.requestLocation !== false) {
        const loc = await requestCurrentPosition({ timeoutMs: 10_000 })
        if (loc.ok && loc.coords) {
          origin = loc.coords
        } else if (dest.nearby) {
          locationNote =
            loc.errorCode === 'denied' || loc.permission === 'denied'
              ? '현재 위치 권한이 없어 주변 검색 화면을 열게요.'
              : '현재 위치를 확인하지 못해 지도 검색 화면을 열게요.'
        }
      }
    } else if (dest.nearby) {
      locationNote = '현재 위치 권한이 없어 주변 검색 화면을 열게요.'
    }
  }

  const travelMode: TravelMode =
    intent.travelMode === 'unspecified' ? 'unspecified' : intent.travelMode
  const links = buildMapLinks({
    query: dest.query,
    travelMode,
    preferredMap: intent.preferredMap,
    nearby: dest.nearby,
    origin,
  })

  saveNavSession({
    destinationText: dest.query,
    travelMode: intent.travelMode,
    preferredMap: intent.preferredMap,
  })

  const modeLabel =
    travelMode === 'walking'
      ? '도보'
      : travelMode === 'transit'
        ? '대중교통'
        : travelMode === 'bicycling'
          ? '자전거'
          : travelMode === 'driving'
            ? '자동차'
            : ''

  const destLabel =
    intent.savedPlaceId === 'home' ? '집' : intent.savedPlaceId === 'work' ? '회사' : intent.destinationText

  let text = locationNote
    ? `${locationNote} ${links.label}에서 「${destLabel}」을(를) 열게요.`
    : modeLabel
      ? `${destLabel}까지 ${modeLabel} 경로를 ${links.label}에서 열게요.`
      : `${destLabel} 길찾기를 ${links.label}에서 열게요.`

  if (/긴급|응급|화재|경찰/.test(intent.originalText)) {
    text += ' 긴급 상황이라면 지도보다 현지 긴급전화(112·119)를 이용해 주세요.'
  }

  return {
    handled: true,
    text: text.trim(),
    speak: true,
    action: () => openBuiltLinks(links),
  }
}

export async function tryHandleNavigation(text: string): Promise<NavigationHandleResult | null> {
  if (!wantsNavigation(text)) return null
  const intent = parseNavigationIntent(text)
  if (!intent) return null
  return executeNavigationIntent(intent, { requestLocation: intent.originMode === 'current_location' })
}

export function startNavigationFromSheet(input: {
  destinationText: string
  travelMode: TravelMode
  preferredMap: MapProviderId
  nearby?: boolean
}): Promise<NavigationHandleResult> {
  const intent: NavigationIntent = {
    intent: input.nearby ? 'navigation.search_nearby' : 'navigation.open_route',
    confidence: 1,
    destinationText: input.destinationText.trim(),
    destinationType: input.nearby ? 'category' : 'place',
    originMode: input.nearby ? 'current_location' : 'none',
    travelMode: input.travelMode,
    preferredMap: input.preferredMap,
    requiresConfirmation: false,
    missingFields: input.destinationText.trim() ? [] : ['destinationText'],
    originalText: input.destinationText,
    categoryKey: input.nearby ? input.destinationText : undefined,
    savedPlaceId:
      input.destinationText === '집' ? 'home' : input.destinationText === '회사' ? 'work' : undefined,
  }
  if (intent.savedPlaceId) intent.destinationType = 'saved_place'
  return executeNavigationIntent(intent, { requestLocation: Boolean(input.nearby) })
}

export function resetNavigationLocalState(): void {
  clearNavSession()
}

export { wantsNavigation, parseNavigationIntent, loadNavigationSettings }
