/**
 * Parse Korean navigation utterances into NavigationIntent.
 * Avoids false positives like 「회사 이야기해 줘」.
 */

import {
  NEARBY_CATEGORIES,
  type DestinationType,
  type MapProviderId,
  type NavIntentId,
  type NavigationIntent,
  type TravelMode,
} from './navigationTypes'

const NAV_VERB =
  /(?:안내|길\s*찾|길찾|길\s*안내|내비|내비게이션|네비|지도\s*열|지도로\s*열|맵으로\s*열|(?:카카오|구글|애플|네이버|티\s*맵|T\s*맵|티맵).{0,8}(?:지도|맵)?\s*열|경로|루트|가자|데려다|모셔다|데려가|가\s*줘|까지\s*가|로\s*가\s*줘)/i

const TALK_NOT_NAV =
  /이야기|얘기|말해|알려\s*줘(?!\s*길)|설명|뭐야|어때|생각|기억|일정\s*이야기|회사\s*생활|회사\s*이야기|집\s*이야기/i

function detectTravelMode(text: string): TravelMode {
  if (/걸어서|도보|걸어\s*가|보행/.test(text)) return 'walking'
  if (/자전거|바이크|cycle|bike/.test(text)) return 'bicycling'
  if (/대중교통|지하철|버스|전철|기차|transit|train/.test(text)) return 'transit'
  if (/차로|자동차|운전|드라이브|차량|driving|drive/.test(text)) return 'driving'
  return 'unspecified'
}

function detectMap(text: string): MapProviderId {
  if (/티\s*맵|티맵|T\s*맵|티맵으로|tmap/i.test(text)) return 'tmap'
  if (/카카오\s*맵|카맵|kakao/.test(text)) return 'kakao'
  if (/네이버\s*지도|네이버맵|naver/.test(text)) return 'naver'
  if (/구글\s*지도|구글맵|google\s*maps?/.test(text)) return 'google'
  if (/애플\s*지도|apple\s*maps?/.test(text)) return 'apple'
  return 'system'
}

function detectCategory(text: string): { key: string; label: string } | null {
  const pairs: Array<[string, RegExp]> = [
    ['pharmacy', /약국/],
    ['hospital', /병원|응급실/],
    ['parking', /주차장|주차/],
    ['gas', /주유소|충전소/],
    ['convenience', /편의점/],
    ['cafe', /카페|커피/],
    ['restaurant', /식당|맛집|음식점/],
    ['restroom', /화장실|화장실/],
    ['bank', /은행/],
    ['atm', /ATM|현금인출/],
    ['police', /경찰서/],
    ['fire', /소방서/],
  ]
  for (const [key, re] of pairs) {
    if (re.test(text)) return { key, label: NEARBY_CATEGORIES[key] || key }
  }
  return null
}

function stripDecor(text: string): string {
  return text
    .replace(
      /(?:으로|로)?\s*(?:안내|길\s*찾|길찾|길\s*안내|내비|내비게이션|네비|경로|루트)(?:해|해\s*줘|해줘|해줘요|해주세요|좀)?/gi,
      ' ',
    )
    .replace(/(?:지도|맵)(?:으로|로)?\s*(?:열어|열어줘|열어\s*줘|열어주세요)/gi, ' ')
    .replace(
      /(?:카카오\s*맵|네이버\s*지도|구글\s*지도|애플\s*지도|구글맵|카맵|티\s*맵|티맵|T\s*맵|tmap)/gi,
      ' ',
    )
    .replace(/(?:차로|자동차로|운전해서|걸어서|도보로|대중교통으로|지하철로|버스로|자전거로)/gi, ' ')
    .replace(/(?:까지|으로|로|에)\s*$/g, '')
    .replace(/^(?:가장\s*)?가까운\s*/g, '')
    .replace(/^(?:근처|주변)\s*/g, '')
    .replace(/^(?:해\s*줘|해줘|주세요|좀)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeNav(text: string): boolean {
  if (!text.trim()) return false
  if (TALK_NOT_NAV.test(text) && !NAV_VERB.test(text)) return false
  if (NAV_VERB.test(text)) return true
  if (/(?:가까운|근처|주변).+(?:병원|약국|주차장|주유소|편의점|카페|식당)/.test(text)) return true
  if (/^(?:지도|길찾기)\s*\S+/.test(text)) return true
  if (/\S+\s*(?:지도|길찾기)$/.test(text)) return true
  return false
}

export function wantsNavigation(text: string): boolean {
  return looksLikeNav(String(text || '').trim())
}

export function parseNavigationIntent(raw: string): NavigationIntent | null {
  const originalText = String(raw || '').trim()
  if (!originalText || !looksLikeNav(originalText)) return null

  const travelMode = detectTravelMode(originalText)
  const preferredMap = detectMap(originalText)
  const cat = detectCategory(originalText)
  const nearby = /가까운|근처|주변|가장\s*가까운/.test(originalText)

  let intent: NavIntentId = 'navigation.open_route'
  let destinationType: DestinationType = 'place'
  let destinationText = ''
  let savedPlaceId: NavigationIntent['savedPlaceId']
  let categoryKey: string | undefined
  const missingFields: string[] = []
  let confidence = 0.72

  if (/^(?:지도|맵)\s*(?:열어|열어줘|열어\s*줘|켜)/i.test(originalText) && !stripDecor(originalText)) {
    intent = 'navigation.open_map'
    confidence = 0.8
  }

  if (/\b집\b|집으로|우리\s*집|댁으로/.test(originalText) && !/회사\s*집/.test(originalText)) {
    destinationType = 'saved_place'
    destinationText = '집'
    savedPlaceId = 'home'
    confidence = 0.9
  } else if (/\b회사\b|회사로|회사까지|오피스|직장/.test(originalText)) {
    // 「회사 이야기」 already filtered; 「회사로 안내」 hits NAV_VERB
    destinationType = 'saved_place'
    destinationText = '회사'
    savedPlaceId = 'work'
    confidence = 0.9
  } else if (cat && nearby) {
    intent = 'navigation.search_nearby'
    destinationType = 'category'
    destinationText = cat.label
    categoryKey = cat.key
    confidence = 0.88
  } else if (cat && NAV_VERB.test(originalText)) {
    intent = nearby ? 'navigation.search_nearby' : 'navigation.open_route'
    destinationType = nearby ? 'category' : 'place'
    destinationText = cat.label
    categoryKey = cat.key
    confidence = 0.8
  } else {
    destinationText = stripDecor(originalText)
    // Remove leftover verbs / particles
    destinationText = destinationText
      .replace(/^(?:가자|가줘|가\s*줘)\s*/g, '')
      .replace(/\s*(?:가자|가줘)$/g, '')
      .replace(/^(?:해|줘|요|좀|주세요)$/g, '')
      .trim()
    if (!destinationText || destinationText.length < 2) {
      missingFields.push('destinationText')
      destinationText = ''
      destinationType = 'unknown'
      confidence = 0.55
    } else {
      destinationType = /시|구|동|로|길|번지|\d/.test(destinationText) ? 'address' : 'place'
      confidence = 0.82
    }
  }

  if (intent === 'navigation.open_map' && !destinationText) {
    missingFields.push('destinationText')
  }

  const requiresConfirmation =
    missingFields.length > 0 || destinationType === 'unknown' || confidence < 0.65

  return {
    intent,
    confidence,
    destinationText,
    destinationType,
    originMode: nearby || intent === 'navigation.search_nearby' ? 'current_location' : 'none',
    travelMode,
    preferredMap,
    requiresConfirmation,
    missingFields,
    originalText,
    categoryKey,
    savedPlaceId,
  }
}
