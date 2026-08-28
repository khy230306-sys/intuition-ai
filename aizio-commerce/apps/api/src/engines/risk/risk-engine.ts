import type { RiskAssessment, RiskFinding, RiskDecision } from "../../shared/types.ts";
import { nowIso } from "../../shared/ids.ts";

export interface RiskInput {
  title: string;
  description?: string | null;
  brandVisible?: boolean | null;
  possibleBrand?: string | null;
  category?: string | null;
  keywords?: string[];
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
  expectedReturnRate?: number | null;
  priceVolatility?: number | null;
  supplierStability?: number | null;
  marketplaceBannedHints?: string[];
  claims?: string[];
}

const TRADEMARK_HINTS = [
  "nike", "adidas", "gucci", "louis vuitton", "chanel", "hermes", "apple", "samsung",
  "sony", "disney", "pokemon", "nintendo", "mlb", "supreme", "lv", "rolex",
];

const REGULATED: Array<{ code: string; label: string; patterns: RegExp[]; decision: RiskDecision }> = [
  { code: "KC", label: "KC 인증 필요 가능성", patterns: [/전자/, /전기/, /충전기/, /어댑터/, /led/, /electronic/, /charger/], decision: "REVIEW_REQUIRED" },
  { code: "EMC", label: "전기전자 인증", patterns: [/무선/, /블루투스/, /wifi/, /wireless/, /bluetooth/], decision: "REVIEW_REQUIRED" },
  { code: "TOY", label: "어린이제품", patterns: [/유아/, /아기/, /장난감/, /baby/, /toddler/, /toy/, /kids/], decision: "REVIEW_REQUIRED" },
  { code: "MEDICAL", label: "의료기기", patterns: [/의료/, /혈당/, /혈압/, /medical/, /diagnostic/], decision: "BLOCK" },
  { code: "HEALTH", label: "건강기능식품", patterns: [/건강기능/, /영양제/, /supplement/, /vitamin/], decision: "BLOCK" },
  { code: "COSMETIC", label: "화장품", patterns: [/화장품/, /세럼/, /cream/, /cosmetic/, /skincare/], decision: "REVIEW_REQUIRED" },
  { code: "FOOD", label: "식품", patterns: [/식품/, /과자/, /snack/, /food/, /tea/], decision: "REVIEW_REQUIRED" },
  { code: "BATTERY", label: "배터리 포함 제품", patterns: [/배터리/, /리튬/, /battery/, /lithium/, /power bank/, /보조배터리/], decision: "REVIEW_REQUIRED" },
  { code: "HAZMAT", label: "위험물", patterns: [/인화/, /폭발/, /acid/, /flammable/, /explosive/], decision: "BLOCK" },
  { code: "CUSTOMS", label: "통관제한", patterns: [/드론/, /무기/, /laser/, /drone/, /weapon/, /나이프/, /knife/], decision: "BLOCK" },
];

function haystack(input: RiskInput): string {
  return [
    input.title,
    input.description ?? "",
    input.category ?? "",
    input.possibleBrand ?? "",
    ...(input.keywords ?? []),
    ...(input.claims ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function worse(a: RiskDecision, b: RiskDecision): RiskDecision {
  const rank = { PASS: 0, REVIEW_REQUIRED: 1, BLOCK: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function assessRisk(input: RiskInput, now: Date = new Date()): RiskAssessment {
  const text = haystack(input);
  const findings: RiskFinding[] = [];
  let decision: RiskDecision = "PASS";

  if (input.brandVisible || input.possibleBrand) {
    findings.push({
      code: "BRAND_MARK",
      label: "브랜드 표시 여부",
      severity: "warning",
      evidence: input.possibleBrand
        ? `브랜드 후보: ${input.possibleBrand}`
        : "이미지 또는 상품명에 브랜드 표시가 있습니다.",
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  for (const hint of TRADEMARK_HINTS) {
    if (text.includes(hint)) {
      findings.push({
        code: "TRADEMARK",
        label: "상표권",
        severity: "block",
        evidence: `상표/브랜드 키워드 감지: ${hint}`,
      });
      decision = worse(decision, "BLOCK");
      break;
    }
  }

  if (/replica|counterfeit|이미테이션|레플리카|짝퉁/.test(text)) {
    findings.push({
      code: "COUNTERFEIT",
      label: "브랜드 위조 가능성",
      severity: "block",
      evidence: "위조/레플리카 관련 표현이 감지되었습니다.",
    });
    decision = worse(decision, "BLOCK");
  }

  if (/copyright|저작권|disney|marvel|pokemon/.test(text)) {
    findings.push({
      code: "COPYRIGHT",
      label: "저작권",
      severity: "block",
      evidence: "저작권 캐릭터/콘텐츠 가능성이 있습니다.",
    });
    decision = worse(decision, "BLOCK");
  }

  if (/디자인특허|design patent/.test(text)) {
    findings.push({
      code: "DESIGN_RIGHT",
      label: "디자인권",
      severity: "warning",
      evidence: "디자인권 관련 표현이 있습니다.",
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  for (const rule of REGULATED) {
    if (rule.patterns.some((p) => p.test(text))) {
      findings.push({
        code: rule.code,
        label: rule.label,
        severity: rule.decision === "BLOCK" ? "block" : "warning",
        evidence: `카테고리/키워드 규칙: ${rule.label}`,
      });
      decision = worse(decision, rule.decision);
    }
  }

  for (const banned of input.marketplaceBannedHints ?? []) {
    findings.push({
      code: "MARKETPLACE_BAN",
      label: "판매채널 판매금지 품목",
      severity: "block",
      evidence: banned,
    });
    decision = worse(decision, "BLOCK");
  }

  const maxDays = input.deliveryDaysMax ?? input.deliveryDaysMin;
  if (maxDays !== null && maxDays !== undefined && maxDays > 14) {
    findings.push({
      code: "LONG_DELIVERY",
      label: "긴 배송기간",
      severity: "warning",
      evidence: `예상 배송 ${maxDays}일`,
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  if ((input.expectedReturnRate ?? 0) >= 0.2) {
    findings.push({
      code: "HIGH_RETURN",
      label: "높은 예상 반품률",
      severity: "warning",
      evidence: `예상 반품률 ${Math.round((input.expectedReturnRate ?? 0) * 100)}%`,
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  if (/유리|glass|도자기|fragile|파손/.test(text)) {
    findings.push({
      code: "FRAGILE",
      label: "높은 파손 가능성",
      severity: "warning",
      evidence: "파손 민감 소재/키워드",
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  if (input.supplierStability !== null && input.supplierStability !== undefined && input.supplierStability < 0.5) {
    findings.push({
      code: "UNSTABLE_SUPPLY",
      label: "불안정 공급처",
      severity: "warning",
      evidence: `공급 안정성 ${Math.round(input.supplierStability * 100)}/100 환산 미만`,
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  if ((input.priceVolatility ?? 0) >= 0.15) {
    findings.push({
      code: "PRICE_SWING",
      label: "지나친 가격 변동",
      severity: "warning",
      evidence: `가격 변동 ${(input.priceVolatility ?? 0) * 100}%`,
    });
    decision = worse(decision, "REVIEW_REQUIRED");
  }

  const blockCount = findings.filter((f) => f.severity === "block").length;
  const warnCount = findings.filter((f) => f.severity === "warning").length;
  const score = Math.max(0, 100 - blockCount * 40 - warnCount * 12);

  return {
    decision,
    findings,
    score,
    assessedAt: nowIso(now),
  };
}
