import type { AppServices } from "../app-context.ts";
import type { DepartmentId, DepartmentResult, StrategyProposal } from "./types.ts";
import { runAgent } from "./runtime.ts";
import { DataHub } from "../data-hub/hub.ts";
import { assessRisk } from "../engines/risk/risk-engine.ts";
import { buildMarketSnapshot } from "../engines/market/market-intelligence.ts";

export async function runDepartment(
  services: AppServices,
  department: DepartmentId,
  objective: string,
  hub: DataHub,
): Promise<DepartmentResult> {
  runAgent({
    department,
    role: `${department}_analyst`,
    requestedTool:
      department === "finance"
        ? "RUN_PROFIT_ENGINE"
        : department === "risk"
          ? "RUN_RISK_ENGINE"
          : department === "cs"
            ? "CREATE_CS_DRAFT"
            : "READ_PRODUCT",
    providerReady: false,
  });

  switch (department) {
    case "market":
      return marketDept(services, hub);
    case "product":
      return productDept(services, hub);
    case "supply":
      return supplyDept(services, hub);
    case "sales":
      return salesDept(services);
    case "marketing":
      return marketingDept(services);
    case "cs":
      return csDept(services);
    case "finance":
      return financeDept(services, hub);
    case "risk":
      return riskDept(services);
    case "data_ai":
      return dataDept(services);
    case "watch":
      return watchDept(services);
    case "audit":
      return {
        summary: "내부감사실은 부서 실행 후 독립 검증 단계에서 수행합니다.",
        findings: [],
        recommendations: ["부서 결과 취합 후 감사"],
        risks: [],
        evidenceRefs: ["audit:deferred"],
        confidence: 1,
        dataFreshness: "LIVE",
      };
    case "strategy":
    default:
      return strategyPlaceholder(objective);
  }
}

function marketDept(services: AppServices, hub: DataHub): DepartmentResult {
  const snap = buildMarketSnapshot("org", []);
  hub.remember({ source: "market-intelligence", entityType: "snapshot", entityId: "org", payload: snap });
  const coupang = services.repo.listIntegrations().find((i) => i.id === "coupang");
  const naver = services.repo.listIntegrations().find((i) => i.id === "naver");
  return {
    summary: "LIVE 시장가격 수집이 연결되지 않아 관측가격은 없습니다.",
    findings: [
      `Coupang ${coupang?.status ?? "PENDING_SETUP"}`,
      `Naver ${naver?.status ?? "PENDING_SETUP"}`,
      `시장 스냅샷 freshness=${snap.freshness}`,
    ],
    recommendations: ["쿠팡/네이버 LIVE 연결 후에만 시장 관측가격을 사용"],
    risks: ["없는 시세를 AI가 만들면 안 됨"],
    evidenceRefs: ["engine:market-intelligence", `integration:${coupang?.status}`, `integration:${naver?.status}`],
    confidence: 0.2,
    dataFreshness: snap.freshness,
  };
}

function productDept(services: AppServices, hub: DataHub): DepartmentResult {
  const counts = services.repo.scoutCountsFromDb();
  const last = services.repo.latestScoutRun();
  hub.remember({ source: "product-scout", entityType: "counts", entityId: "db", payload: counts });
  const cats = [...new Set(services.repo.listProducts({ limit: 50 }).map((p) => p.category).filter(Boolean))];
  return {
    summary: `DB 기준 분석 ${counts.analyzed} · 추천 후보 ${counts.recommended} · 한국 배송 ${counts.koreaShippable}`,
    findings: [
      last ? `마지막 스카우트 ${last.createdAt}` : "스카우트 실행 이력 없음",
      cats.length ? `관측 카테고리: ${cats.join(", ")}` : "카테고리 LIVE 데이터 없음",
    ],
    recommendations: counts.recommended
      ? ["기존 후보를 TEST_SELL 검증 플랜 대상으로 검토"]
      : ["CJ READY 후 생활잡화 키워드로 20~50개 READ-ONLY 스카우트"],
    risks: ["가짜 상품/가격 생성 금지"],
    evidenceRefs: ["db:products", last ? `scout_run:${last.createdAt}` : "scout_run:none"],
    confidence: counts.analyzed > 0 ? 0.55 : 0.25,
    dataFreshness: last ? "LIVE" : "INSUFFICIENT_DATA",
  };
}

