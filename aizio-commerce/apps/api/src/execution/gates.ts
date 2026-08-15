import type { SafetyAction, SafetySettings } from "../shared/types.ts";
import { evaluateSafetyGate } from "../engines/safety/safety-gate.ts";
import type { AuditDecision, ExecutionScope } from "../organization/types.ts";
import type { DataFreshness } from "../shared/types.ts";

export type GateName =
  | "permission"
  | "risk"
  | "profit"
  | "budget"
  | "policy"
  | "freshness"
  | "audit"
  | "safetyLock"
  | "liveObserve";

export interface ExecutionRequest {
  action: SafetyAction;
  executionScope: ExecutionScope;
  amountKRW: number;
  dailySpentKRW: number;
  monthlySpentKRW: number;
  dailyAiUsd: number;
  missionAiUsd: number;
  maxAiPerMissionUsd: number;
  dailyAiBudgetUsd: number;
  netMarginRate: number | null;
  confidence: number | null;
  freshness: DataFreshness;
  riskDecision: "PASS" | "REVIEW_REQUIRED" | "BLOCK" | null;
  auditDecision: AuditDecision | null;
  humanApproved: boolean;
  category?: string | null;
  supplierId?: string | null;
  country?: string | null;
  supplierPriceIncreaseRate?: number | null;
}

export interface GateResult {
  allowed: boolean;
  decision: "ALLOW" | "REVIEW_REQUIRED" | "BLOCK";
  failed: GateName[];
  reasons: string[];
}

const WRITE_SCOPES = new Set(["WRITE_ACTION", "FINANCIAL_ACTION"]);
const STALE = new Set(["STALE", "UNKNOWN", "INSUFFICIENT_DATA", "NOT_CONNECTED"]);

/**
 * Execution Core — AI recommendations cannot skip these gates.
 */
export function evaluateExecutionGates(settings: SafetySettings, req: ExecutionRequest): GateResult {
  const failed: GateName[] = [];
  const reasons: string[] = [];

  if (settings.globalSafetyLock && WRITE_SCOPES.has(req.executionScope)) {
    failed.push("safetyLock");
    reasons.push("GLOBAL_SAFETY_LOCK — 조회·복구·관리자 승인만 허용됩니다.");
  }

  if (settings.operatingMode === "LIVE_OBSERVE" && WRITE_SCOPES.has(req.executionScope)) {
    failed.push("liveObserve");
    reasons.push("LIVE_OBSERVE — 실제 주문·결제·리스팅·환불을 실행하지 않습니다.");
  }

  const writeAction = [
    "SUPPLIER_ORDER",
    "SUPPLIER_PAYMENT",
    "CUSTOMER_REFUND",
    "MARKETPLACE_LISTING",
    "PRICE_UPDATE",
    "STOCK_UPDATE",
    "CANCEL_ORDER",
  ].includes(req.action);

  if ((req.executionScope === "RESEARCH_ONLY" || req.executionScope === "READ_ONLY") && writeAction) {
    failed.push("permission");
    reasons.push("조회/연구 권한으로는 외부 변경을 실행할 수 없습니다.");
  }

  if (req.riskDecision === "BLOCK") {
    failed.push("risk");
    reasons.push("Risk BLOCK — 어떤 AI도 우회할 수 없습니다.");
  }

  if (req.netMarginRate !== null && req.netMarginRate < settings.minMarginRate && WRITE_SCOPES.has(req.executionScope)) {
    failed.push("profit");
    reasons.push("Profit Gate: 최소 마진 미달");
  }

  if (req.missionAiUsd > req.maxAiPerMissionUsd || req.dailyAiUsd > req.dailyAiBudgetUsd) {
    failed.push("budget");
    reasons.push("BUDGET_REVIEW_REQUIRED — AI/운영 예산 한도 초과");
  }

  if (WRITE_SCOPES.has(req.executionScope) && STALE.has(req.freshness)) {
    failed.push("freshness");
    reasons.push("Freshness Gate: stale/unknown 데이터로 LIVE 실행 불가");
  }

  if (req.auditDecision === "BLOCK") {
    failed.push("audit");
    reasons.push("내부감사실 BLOCK");
  } else if (req.auditDecision === "REVIEW_REQUIRED") {
    failed.push("audit");
    reasons.push("내부감사실 REVIEW_REQUIRED");
  }

  const safety = evaluateSafetyGate(settings, {
    action: req.action,
    amountKRW: req.amountKRW,
    dailySpentKRW: req.dailySpentKRW,
    monthlySpentKRW: req.monthlySpentKRW,
    netMarginRate: req.netMarginRate,
    confidence: req.confidence,
    supplierPriceIncreaseRate: req.supplierPriceIncreaseRate ?? null,
    category: req.category,
    supplierId: req.supplierId,
    country: req.country,
    riskDecision: req.riskDecision,
    humanApproved: req.humanApproved,
  });
  if (!safety.allowed) {
    if (safety.ruleHits.includes("risk.BLOCK")) failed.push("risk");
    if (safety.ruleHits.includes("mode.LIVE_OBSERVE")) failed.push("liveObserve");
    if (safety.ruleHits.includes("lock.GLOBAL_SAFETY_LOCK")) failed.push("safetyLock");
    if (safety.ruleHits.some((r) => r.startsWith("limit.") || r === "margin.min")) failed.push("policy");
    reasons.push(...safety.reasons);
  }

  const hard = failed.some((g) =>
    ["risk", "safetyLock", "liveObserve", "permission", "freshness", "profit", "policy"].includes(g),
  );
  if (hard || failed.includes("budget") || failed.includes("audit")) {
    const decision =
      failed.includes("audit") && req.auditDecision === "REVIEW_REQUIRED" && !hard ? "REVIEW_REQUIRED" : "BLOCK";
    return { allowed: false, decision: decision === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "BLOCK", failed, reasons };
  }
  return { allowed: true, decision: "ALLOW", failed: [], reasons: [] };
}
