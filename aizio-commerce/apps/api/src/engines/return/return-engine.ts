export type ReturnAutoDecision = "AUTO_OK" | "HUMAN_REVIEW_REQUIRED";

export interface ReturnCase {
  amountKRW: number;
  supplierRejected: boolean;
  policyConflict: boolean;
  evidenceMissing: boolean;
  shippingDispute: boolean;
  fraudSuspected: boolean;
  aiConfidence: number | null;
  highRefundThresholdKRW: number;
}

export function classifyReturn(c: ReturnCase): { decision: ReturnAutoDecision; reasons: string[] } {
  const reasons: string[] = [];
  if (c.amountKRW >= c.highRefundThresholdKRW) reasons.push("고액 환불");
  if (c.supplierRejected) reasons.push("공급처 거절");
  if (c.policyConflict) reasons.push("정책 충돌");
  if (c.evidenceMissing) reasons.push("증빙 부족");
  if (c.shippingDispute) reasons.push("배송분쟁");
  if (c.fraudSuspected) reasons.push("사기 가능성");
  if (c.aiConfidence !== null && c.aiConfidence < 0.6) reasons.push("AI confidence가 낮음");
  if (reasons.length > 0) {
    return { decision: "HUMAN_REVIEW_REQUIRED", reasons };
  }
  return { decision: "AUTO_OK", reasons: [] };
}
