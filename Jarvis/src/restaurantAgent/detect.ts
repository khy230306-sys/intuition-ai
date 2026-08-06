export type RestaurantIntentId =
  | 'RESTAURANT_SEARCH'
  | 'RESTAURANT_DETAILS'
  | 'RESTAURANT_FILTER'
  | 'RESTAURANT_SELECT'
  | 'RESTAURANT_AVAILABILITY'
  | 'RESTAURANT_BOOKING_PREPARE'
  | 'RESTAURANT_BOOKING_CONFIRM'
  | 'RESTAURANT_BOOKING_STATUS'
  | 'RESTAURANT_BOOKING_CANCEL'
  | null

/** Recipe / cooking how-to — not restaurant search */
export function isRecipeOrCooking(text: string): boolean {
  return /(만드는\s*법|레시피|요리법|어떻게\s*만들|조리법|끓이는\s*법)/.test(text)
}

export function isRestaurantUtterance(text: string): boolean {
  const t = text.trim()
  if (!t || isRecipeOrCooking(t)) return false
  if (/번역|통역|날씨\s*(알려|어때)|비행기|항공|호텔\s*예약/.test(t) && !/(맛집|식당|레스토랑|한식집|일식집)/.test(t))
    return false
  // Bare booking without restaurant context must not steal travel booking
  if (/^(이걸로\s*)?예약해\s*줘$/.test(t) && !/(맛집|식당|레스토랑|한식|일식)/.test(t)) return false
  return (
    /(맛집|식당|레스토랑|밥집|외식|가게\s*추천)/.test(t) ||
    /(예약\s*가능|예약해|예약\s*잡아).*(식당|맛집|한식|고기|일식|스테이크)/.test(t) ||
    /(한식집|고깃집|일식집|중식집|술집|스테이크집|카페)/.test(t) ||
    /(주차되는\s*(식당|곳|한식집)|아이랑\s*갈|룸\s*있는\s*식당|부모님\s*모시고)/.test(t) ||
    /(오늘\s*저녁\s*뭐\s*먹|가족들이랑\s*외식|가족\s*외식)/.test(t) ||
    /(카페|한식|일식|중식|양식)\s*(추천|맛집|집)/.test(t)
  )
}

export function detectRestaurantIntent(text: string, hasSession = false): RestaurantIntentId {
  const t = text.trim()
  if (!t || isRecipeOrCooking(t)) return null

  if (/예약\s*취소/.test(t) && (hasSession || /식당|맛집|예약/.test(t))) return 'RESTAURANT_BOOKING_CANCEL'
  if (/예약\s*상태/.test(t) && hasSession) return 'RESTAURANT_BOOKING_STATUS'
  if (/^(응|네|예)\s*(예약|진행)/.test(t) || /예약\s*(진행|확정)\s*해/.test(t)) {
    return hasSession ? 'RESTAURANT_BOOKING_CONFIRM' : null
  }
  if (/(예약해\s*줘|예약\s*잡아|예약\s*해줘)/.test(t) && (hasSession || /(식당|맛집|번째)/.test(t))) {
    return 'RESTAURANT_BOOKING_PREPARE'
  }

  if (hasSession) {
    if (/돼\?|가능\?|예약\s*가능|자리\s*있/.test(t) || /\d+\s*시.*(돼|가능)/.test(t)) {
      return 'RESTAURANT_AVAILABILITY'
    }
    if (/자세히|상세/.test(t)) return 'RESTAURANT_DETAILS'
    if (/비교/.test(t)) return 'RESTAURANT_DETAILS'
    if (/두\s*번째|첫\s*번째|세\s*번째|[1-5]\s*번/.test(t) && /(예약|로\s*할게|선택|으로)/.test(t)) {
      return /예약/.test(t) ? 'RESTAURANT_BOOKING_PREPARE' : 'RESTAURANT_SELECT'
    }
    if (/두\s*번째|첫\s*번째|세\s*번째|[1-5]\s*번/.test(t)) return 'RESTAURANT_SELECT'
    if (
      /(주차|아이|룸|싼|가까운|평점|한식|고기|일식|중식|양식|조용|필터)/.test(t) &&
      !/예약해/.test(t)
    ) {
      return 'RESTAURANT_FILTER'
    }
  }

  if (isRestaurantUtterance(t)) return 'RESTAURANT_SEARCH'
  return null
}
