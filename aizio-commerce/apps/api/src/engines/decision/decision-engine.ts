import type {
  DecisionResult,
  ProductStatus,
  ProfitAnalysis,
  RiskAssessment,
  ScoreBreakdown,
} from "../../shared/types.ts";
import { clamp, toRate } from "../../shared/money.ts";

export interface DecisionInput {
  profit: ProfitAnalysis;
  risk: RiskAssessment;
  competitionScore: number | null;
  supplyStability: number | null;
  deliveryDays: number | null;
  expectedReturnRate: number | null;
  dataConfidence: number | null;
}

function scoreProfit(profit: ProfitAnalysis) {
  if (profit.missingInputs.includes("판매가격 미확인") || profit.sellingPrice <= 0) {
    return { score: 0, reason: "판매가격이 없어 이익을 확정할 수 없습니다." };
  }
  if (profit.expectedNetProfit < 0) {
    return { score: 5, reason: `적자 예상 ₩${profit.expectedNetProfit.toLocaleString("ko-KR")}` };
  }
  const scaled = clamp(profit.expectedNetProfit / 200, 0, 100);
  return {
    score: Math.round(scaled),
    reason: `예상 순이익 ₩${profit.expectedNetProfit.toLocaleString("ko-KR")}`,
  };
}

function scoreMargin(profit: ProfitAnalysis) {
  if (profit.sellingPrice <= 0) {
    return { score: 0, reason: "마진 계산에 판매가가 필요합니다." };
  }
  const pct = profit.netMarginRate * 100;
  return {
    score: Math.round(clamp(pct * 2, 0, 100)),
    reason: `순마진 ${pct.toFixed(1)}%`,
  };
}

function scoreOrUnknown(
  value: number | null,
  reasonLive: (v: number) => string,
  unknown: string,
) {
  if (value === null || !Number.isFinite(value)) {
    return { score: 40, reason: unknown };
  }
  return { score: Math.round(clamp(value, 0, 100)), reason: reasonLive(value) };
}

export function decideProduct(input: DecisionInput): DecisionResult {
  if (input.risk.decision === "BLOCK") {
    return {
      status: "BLOCKED",
      compositeScore: 0,
      scores: emptyScores("Risk Engine BLOCK — Manager AI가 해제할 수 없습니다."),
      reasons: ["위험 검사 결과가 BLOCK입니다. 판매를 진행하지 않습니다."],
      warnings: input.risk.findings.filter((f) => f.severity === "block").map((f) => f.label),
      blockedByRisk: true,
    };
  }

  const confidence = input.dataConfidence ?? input.profit.confidence;
  const competition = input.competitionScore;
  const supply = input.supplyStability;
  const deliveryScore =
    input.deliveryDays === null
      ? null
      : clamp(100 - input.deliveryDays * 5, 0, 100);
  const returnScore =
    input.expectedReturnRate === null
      ? null
      : clamp(100 - input.expectedReturnRate * 250, 0, 100);

  const scores: ScoreBreakdown = {
    expectedNetProfit: scoreProfit(input.profit),
    netMargin: scoreMargin(input.profit),
    competition: scoreOrUnknown(
      competition,
      (v) => `경쟁 점수 ${Math.round(v)}/100`,
      "경쟁도 데이터 없음 (UNKNOWN)",
    ),
    supplyStability: scoreOrUnknown(
      supply,
      (v) => `공급 안정성 ${Math.round(v)}/100`,
      "공급 안정성 데이터 없음",
    ),
    deliverySpeed: scoreOrUnknown(
      deliveryScore,
      () => `예상 배송 ${input.deliveryDays}일`,
      "배송기간 미확인",
    ),
    expectedReturnRate: scoreOrUnknown(
      returnScore,
      () =>
        input.expectedReturnRate === null
          ? "반품률 데이터 없음"
          : `예상 반품률 ${Math.round(input.expectedReturnRate * 100)}%`,
      "반품률 데이터 없음 (INSUFFICIENT_DATA)",
    ),
    riskScore: {
      score: input.risk.score,
      reason: `위험 판정 ${input.risk.decision}`,
    },
    dataConfidence: {
      score: Math.round(clamp((confidence ?? 0) * 100, 0, 100)),
      reason: `데이터 신뢰도 ${Math.round((confidence ?? 0) * 100)}%`,
    },
  };

  const weights: Array<[keyof ScoreBreakdown, number]> = [
    ["expectedNetProfit", 0.22],
    ["netMargin", 0.18],
    ["competition", 0.1],
    ["supplyStability", 0.12],
    ["deliverySpeed", 0.1],
    ["expectedReturnRate", 0.08],
    ["riskScore", 0.12],
    ["dataConfidence", 0.08],
  ];
  const compositeScore = Math.round(
    weights.reduce((sum, [key, w]) => sum + scores[key].score * w, 0),
  );

  const warnings: string[] = [];
  if (input.profit.missingInputs.length > 0) {
    warnings.push(...input.profit.missingInputs.slice(0, 4));
  }
  if (input.deliveryDays !== null && input.deliveryDays >= 8) {
    warnings.push(`한국 배송 평균 ${input.deliveryDays}일`);
  }
  for (const f of input.risk.findings.filter((x) => x.severity === "warning")) {
    warnings.push(f.label);
  }

  let status: ProductStatus = "REJECTED";
  const reasons: string[] = [];

  if ((confidence ?? 0) < 0.35) {
    status = "REVIEW_REQUIRED";
    reasons.push("데이터 신뢰도가 낮아 자동 추천할 수 없습니다.");
  } else if (input.risk.decision === "REVIEW_REQUIRED") {
    status = "REVIEW_REQUIRED";
    reasons.push("위험 항목이 있어 사람 검토가 필요합니다.");
  } else if (input.profit.expectedNetProfit < 0) {
    status = "REJECTED";
    reasons.push("예상 순이익이 적자입니다.");
  } else if (input.profit.netMarginRate < 0.15) {
    status = "REJECTED";
    reasons.push(`순마진 ${(input.profit.netMarginRate * 100).toFixed(1)}%가 거절 기준 15% 미만입니다.`);
  } else if (compositeScore >= 72 && input.profit.netMarginRate >= 0.25 && (confidence ?? 0) >= 0.7) {
    status = "TEST_SELL";
    reasons.push(`예상 순마진 ${(input.profit.netMarginRate * 100).toFixed(1)}%`);
    reasons.push(scores.competition.reason);
    reasons.push(scores.supplyStability.reason);
    reasons.push("테스트 판매 후보입니다.");
  } else if (compositeScore >= 55 && input.profit.netMarginRate >= 0.15) {
    status = "REVIEW_REQUIRED";
    reasons.push("수익 가능성은 있으나 추가 확인이 필요합니다.");
  } else {
    status = "REJECTED";
    reasons.push("종합 점수가 판매 기준에 미달합니다.");
  }

  return {
    status,
    compositeScore,
    scores,
    reasons,
    warnings,
    blockedByRisk: false,
  };
}

function emptyScores(reason: string): ScoreBreakdown {
  const cell = { score: 0, reason };
  return {
    expectedNetProfit: cell,
    netMargin: cell,
    competition: cell,
    supplyStability: cell,
    deliverySpeed: cell,
    expectedReturnRate: cell,
    riskScore: cell,
    dataConfidence: cell,
  };
}

export function toTrace(decision: DecisionResult, actor = "DECISION_ENGINE") {
  return {
    decision: decision.status,
    reasons: decision.reasons,
    warnings: decision.warnings,
    createdAt: new Date().toISOString(),
    actor,
  };
}

export { toRate, clamp };
