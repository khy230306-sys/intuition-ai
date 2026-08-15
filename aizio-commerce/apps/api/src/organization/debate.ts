import type { DepartmentResult } from "./types.ts";
import { MAX_DEBATE_ROUNDS, MAX_DEBATE_ROUNDS_CAP, MAX_REANALYSIS_ROUNDS, MAX_REANALYSIS_CAP } from "./types.ts";

export interface DebateConfig {
  maxRounds: number;
  maxReanalysis: number;
}

export interface DebateRound {
  round: number;
  kind: "INDEPENDENT" | "CROSS_REVIEW" | "OBJECTION" | "REANALYSIS";
  conflicts: string[];
  notes: string[];
}

export function debateLimits(cfg?: Partial<DebateConfig>): DebateConfig {
  return {
    maxRounds: Math.min(Math.max(cfg?.maxRounds ?? MAX_DEBATE_ROUNDS, 0), MAX_DEBATE_ROUNDS_CAP),
    maxReanalysis: Math.min(Math.max(cfg?.maxReanalysis ?? MAX_REANALYSIS_ROUNDS, 0), MAX_REANALYSIS_CAP),
  };
}

export function runDebateProtocol(
  results: Array<{ department: string; result: DepartmentResult }>,
  cfg?: Partial<DebateConfig>,
): { rounds: DebateRound[]; conflicts: string[]; stoppedReason: string } {
  const limits = debateLimits(cfg);
  const rounds: DebateRound[] = [];
  rounds.push({
    round: 0,
    kind: "INDEPENDENT",
    conflicts: [],
    notes: results.map((r) => `${r.department}: ${r.result.summary}`),
  });

  const conflicts = findConflicts(results);
  let used = 0;
  if (conflicts.length && used < limits.maxRounds) {
    used += 1;
    rounds.push({ round: used, kind: "CROSS_REVIEW", conflicts, notes: ["교차 검토: 상충 권고를 기록했습니다."] });
  }
  if (conflicts.length && used < limits.maxRounds) {
    used += 1;
    rounds.push({
      round: used,
      kind: "OBJECTION",
      conflicts,
      notes: ["반론 라운드: 더 위험한 권고를 보수적으로 채택합니다. 무한 토론을 종료합니다."],
    });
  }
  if (conflicts.length && limits.maxReanalysis > 0) {
    rounds.push({
      round: used + 1,
      kind: "REANALYSIS",
      conflicts,
      notes: ["선택 재분석 1회 한도. 추가 토론은 차단합니다."],
    });
  }
  return {
    rounds,
    conflicts,
    stoppedReason: conflicts.length
      ? `maxRounds=${limits.maxRounds}, maxReanalysis=${limits.maxReanalysis}`
      : "no_conflict",
  };
}

export function findConflicts(results: Array<{ department: string; result: DepartmentResult }>): string[] {
  const conflicts: string[] = [];
  const recs = results.flatMap((r) => r.result.recommendations.map((x) => ({ dept: r.department, text: x })));
  const risk = results.find((r) => r.department === "risk");
  const product = results.find((r) => r.department === "product");
  if (risk?.result.risks.some((x) => /BLOCK/.test(x)) && product?.result.recommendations.some((x) => /판매|TEST_SELL/.test(x))) {
    conflicts.push("상품본부 판매 권고 vs 리스크본부 BLOCK");
  }
  const finance = results.find((r) => r.department === "finance");
  if (finance?.result.risks.some((x) => /INSUFFICIENT|데이터 없음|미확인/.test(x)) && recs.some((r) => /수익 확정|순이익 확정/.test(r.text))) {
    conflicts.push("재무 데이터 부족 vs 수익 확정 표현");
  }
  for (const left of recs) {
    for (const right of recs) {
      if (left.dept === right.dept || left.text === right.text) continue;
      if (opposing(left.text, right.text)) {
        conflicts.push(`${left.dept} vs ${right.dept}: ${left.text} / ${right.text}`);
      }
    }
  }
  return [...new Set(conflicts)];
}

function opposing(a: string, b: string): boolean {
  const strip = (s: string) =>
    s
      .toLowerCase()
      .replace(/\bdo not\b|\bdon't\b|\bnot\b|금지|하지 말|중단|제외/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const na = strip(a);
  const nb = strip(b);
  if (!na || !nb || na !== nb) return false;
  const neg = (s: string) => /\bdo not\b|\bdon't\b|\bnot\b|금지|하지 말|중단|제외/.test(s.toLowerCase());
  return neg(a) !== neg(b);
}
