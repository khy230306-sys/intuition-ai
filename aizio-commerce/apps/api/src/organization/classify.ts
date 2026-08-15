import type { ClassifiedCommand, CommandLevel, DepartmentId, ExecutionScope } from "./types.ts";

function has(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Meaning-based OWNER command classification.
 * Keyword lists are grouped by intent, not a single catch-all.
 * Does not replace the existing operational Command Router.
 */
export function classifyOwnerCommand(raw: string): ClassifiedCommand {
  const text = raw.trim();
  const financialWrite = has(text, [/환불/, /결제/, /정산 실행/, /송금/, /지급/]);
  const write = has(text, [/중지해/, /멈춰/, /등록해/, /발주/, /리스팅/, /판매 중지/, /일시중지/, /잠가/]);
  const urgent = has(text, [/즉시/, /긴급/, /장애/, /시스템 문제/, /위험.*모두/, /자동판매 중지/, /lock/i]);
  const strategic = has(text, [
    /새로운 방향/,
    /사업방향/,
    /전략/,
    /순이익을 높/,
    /수익을 올/,
    /성장/,
    /새 시장/,
    /포트폴리오/,
  ]);
  const research = has(text, [/찾아봐/, /알아봐/, /조사해/, /방법 찾아/, /분석해/, /왜 /, /원인/]);
  const read = has(text, [/상태/, /어디까지/, /보여줘/, /확인해/, /현황/, /알려줘/]);
  const watch = has(text, [/시스템/, /장애/, /헬스/, /watch/i, /문제 없/]);
  const returns = has(text, [/반품/, /클레임/, /환불 왜/, /CS/]);
  const supply = has(text, [/공급처/, /CJ/, /배송비/, /재고 안정/, /창고/]);
  const product = has(text, [/상품 찾/, /팔만/, /카테고리/, /스카우트/, /추천 상품/]);
  const sales = has(text, [/주문/, /배송 어디/, /리스팅/, /판매현황/, /트래킹/]);
  const loss = has(text, [/적자/]);
  const riskCmd = has(text, [/위험 상품/, /인증/, /상표/, /차단/]);

  let level: CommandLevel = "OPERATIONAL";
  if (urgent) level = "URGENT";
  else if (strategic) level = "STRATEGIC";
  else if (product || supply || has(text, [/경쟁이 약한/, /트렌드/])) level = "TACTICAL";

  let executionScope: ExecutionScope = "READ_ONLY";
  if (financialWrite) executionScope = "FINANCIAL_ACTION";
  else if (write) executionScope = "WRITE_ACTION";
  else if (has(text, [/검증 계획/, /준비해/, /테스트 플랜/])) executionScope = "PREPARE_ACTION";
  else if (research || strategic) executionScope = "RESEARCH_ONLY";
  else if (read) executionScope = "READ_ONLY";

  const departments = new Set<DepartmentId>();
  const required = new Set<DepartmentId>();

  if (watch) {
    departments.add("watch");
    departments.add("audit");
    required.add("watch");
  }
  if (strategic) {
    ["strategy", "market", "product", "supply", "marketing", "finance", "risk", "audit"].forEach((d) =>
      departments.add(d as DepartmentId),
    );
    required.add("strategy");
    required.add("finance");
    required.add("risk");
    required.add("audit");
  }
  if (returns) {
    ["cs", "product", "supply", "finance", "data_ai", "audit"].forEach((d) => departments.add(d as DepartmentId));
    required.add("cs");
    required.add("finance");
  }
  if (supply) departments.add("supply");
  if (product) departments.add("product");
  if (sales) departments.add("sales");
  if (loss) {
    departments.add("finance");
    departments.add("product");
    departments.add("risk");
    required.add("finance");
  }
  if (riskCmd) {
    departments.add("risk");
    departments.add("audit");
    required.add("risk");
  }
  if (has(text, [/배송 어디/, /어디까지 왔/])) {
    departments.clear();
    required.clear();
    departments.add("sales");
    required.add("sales");
    level = "OPERATIONAL";
    executionScope = "READ_ONLY";
  }

  if (departments.size === 0) {
    departments.add("strategy");
    departments.add("audit");
  }
  if (executionScope === "WRITE_ACTION" || executionScope === "FINANCIAL_ACTION") {
    departments.add("risk");
    departments.add("audit");
    required.add("risk");
    required.add("audit");
  }

  const objective = strategic
    ? "OWNER 전략 목표를 해석하고 실행 가능한 검증 계획을 제안한다."
    : watch
      ? "시스템 건강과 이상 여부를 확인한다."
      : returns
        ? "반품/CS 증가 원인을 데이터 범위 안에서 조사한다."
        : text;

  return {
    text,
    level,
    executionScope,
    objective,
    departments: [...departments],
    requiredDepartments: [...required],
    intent: strategic ? "org_strategy" : watch ? "org_watch" : returns ? "org_returns" : "org_general",
  };
}

export function isFinancialAction(scope: ExecutionScope): boolean {
  return scope === "FINANCIAL_ACTION";
}
