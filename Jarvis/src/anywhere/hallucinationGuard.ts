/** Block offline Local AI from inventing live/network facts. */

const NETWORK_REQUIRED_PATTERNS =
  /(날씨|기온|비\s*와|우산|미세먼지|항공|비행기|표\s*값|항공권|호텔\s*가격|숙소\s*요금|맛집|영업\s*중|지도\s*검색|교통|막히|실시간|주가|환율|뉴스|검색해|웹\s*검색|예약\s*해|결제)/i

export function needsNetworkFact(text: string): boolean {
  return NETWORK_REQUIRED_PATTERNS.test(text || '')
}

export function offlineNetworkRefusal(text: string): string | null {
  if (!needsNetworkFact(text)) return null
  if (/날씨|기온|비\s*와|우산|미세먼지/i.test(text)) {
    return '현재 오프라인이라 최신 날씨를 확인할 수 없어요. 연결되면 바로 확인할 수 있습니다.'
  }
  if (/항공|비행기|항공권|표\s*값/i.test(text)) {
    return '현재 오프라인이라 실시간 항공 정보를 확인할 수 없어요. 저장된 여행 정보가 있으면 그걸 보여드릴게요.'
  }
  if (/호텔\s*가격|숙소\s*요금|1\s*박|실시간.*호텔|호텔.*가격/i.test(text) || (/요금|가격/.test(text) && /호텔|숙소/.test(text))) {
    return '현재 오프라인이라 실시간 호텔 가격을 확인할 수 없어요. 저장된 숙소 정보는 볼 수 있습니다.'
  }
  if (/맛집|영업|지도|교통|검색/i.test(text)) {
    return '현재 오프라인이라 실시간 검색을 할 수 없어요. 저장된 장소·일정이 있으면 그걸 이용할 수 있습니다.'
  }
  return '현재 오프라인이라 최신 온라인 정보가 필요한 질문은 답할 수 없어요. 일정·메모·번역·저장된 정보는 이용할 수 있습니다.'
}
