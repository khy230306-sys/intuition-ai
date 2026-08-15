import type { SafetyContext, SafetyGateResult, SafetySettings } from "../../shared/types.ts";

const WRITE_ACTIONS = new Set([
  "SUPPLIER_ORDER",
  "SUPPLIER_PAYMENT",
  "CUSTOMER_REFUND",
  "MARKETPLACE_LISTING",
  "PRICE_UPDATE",
  "STOCK_UPDATE",
  "CANCEL_ORDER",
]);

/**
 * Payment / mutation Safety Gate.
 * Server-enforced rules. AI prompts cannot bypass this.
 */
export function evaluateSafetyGate(
  settings: SafetySettings,
  ctx: SafetyContext,
): SafetyGateResult {
  const reasons: string[] = [];
  const ruleHits: string[] = [];

  if (ctx.riskDecision === "BLOCK") {
    reasons.push("Risk Engine이 BLOCK을 반환해 작업을 진행할 수 없습니다.");
    ruleHits.push("risk.BLOCK");
    return { allowed: false, decision: "BLOCK", reasons, ruleHits };
  }

  if (settings.operatingMode === "LIVE_OBSERVE" && WRITE_ACTIONS.has(ctx.action)) {
    reasons.push("LIVE_OBSERVE 모드에서는 주문·결제·판매등록·재고/가격 변경·환불을 실행하지 않습니다.");
    ruleHits.push("mode.LIVE_OBSERVE");
  }

  if (ctx.category && settings.blockedCategories.includes(ctx.category)) {
    reasons.push(`차단된 카테고리입니다: ${ctx.category}`);
    ruleHits.push("blocked.category");
  }
  if (ctx.supplierId && settings.blockedSuppliers.includes(ctx.supplierId)) {
    reasons.push(`차단된 공급처입니다: ${ctx.supplierId}`);
    ruleHits.push("blocked.supplier");
  }
  if (ctx.country && settings.blockedCountries.includes(ctx.country)) {
    reasons.push(`차단된 국가입니다: ${ctx.country}`);
    ruleHits.push("blocked.country");
  }

  if (WRITE_ACTIONS.has(ctx.action) || ctx.action === "SUPPLIER_ORDER") {
    if (ctx.amountKRW > settings.maxPerOrderKRW) {
      reasons.push(
        `주문 금액 ₩${ctx.amountKRW.toLocaleString("ko-KR")}이 건당 한도 ₩${settings.maxPerOrderKRW.toLocaleString("ko-KR")}을 초과합니다.`,
      );
      ruleHits.push("limit.perOrder");
    }
    if (ctx.dailySpentKRW + ctx.amountKRW > settings.maxDailyKRW) {
      reasons.push(
        `오늘 누적 발주액이 일일 한도 ₩${settings.maxDailyKRW.toLocaleString("ko-KR")}을 초과합니다.`,
      );
      ruleHits.push("limit.daily");
    }
    if (ctx.monthlySpentKRW + ctx.amountKRW > settings.maxMonthlyKRW) {
      reasons.push(
        `이번 달 누적 발주액이 월 한도 ₩${settings.maxMonthlyKRW.toLocaleString("ko-KR")}을 초과합니다.`,
      );
      ruleHits.push("limit.monthly");
    }
  }

  if (ctx.netMarginRate !== null && ctx.netMarginRate < settings.minMarginRate) {
    reasons.push(
      `순마진 ${(ctx.netMarginRate * 100).toFixed(1)}%가 최소 기준 ${(settings.minMarginRate * 100).toFixed(1)}% 미만입니다.`,
    );
    ruleHits.push("margin.min");
  }

  if (ctx.confidence !== null && ctx.confidence < settings.minConfidence) {
    reasons.push(
      `데이터 신뢰도 ${Math.round(ctx.confidence * 100)}%가 최소 기준 ${Math.round(settings.minConfidence * 100)}% 미만입니다.`,
    );
    ruleHits.push("confidence.min");
  }

  if (
    ctx.supplierPriceIncreaseRate !== null &&
    ctx.supplierPriceIncreaseRate > settings.maxSupplierPriceIncreaseRate
  ) {
    reasons.push(
      `공급원가가 ${(ctx.supplierPriceIncreaseRate * 100).toFixed(1)}% 상승해 허용치 ${(settings.maxSupplierPriceIncreaseRate * 100).toFixed(1)}%를 초과합니다.`,
    );
    ruleHits.push("supplier.priceSpike");
  }

  if (ctx.riskDecision === "REVIEW_REQUIRED") {
    reasons.push("Risk Engine이 사람 검토를 요구합니다.");
    ruleHits.push("risk.REVIEW_REQUIRED");
  }

  const needsManual =
    ctx.amountKRW >= settings.manualApprovalThresholdKRW &&
    WRITE_ACTIONS.has(ctx.action) &&
    !ctx.humanApproved;

  if (needsManual) {
    reasons.push(
      `금액 ₩${ctx.amountKRW.toLocaleString("ko-KR")}이 수동 승인 기준 ₩${settings.manualApprovalThresholdKRW.toLocaleString("ko-KR")} 이상입니다.`,
    );
    ruleHits.push("manual.threshold");
  }

  const hardBlock = ruleHits.some((r) =>
    [
      "blocked.category",
      "blocked.supplier",
      "blocked.country",
      "limit.perOrder",
      "limit.daily",
      "limit.monthly",
      "margin.min",
      "supplier.priceSpike",
      "mode.LIVE_OBSERVE",
    ].includes(r),
  );

  if (hardBlock) {
    return { allowed: false, decision: "BLOCK", reasons, ruleHits };
  }

  if (ruleHits.includes("confidence.min") || ruleHits.includes("risk.REVIEW_REQUIRED") || needsManual) {
    return { allowed: false, decision: "REVIEW_REQUIRED", reasons, ruleHits };
  }

  return { allowed: true, decision: "ALLOW", reasons: [], ruleHits: [] };
}