async function supplyDept(services: AppServices, hub: DataHub): Promise<DepartmentResult> {
  const status = await services.cj.getStatus();
  hub.remember({ source: "cjdropshipping", entityType: "status", entityId: "connection", payload: { status } });
  return {
    summary: `CJdropshipping ${status}`,
    findings: [
      status === "READY" ? "공급처 READY — READ API만 사용" : "공급처 미연결. 신규 공급처 LIVE 탐색 불가",
      `주문 생성 능력: ${services.cj.capabilities().orderCreate ? "있음" : "LIVE_OBSERVE에서 차단"}`,
    ],
    recommendations: status === "READY" ? ["가격/재고/한국 배송 스냅샷 재사용"] : ["CJ_API_KEY 또는 CJ_ACCESS_TOKEN 설정"],
    risks: ["자격정보 없으면 공급가·배송비를 추정하지 않음"],
    evidenceRefs: [`cj:status:${status}`],
    confidence: status === "READY" ? 0.6 : 0.3,
    dataFreshness: status === "READY" ? "LIVE" : "NOT_CONNECTED",
  };
}

function salesDept(services: AppServices): DepartmentResult {
  const orders = services.repo.listOrders(20);
  const live = services.repo.countProducts("status = 'LIVE'");
  return {
    summary: `주문 ${orders.length}건 · LIVE 상품 ${live}개 (가상 주문 없음)`,
    findings: orders.length ? orders.map((o) => `${o.marketplace} ${o.orderStatus}`) : ["마켓플레이스 주문 없음"],
    recommendations: ["주문 조회는 READ_ONLY"],
    risks: [],
    evidenceRefs: ["db:orders"],
    confidence: 0.7,
    dataFreshness: orders.length ? "LIVE" : "UNKNOWN",
  };
}

function marketingDept(services: AppServices): DepartmentResult {
  const n = services.repo.countProducts();
  return {
    summary: "광고비 LIVE 데이터가 없어 광고 예산을 만들지 않습니다.",
    findings: [`콘텐츠 초안 대상 상품 ${n}개`, "검색키워드/광고비는 INSUFFICIENT_DATA"],
    recommendations: ["제목·키워드는 Content Engine 근거 필드만 사용"],
    risks: ["광고비 날조 금지"],
    evidenceRefs: ["engine:content"],
    confidence: 0.3,
    dataFreshness: "INSUFFICIENT_DATA",
  };
}

function csDept(services: AppServices): DepartmentResult {
  const drafts = services.repo.listCsDrafts(20);
  return {
    summary: `CS 초안 ${drafts.length}건. 고위험 자동 전송 없음.`,
    findings: ["반품 LIVE 패턴이 부족하면 원인을 단정하지 않음"],
    recommendations: ["HUMAN_REVIEW 클레임은 초안만"],
    risks: ["환불 실행은 Execution Core 전용"],
    evidenceRefs: ["db:cs_drafts"],
    confidence: 0.4,
    dataFreshness: drafts.length ? "LIVE" : "INSUFFICIENT_DATA",
  };
}

function financeDept(services: AppServices, hub: DataHub): DepartmentResult {
  const totals = services.repo.profitTotals();
  hub.remember({ source: "profit-truth", entityType: "totals", entityId: "ledger", payload: totals });
  const loss = services.repo.listProducts({ limit: 100 }).filter((p) => {
    const profit = p.profit as { expectedNetProfit?: number } | null;
    return profit !== null && (profit.expectedNetProfit ?? 0) < 0;
  });
  return {
    summary: `예상 순이익 ₩${totals.expectedNetProfit} · 실제 확정 ₩${totals.actualNetProfit} (별도 집계)`,
    findings: [
      `적자 추정 상품 ${loss.length}개 (ESTIMATE, 확정 아님)`,
      "마켓 수수료/광고/반품손실은 대부분 INSUFFICIENT_DATA",
    ],
    recommendations: ["금액은 Profit Truth 코드만 사용", "실제 순이익은 정산 전까지 0으로 둘 수 있음"],
    risks: ["수익 과대평가 금지"],
    evidenceRefs: ["engine:profit-truth", "db:settlements"],
    confidence: 0.45,
    dataFreshness: "ESTIMATE",
  };
}

function riskDept(services: AppServices): DepartmentResult {
  const products = services.repo.listProducts({ limit: 100 });
  const blocked = products.filter((p) => (p.risk as { decision?: string } | null)?.decision === "BLOCK");
  const sample = products[0];
  if (sample) assessRisk({ title: sample.title, category: sample.category });
  return {
    summary: `Risk BLOCK ${blocked.length}개 · 우회 불가`,
    findings: blocked.slice(0, 5).map((p) => `${p.title} BLOCK`),
    recommendations: ["BLOCK 상품은 판매/발주 금지", "불확실하면 REVIEW_REQUIRED"],
    risks: blocked.length ? ["BLOCK 상품이 파이프라인에 있음"] : [],
    evidenceRefs: ["engine:risk"],
    confidence: 0.8,
    dataFreshness: "LIVE",
  };
}

