export const BLOCKED_BY_LIVE_OBSERVE = "BLOCKED_BY_LIVE_OBSERVE";

export const LIVE_OBSERVE_WRITE_ACTIONS = [
  "CREATE_ORDER",
  "PAY_ORDER",
  "CREATE_LISTING",
  "UPDATE_LISTING",
  "REFUND",
  "RETURN_WRITE",
  "DISPUTE_WRITE",
] as const;

export type LiveObserveWriteAction = (typeof LIVE_OBSERVE_WRITE_ACTIONS)[number];

export function liveObserveWriteBlock(action: LiveObserveWriteAction): {
  allowed: false;
  code: typeof BLOCKED_BY_LIVE_OBSERVE;
  error: string;
} {
  return {
    allowed: false,
    code: BLOCKED_BY_LIVE_OBSERVE,
    error: `${BLOCKED_BY_LIVE_OBSERVE}: ${action}는 LIVE_OBSERVE에서 서버가 차단합니다.`,
  };
}

/**
 * Natural-language WRITE detection for OWNER / Commander / AI.
 * Internal pause (일시중지) is not treated as an external write.
 */
export function detectLiveObserveWrite(text: string): LiveObserveWriteAction | null {
  const t = text.trim();
  if (/환불/.test(t) && !/왜|조사|원인/.test(t)) return "REFUND";
  if (/결제|지급|pay[_ ]?order/i.test(t)) return "PAY_ORDER";
  if (/발주|주문 생성|create[_ ]?order/i.test(t)) return "CREATE_ORDER";
  if (/리스팅 수정|update[_ ]?listing/i.test(t)) return "UPDATE_LISTING";
  if (/리스팅|판매 등록|create[_ ]?listing/i.test(t)) return "CREATE_LISTING";
  if (/반품.*(처리|실행|승인)|return[_ ]?write/i.test(t)) return "RETURN_WRITE";
  if (/분쟁.*(생성|쓰기|접수)|dispute[_ ]?write/i.test(t)) return "DISPUTE_WRITE";
  return null;
}
