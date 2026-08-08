import { isClearWeatherQuery } from '../commandRouter/weatherQuery'
import { parseSelectionIndex } from '../actionAgent/slotResolver'
import { resolveContextRef, type SessionContext } from './context'
import type { EngineSession, EngineTurnKind } from './types'

const KR_CITIES =
  /(서울|부산|대구|인천|광주|대전|울산|제주|수원|창원|성남|용인|고양|청주|전주|포항|천안|김해)/

export function extractEngineCity(text: string): string {
  const t = text.trim()
  const m = t.match(KR_CITIES)
  return m?.[1] || ''
}

export function extractWeatherDay(text: string): '오늘' | '내일' | '모레' | '지금' {
  if (/모레/.test(text)) return '모레'
  // Colloquial typo: 「낼 비옴?」
  if (/내일|(^|\s)낼(\s|$)|낼\s*비/.test(text)) return '내일'
  if (/지금/.test(text)) return '지금'
  return '오늘'
}

export function isPlaceSeekUtterance(text: string, session?: EngineSession | null): boolean {
  const t = text.trim()
  if (!t) return false
  if (/맛집|식당|레스토랑|외식|예약\s*가능|고기집/.test(t) && !/아이|어린이|갈\s*만/.test(t)) {
    return false
  }
  if (isClearWeatherQuery(t) && !/갈\s*만|아이|어린이/.test(t)) return false

  // Soft lifestyle ("아이랑 주말에 뭐하면 좋을까?") must NOT steal Hybrid AI chat.
  // Require an actual place-seeking ask (갈 만한 곳 / 찾아줘 / 어디 갈까 …).
  if (/뭐\s*하면\s*좋|어떻게\s*지내|심심|조언|고민/.test(t) && !/갈\s*만|찾아|어디\s*가|나들이|체험/.test(t)) {
    return false
  }
  const familyPlace =
    /갈\s*만\s*한\s*곳|갈만한\s*곳|어린이\s*갈|키즈\s*체험|가족\s*나들이|놀\s*만\s*한\s*곳/.test(t) ||
    (/(아이|아이들|어린이)랑/.test(t) && /갈\s*만|찾아|추천|어디\s*가|나들이|체험/.test(t))
  const weatherCont =
    Boolean(session?.weather || session?.context?.weather) &&
    /비\s*안\s*오|비\s*없으면|맑으면|갈\s*만|아이|어린이|찾아\s*줘|찾아줘/.test(t)

  return familyPlace || weatherCont
}

export function isCalendarWriteUtterance(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/(방법|어떻게|뭐야|뜻)/.test(t)) return false
  return (
    /일정\s*(잡아|등록|추가|넣어|만들어)|캘린더에|약속\s*(잡아|잡아줘)|알림\s*(해|잡아|등록)|넣어\s*줘/.test(
      t,
    ) ||
    (/(시)\s*.*(일정|약속|알림)/.test(t) && /(잡아|등록|추가|해줘|넣어)/.test(t)) ||
    /거기\s*.*일정|그거\s*.*일정|그\s*일정/.test(t)
  )
}

export function isEngineCancel(text: string): boolean {
  return /^(취소|그만|됐어|엔진\s*초기화)/.test(text.trim())
}

function ctxOf(session: EngineSession | null): SessionContext | null {
  return session?.context || null
}

/**
 * Classify turn — session-aware, uses structured context refs.
 */
export function classifyEngineTurn(text: string, session: EngineSession | null): EngineTurnKind {
  const t = text.trim()
  if (!t) return 'none'
  if (session && isEngineCancel(t)) return 'cancel'

  if (isClearWeatherQuery(t)) return 'weather'

  const ctx = ctxOf(session)
  const places = session?.places?.length ? session.places : ctx?.places || []
  const selected = session?.selected || ctx?.selected
  const hasPlaces = places.length > 0

  // Context refs that imply select (「아까 두 번째 말한 곳」)
  if (ctx && hasPlaces) {
    const ref = resolveContextRef(t, { ...ctx, places })
    if (ref?.kind === 'place_by_rank') {
      if (!isCalendarWriteUtterance(t)) return 'select'
    }
    if (ref?.kind === 'selected_place' && isCalendarWriteUtterance(t)) return 'calendar_write'
    if (ref?.kind === 'unresolved' && ref.reason === 'no_place_at_rank') {
      // 「두 번째」 with empty/missing — still select kind so engine can error honestly
      if (parseSelectionIndex(t) != null) return 'select'
    }
  }

  const idx = parseSelectionIndex(t)
  if (idx != null && hasPlaces) {
    if (
      /괜찮|좋아|그거|이걸로|선택|골라|로\s*하자|로\s*할게|말한\s*곳|아까|그중에|지난번/.test(t) ||
      /번째/.test(t) ||
      /^(두\s*번째|첫\s*번째|세\s*번째|\d+\s*번)/.test(t.replace(/[요네다\.!?\s]/g, ''))
    ) {
      if (isCalendarWriteUtterance(t) && (selected || idx != null)) {
        // 「두 번째 그거 일정」→ select first if not selected, else calendar — prefer select if mismatch
        if (!selected || selected.rank !== idx) return 'select'
        return 'calendar_write'
      }
      return 'select'
    }
  }

  if (isPlaceSeekUtterance(t, session)) return 'place_seek'

  if (isCalendarWriteUtterance(t) && (selected || hasPlaces || ctx?.selected)) {
    return 'calendar_write'
  }

  if (idx != null && hasPlaces) return 'select'

  // 「두 번째」 with NO candidates — still own the turn to say so (when engine session exists)
  if (idx != null && session && !hasPlaces) return 'select'

  return 'none'
}
