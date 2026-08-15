import type { AuditDecision, DepartmentResult, StrategyProposal } from "./types.ts";

export interface AuditInput {
  results: Array<{ department: string; result: DepartmentResult }>;
  proposals: StrategyProposal[];
  freshness: string[];
  inventedNumberHints: string[];
  riskBypassAttempt: boolean;
  missingCostFields: string[];
  executionReady: boolean;
}

export interface AuditReport {
  decision: AuditDecision;
  findings: string[];
  warnings: string[];
}

export function runInternalAudit(input: AuditInput): AuditReport {
  const findings: string[] = [];
  const warnings: string[] = [];

  if (input.riskBypassAttempt) {
    findings.push("Risk Gate 우회 시도가 감지되어 BLOCK합니다.");
    return { decision: "BLOCK", findings, warnings };
  }

  for (const hint of input.inventedNumberHints) {
    findings.push(`존재하지 않는 데이터 인용 의심: ${hint}`);
  }

  for (const r of input.results) {
    if (r.result.evidenceRefs.length === 0 && r.result.confidence > 0.5) {
      warnings.push(`${r.department}: 근거 없이 높은 신뢰도`);
    }
    if (r.result.dataFreshness === "UNKNOWN" || r.result.dataFreshness === "STALE") {
      warnings.push(`${r.department}: 데이터 freshness=${r.result.dataFreshness}`);
    }
  }

  if (input.missingCostFields.length) {
    warnings.push(`비용 누락: ${input.missingCostFields.join(", ")}`);
  }

  const overclaim = input.proposals.some((p) => /확정 순이익|실제 시장가 ₩/.test(`${p.title}${p.hypothesis}`));
  if (overclaim) findings.push("수익 과대평가 또는 시장가 날조 표현");

  const staleLive = input.freshness.includes("STALE") && input.executionReady;
  if (staleLive) findings.push("stale data로 LIVE 실행 조건이 켜져 있습니다.");

  if (findings.length) {
    return { decision: findings.some((f) => /우회|날조/.test(f)) ? "BLOCK" : "REVIEW_REQUIRED", findings, warnings };
  }
  if (warnings.length) return { decision: "PASS_WITH_WARNINGS", findings, warnings };
  return { decision: "PASS", findings, warnings };
}
