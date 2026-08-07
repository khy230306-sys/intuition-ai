import { isClearWeatherQuery } from '../commandRouter/weatherQuery'
import { parseSelectionIndex } from '../actionAgent/slotResolver'
import type { EngineSession, EngineTurnKind } from './types'

const KR_CITIES =
  /(서울|부산|대구|인천|광주|대전|울산|제주|수원|창원|성남|용인|고양|청주|전주|포항|창원|천안|김해)/

export function extractEngineCity(text: string): string {
  const t = text.trim()
  const m = t.match(KR_CITIES)
  return m?.[1] || ''
}

export function extractWeatherDay(text: string): '오늘' | '내일' | '모레' | '지금' {
  if (/모레/.test(text)) return '모레'
  if (/내일/.test(text)) return '내일'
  if (/지금/.test(text)) return '지금'
  return '오늘'
}

export function isPlaceSeekUtterance(text: string, session?: EngineSession | null): boolean {
  const t = text.trim()
  if (!t) return false
  // Never steal restaurant / booking DEMO paths
  if (/맛집|식당|레스토랑|외식|예약\s*가능|고기집/.test(t) && !/아이|어린이|갈\s*만/.test(t)) {
    return false
  }
  if (isClearWeatherQuery(t) && !/갈\s*만|아이|어린이/.test(t)) return false

  const familyPlace =
    /갈\s*만\s*한\s*곳|갈만한\s*곳|아이랑|아이들이랑|어린이\s*갈|키즈\s*체험|가족\s*나들이|놀\s*만\s*한\s*곳/.test(
      t,
    )
  // Continue after weather in the same engine session
  const weatherCont =
    Boolean(session?.weather) &&
    /비\s*안\s*오|비\s*없으면|맑으면|갈\s*만|아이|어린이|찾아\s*줘|찾아줘/.test(t)

  return familyPlace || weatherCont
}

export function isCalendarWriteUtterance(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/(방법|어떻게|뭐야|뜻)/.test(t)) return false
  return (
    /일정\s*(잡아|등록|추가|넣어|만들어)|캘린더에|약속\s*(잡아|잡아줘)|알려\s*줘|알림\s*(해|잡아|등록)/.test(t) ||
    (/(시)\s*.*(일정|약속|알림)/.test(t) && /(잡아|등록|추가|해줘)/.test(t))
  )
}

export function isEngineCancel(text: string): boolean {
  return /^(취소|그만|됐어|엔진\s*초기화)/.test(text.trim())
}

/**
 * Classify turn for Core Engine V1.
 * Session-aware: ordinal/calendar only when prior places exist.
 */
export function classifyEngineTurn(text: string, session: EngineSession | null): EngineTurnKind {
  const t = text.trim()
  if (!t) return 'none'
  // Only cancel when this engine owns an active session (don't steal 「그만/취소」)
  if (session && isEngineCancel(t)) return 'cancel'

  if (isClearWeatherQuery(t)) return 'weather'

  const idx = parseSelectionIndex(t)
  if (idx != null && session?.places?.length) {
    // 「두 번째가 괜찮네」 etc.
    if (
      /괜찮|좋아|그거|이걸로|선택|골라|로\s*하자|로\s*할게/.test(t) ||
      /^(두\s*번째|첫\s*번째|세\s*번째|\d+\s*번)$/.test(t.replace(/[요네다\.!?\s]/g, '')) ||
      /번째/.test(t)
    ) {
      return 'select'
    }
  }

  if (isPlaceSeekUtterance(t, session)) return 'place_seek'

  if (isCalendarWriteUtterance(t) && (session?.selected || session?.places?.length)) {
    return 'calendar_write'
  }

  // Bare ordinal while places pending
  if (idx != null && session?.places?.length) return 'select'

  return 'none'
}
