import type { NavTravelMode } from './types'

export type NavV2IntentKind =
  | 'open_navigation'
  | 'place_search'
  | 'nearby_search'
  | 'select_index'
  | 'change_mode'
  | 'start_guidance'
  | 'stop_guidance'
  | 'reselect'
  | 'show_more'
  | 'clear'
  | 'chat_about_place'
  | 'none'

export type NavV2Intent = {
  kind: NavV2IntentKind
  query?: string
  index?: number // 1-based
  mode?: NavTravelMode
  confidence: number
  original: string
}

const NAV_VERB =
  /안내|길\s*찾|길찾|가자|데려|내비|네비|경로|루트|지도에서|길안내|출발|도착까지/i

const CHAT_ABOUT =
  /(?:은|는|이|가)?\s*(?:어떤|무슨)\s*(?:곳|동네|역|의미)|역사\s*알려|설명해|이야기해|뭐야\??$/i

/** Non-place domains — never steal these for navigation */
const NOT_PLACE =
  /주식|종목|시세|추천|포트폴리오|지출|추가\s*\d|평균|분산|알림|브리핑|번역|날씨|환율|게임|음악|노래|통역|전화|문자|검색해|시세|매수|매도|할\s*일|일정|손님|생일/

const PLACE_TOKEN =
  /동$|역$|로\s*\d|길\s*\d|번\s*출구|주민센터|대학교|병원|약국|주유|주차|카페|편의점|화장실|식당|음식점|ATM|은행|경찰|소방|터미널|공항|공원|마트|센터$/

const CHAIN_OR_LANDMARK =
  /스타벅|스벅|맥도|이마트|롯데|홈플러스|백화|KTX|케이티엑스|울산대|서울역|부산역|강남역|역삼|울산역/

const PARTIAL_SEED = /^(?:역삼|강남|울산|부산|서울|스타|스벅|약국|병원|주차|주유|망양)/i

function looksLikePlaceQuery(original: string): boolean {
  const t = original.trim()
  if (!t || t.length > 28) return false
  if (/[?？]/.test(t)) return false
  if (CHAT_ABOUT.test(t)) return false
  if (NOT_PLACE.test(t)) return false
  if (/\d{3,}/.test(t) && !/출구|번지|로\s*\d|길\s*\d/.test(t)) return false

  if (PARTIAL_SEED.test(t)) return true
  if (PLACE_TOKEN.test(t)) return true
  if (CHAIN_OR_LANDMARK.test(t)) return true

  // Hangul-only short toponyms: 역삼동, 망양길, …
  if (/^[가-힣]{2,10}$/.test(t) && /[동역로길촌면시구읍]$/.test(t)) return true

  // Partial typing: "역삼동 주", "강남역 맛"
  if (/^[가-힣]{2,10}\s+[가-힣]{1,4}$/.test(t)) {
    const head = t.split(/\s+/)[0] || ''
    if (PARTIAL_SEED.test(head) || PLACE_TOKEN.test(head) || /[동역로길]$/.test(head)) return true
  }

  // Bare category nouns used as nearby-less search
  if (/^(약국|병원|주유소|주차장|카페|편의점|화장실|ATM|은행|경찰서|소방서)$/.test(t)) return true

  return false
}

export function classifyNavV2Intent(raw: string, opts?: { hasActiveContext?: boolean }): NavV2Intent {
  const original = String(raw || '').trim()
  if (!original) return { kind: 'none', confidence: 0, original }

  // Active guidance / candidate context commands
  if (opts?.hasActiveContext) {
    if (/안내\s*시작|출발\s*하자|고고|안내\s*해/.test(original) || /^(시작|고고)$/.test(original)) {
      return { kind: 'start_guidance', confidence: 0.95, original }
    }
    if (/안내\s*(종료|중지|멈춰|그만)|^(취소)$/.test(original)) {
      return { kind: 'stop_guidance', confidence: 0.95, original }
    }
    if (/다시\s*검색|다른\s*곳|초기화/.test(original)) {
      return { kind: 'clear', confidence: 0.9, original }
    }
    if (/더\s*보|나머지/.test(original)) {
      return { kind: 'show_more', confidence: 0.85, original }
    }
    const idx =
      original.match(/(?:첫\s*번째|1\s*번|일로)/) ? 1
      : original.match(/(?:두\s*번째|2\s*번)/) ? 2
      : original.match(/(?:세\s*번째|3\s*번)/) ? 3
      : original.match(/(?:네\s*번째|4\s*번)/) ? 4
      : original.match(/(?:다섯\s*번째|5\s*번)/) ? 5
      : original.match(/마지막/) ? -1
      : null
    if (idx != null) {
      return { kind: 'select_index', index: idx, confidence: 0.92, original }
    }
    if (/바꿔|변경|그걸로|선택/.test(original) && /(\d+|첫|두|세|네|다섯|마지막)/.test(original)) {
      const m = original.match(/(\d+)/)
      return { kind: 'select_index', index: m ? Number(m[1]) : 1, confidence: 0.88, original }
    }
    if (/걸어서|도보/.test(original)) return { kind: 'change_mode', mode: 'walking', confidence: 0.9, original }
    if (/자전거/.test(original)) return { kind: 'change_mode', mode: 'cycling', confidence: 0.9, original }
    if (/차로|자동차|운전/.test(original)) return { kind: 'change_mode', mode: 'driving', confidence: 0.9, original }
    if (/^(응|어|좋아|그래|여기로|네)$/.test(original)) {
      return { kind: 'start_guidance', confidence: 0.7, original }
    }
  }

  if (CHAT_ABOUT.test(original) && !NAV_VERB.test(original)) {
    return { kind: 'chat_about_place', confidence: 0.86, query: original, original }
  }

  if (
    /지도에서\s*보|지도\s*보|길안내\s*열|내비\s*열|지도\s*열|Navigation/i.test(original) ||
    (/^(길안내)$/i.test(original) && original.length < 16)
  ) {
    return { kind: 'open_navigation', confidence: 0.9, original }
  }

  if (/(근처|주변|가까운).*(약국|병원|주유|주차|카페|편의점|화장실|식당|음식|ATM|은행|경찰|소방)/.test(original)) {
    return { kind: 'nearby_search', query: original, confidence: 0.93, original }
  }

  if (NAV_VERB.test(original) && !NOT_PLACE.test(original)) {
    const query = original
      .replace(/(?:으로|로)?\s*(?:안내|길\s*찾|길찾|가자|가줘).*$/i, '')
      .replace(/(?:차로|자동차로|걸어서|도보로|자전거로)/g, '')
      .trim()
    return { kind: 'place_search', query: query || original, confidence: 0.92, original }
  }

  if (looksLikePlaceQuery(original)) {
    return { kind: 'place_search', query: original, confidence: 0.8, original }
  }

  return { kind: 'none', confidence: 0.2, original }
}

export function isPlaceLikeQuery(text: string): boolean {
  const i = classifyNavV2Intent(text)
  return i.kind === 'place_search' || i.kind === 'nearby_search' || i.kind === 'open_navigation'
}