function dataDept(_services: AppServices): DepartmentResult {
  return {
    summary: "AI Provider는 미설정 시 NOT_CONFIGURED. 비용 0.",
    findings: ["OpenAI/Gemini/Claude fallback registry 유지", "학습 데이터는 실제 성과가 있을 때만 기록"],
    recommendations: ["Mission당 AI 예산 한도 적용"],
    risks: ["불필요 부서 호출로 비용 급증"],
    evidenceRefs: ["engine:provider-registry"],
    confidence: 0.5,
    dataFreshness: "UNKNOWN",
  };
}

function watchDept(services: AppServices): DepartmentResult {
  const last = services.repo.latestWatchSnapshot();
  return {
    summary: `System Watch overall=${last?.overall ?? "UNKNOWN"} lock=${last?.safetyLock ? "ON" : "OFF"}`,
    findings: last?.findings ?? ["아직 Watch 스냅샷 없음 — 워커가 주기 점검합니다."],
    recommendations: ["CRITICAL이면 GLOBAL_SAFETY_LOCK"],
    risks: [],
    evidenceRefs: ["watch:snapshot"],
    confidence: last ? 0.7 : 0.3,
    dataFreshness: last ? "LIVE" : "UNKNOWN",
  };
}

function strategyPlaceholder(objective: string): DepartmentResult {
  return {
    summary: "전략 종합은 다른 본부 결과 이후 수행합니다.",
    findings: [objective],
    recommendations: [],
    risks: [],
    evidenceRefs: ["strategy:pending"],
    confidence: 0.2,
    dataFreshness: "UNKNOWN",
  };
}

export function synthesizeStrategy(input: {
  objective: string;
  results: Array<{ department: DepartmentId; result: DepartmentResult }>;
}): StrategyProposal[] {
  const by = Object.fromEntries(input.results.map((r) => [r.department, r.result])) as Partial<
    Record<DepartmentId, DepartmentResult>
  >;
  const product = by.product;
  const supply = by.supply;
  const finance = by.finance;
  const risk = by.risk;
  const market = by.market;
  const evidence = input.results.flatMap((r) => r.result.evidenceRefs);

  const connected = supply?.dataFreshness === "LIVE";
  const hasCandidates = /추천 후보 [1-9]/.test(product?.summary ?? "");

  const proposals: StrategyProposal[] = [];
  if (hasCandidates) {
    proposals.push({
      title: "기존 스카우트 후보 소량 TEST_SELL 검증",
      hypothesis: "DB에 있는 추천 후보만으로 14일 검증하면 가짜 상품 없이 학습 데이터를 쌓을 수 있다.",
      expectedUpside: ["실제 공급가/배송비 기반 예비 마진 확인"],
      requiredResources: ["CJ READ", "수동 환율 또는 LIVE FX"],
      expectedCosts: finance?.findings.slice(0, 2) ?? ["AI 비용 소량", "광고비 UNKNOWN — 추정하지 않음"],
      risks: risk?.risks ?? ["수수료/반품 미확인"],
      validationPlan: ["최대 10개", "14일 TEST_SELL", "LIVE 주문 없음 (LIVE_OBSERVE)"],
      confidence: 0.62,
      evidenceRefs: evidence,
    });
  }
  proposals.push({
    title: "저규제 생활잡화 READ-ONLY 파이프라인 고정",
    hypothesis: "식품/전자/브랜드를 제외한 생활잡화로 공급망 데이터를 먼저 안정화하는 것이 손실 확대보다 안전하다.",
    expectedUpside: ["인증 위험 상대적 낮음", "CJ 생활잡화 키워드와 정합"],
    requiredResources: ["CJ_API_KEY", "연결 테스트 READY"],
    expectedCosts: ["API 호출 QPS=1", "AI 전략 비용 한도 내"],
    risks: [market?.summary ?? "시장가 없음", "경쟁 강도 UNKNOWN"],
    validationPlan: ["20~50개 스카우트", "한국 배송 가능만 후보", "Risk BLOCK 제외"],
    confidence: connected ? 0.7 : 0.48,
    evidenceRefs: evidence,
  });
  if (!connected) {
    proposals.push({
      title: "공급처 연결이 전략의 선행 조건",
      hypothesis: "LIVE 공급가 없이 수익 방향을 숫자로 확정할 수 없다.",
      expectedUpside: ["가짜 수익 0 유지"],
      requiredResources: ["OWNER가 CJ API Key 발급"],
      expectedCosts: ["자격정보 발급 외 0원"],
      risks: ["연결 전 판매 확장 금지"],
      validationPlan: ["연결 테스트", "SYSTEM WATCH HEALTHY 확인", "그 다음 스카우트"],
      confidence: 0.8,
      evidenceRefs: evidence,
    });
  }
  return proposals.slice(0, 3).map((p) => ({
    ...p,
    hypothesis: `${p.hypothesis} 목표: ${input.objective}`,
  }));
}
