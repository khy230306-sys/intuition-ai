/**
 * How-to / tip / advice utterances — must never open booking or search slots.
 */

/** True when the user wants an explanation, not to start booking/search. */
export function isHowToOrAdviceUtterance(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  // Explicit search/book verbs win over howto
  if (/(찾아\s*줘|검색해|예약해|예매해|알아봐\s*줘|항공권\s*검색|비행기\s*찾아)/.test(t)) {
    return false
  }
  if (/(예약하는\s*방법|예약하는\s*법|어떻게\s*예약|예약\s*방법|만드는\s*법|왜\s*비싸)/.test(t)) {
    return true
  }
  if (/(어떻게\s*사|사는\s*(법|방법)|구매\s*(법|방법)|예매\s*(법|방법)|어떻게\s*예매)/.test(t)) {
    return true
  }
  if (/(여행\s*팁|여행\s*조언|여행\s*꿀팁|가는\s*법|준비\s*팁|팁\s*알려)/.test(t)) {
    return true
  }
  if (/(방법|하는\s*법|어떻게)\s*(알려|해요|하나요|사나요)/.test(t)) {
    return true
  }
  return false
}

/** Short canned travel booking howto (no slot-filling). */
export function travelHowToReply(): string {
  return [
    '【항공권 예약 방법 (참고)】',
    '1. 출발지·도착지·날짜·인원을 정해요.',
    '2. 네이버·구글 항공권, 카약, 스카이스캐너 등으로 가격을 비교해요.',
    '3. 항공사 공식 사이트/앱에서 좌석·수하물을 확인하고 결제해요.',
    '4. 예약 확인 메일·전자탑승권을 저장해 두세요.',
    '',
    '실제 검색을 원하시면 「인천에서 도쿄 비행기 찾아줘」처럼 말해 주세요.',
  ].join('\n')
}
