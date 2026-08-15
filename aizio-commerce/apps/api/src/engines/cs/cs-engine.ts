const AUTO_ALLOWED = ["shipping_status", "order_confirm", "basic_product_info", "return_process_guide"];

const FORBIDDEN = [
  "legal_dispute",
  "damages_claim",
  "high_refund",
  "safety_incident",
  "platform_report",
  "counterfeit_trademark",
];

export interface CsClassification {
  kind: string;
  autoSendAllowed: boolean;
  mode: "DRAFT_THEN_SEND" | "BLOCK_AUTO";
  reason: string;
}

export function classifyCs(kind: string): CsClassification {
  if (FORBIDDEN.includes(kind)) {
    return {
      kind,
      autoSendAllowed: false,
      mode: "BLOCK_AUTO",
      reason: "법적/고위험 문의는 자동답변이 금지됩니다.",
    };
  }
  if (AUTO_ALLOWED.includes(kind)) {
    return {
      kind,
      autoSendAllowed: false,
      mode: "DRAFT_THEN_SEND",
      reason: "V1은 AI 초안 → 확인 → 전송만 허용합니다. 자동 전송은 비활성입니다.",
    };
  }
  return {
    kind,
    autoSendAllowed: false,
    mode: "DRAFT_THEN_SEND",
    reason: "기본 모드: 초안만 생성합니다.",
  };
}

export function draftCsReply(input: {
  kind: string;
  facts: Record<string, string | null>;
}): string {
  if (input.kind === "shipping_status") {
    return `주문 확인되었습니다. 현재 배송 상태는 ${input.facts.status ?? "확인 중"}입니다. 송장번호가 등록되면 바로 안내드리겠습니다.`;
  }
  if (input.kind === "order_confirm") {
    return `주문이 정상적으로 접수되었습니다. 상품: ${input.facts.productName ?? "주문 상품"}`;
  }
  if (input.kind === "return_process_guide") {
    return "반품은 판매 채널의 반품 신청 화면에서 접수해 주세요. 접수 후 수거 안내에 따라 상품을 보내주시면 검수 후 처리됩니다.";
  }
  return "문의 주셔서 감사합니다. 확인 후 정확하게 답변드리겠습니다.";
}
