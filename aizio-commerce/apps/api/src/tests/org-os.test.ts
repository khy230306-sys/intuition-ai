import { describe, expect, it } from "vitest";
import { openSqlite, migrate } from "../db/client.ts";
import { Repository, type ProductRecord } from "../db/repository.ts";
import { createApp } from "../routes/app.ts";
import { ProviderRegistry } from "../engines/manager/provider-registry.ts";
import { ManagerAi } from "../engines/manager/manager-ai.ts";
import { VisionEngine } from "../engines/vision/vision-engine.ts";
import { OpenAiAdapter } from "../adapters/ai/openai.ts";
import { GeminiAdapter } from "../adapters/ai/gemini.ts";
import { ClaudeAdapter } from "../adapters/ai/claude.ts";
import { CjDropshippingAdapter } from "../adapters/suppliers/cjdropshipping.ts";
import { CoupangAdapter } from "../adapters/marketplaces/coupang.ts";
import { NaverCommerceAdapter } from "../adapters/marketplaces/naver.ts";
import { DEFAULT_SAFETY_SETTINGS } from "../shared/types.ts";
import { classifyOwnerCommand } from "../organization/classify.ts";
import { selectDepartments, unusedDepartments } from "../organization/router.ts";
import { runDebateProtocol } from "../organization/debate.ts";
import { runInternalAudit } from "../organization/audit.ts";
import { executeMissionPlan, resumeMissions, startOwnerMission } from "../organization/orchestrator.ts";
import { evaluateExecutionGates, type ExecutionRequest } from "../execution/gates.ts";
import { RateLimitManager } from "../data-hub/rate-limit.ts";
import { runWatchCycle, safeRecoveryAction } from "../watch/cycle.ts";
import { evaluateSafetyGate } from "../engines/safety/safety-gate.ts";
import { toolsFor } from "../organization/permissions.ts";
import { runAgent } from "../organization/runtime.ts";
import type { AppServices } from "../app-context.ts";
import type { DepartmentResult } from "../organization/types.ts";
import type { ProductStatus } from "../shared/types.ts";

function services(): AppServices {
  const db = openSqlite(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.saveSafetySettings(DEFAULT_SAFETY_SETTINGS);
  const providers = new ProviderRegistry([
    new OpenAiAdapter("", "x"),
    new GeminiAdapter("", "x"),
    new ClaudeAdapter("", "x"),
  ]);
  return {
    repo,
    providers,
    manager: new ManagerAi(providers),
    vision: new VisionEngine(providers),
    cj: new CjDropshippingAdapter("", "", ""),
    coupang: new CoupangAdapter("", "", ""),
    naver: new NaverCommerceAdapter("", ""),
  };
}

function product(over: Partial<ProductRecord> & { id: string; status: ProductStatus }): ProductRecord {
  const now = new Date().toISOString();
  return {
    supplier: "cjdropshipping",
    supplierProductId: over.id,
    supplierVariantId: "v1",
    title: "sample",
    category: "Home",
    imageUrl: null,
    supplierPriceKrw: 1000,
    supplierPriceUsd: 1,
    currency: "KRW",
    shippingKrw: 500,
    shippingUsd: 0.4,
    shippingAvailability: "AVAILABLE",
    shippingMethod: "CJ Packet",
    recommendedPriceKrw: 4000,
    targetMarginPriceKrw: 4000,
    marketObservedPriceKrw: null,
    sellingPriceKind: "TARGET_MARGIN_PRICE",
    profitStage: "PRELIMINARY_MARGIN",
    stock: 10,
    warehouse: "CN",
    deliveryMin: 8,
    deliveryMax: 15,
    weight: 300,
    sourceUrl: null,
    capturedAt: now,
    scoutCandidate: false,
    profit: { expectedNetProfit: 200, netMarginRate: 0.2 },
    risk: { decision: "PASS" },
    decision: null,
    market: null,
    content: null,
    sourceFacts: {},
    confidence: 0.7,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function deptResult(partial: Partial<DepartmentResult> = {}): DepartmentResult {
  return {
    summary: "ok",
    findings: ["finding"],
    recommendations: ["keep researching"],
    risks: [],
    evidenceRefs: ["db:products"],
    confidence: 0.7,
    dataFreshness: "UNKNOWN",
    ...partial,
  };
}

function gateReq(over: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    action: "MARKETPLACE_LISTING",
    executionScope: "WRITE_ACTION",
    amountKRW: 0,
    dailySpentKRW: 0,
    monthlySpentKRW: 0,
    dailyAiUsd: 0,
    missionAiUsd: 0,
    maxAiPerMissionUsd: 1,
    dailyAiBudgetUsd: 10,
    netMarginRate: 0.3,
    confidence: 0.9,
    freshness: "LIVE",
    riskDecision: "PASS",
    auditDecision: "PASS",
    humanApproved: true,
    ...over,
  };
}

describe("Commander classification", () => {
  it("routes strategic research-only commands", () => {
    const c = classifyOwnerCommand("새로운 방향을 찾아봐");
    expect(c.level).toBe("STRATEGIC");
    expect(c.executionScope).toBe("RESEARCH_ONLY");
    expect(c.intent).toBe("org_strategy");
  });

  it("routes operational write commands", () => {
    const c = classifyOwnerCommand("적자 상품 판매 중지해");
    expect(c.level).toBe("OPERATIONAL");
    expect(c.executionScope).toBe("WRITE_ACTION");
  });

  it("routes urgent commands", () => {
    const c = classifyOwnerCommand("자동판매 중지해");
    expect(c.level).toBe("URGENT");
    expect(c.executionScope).toBe("WRITE_ACTION");
  });

  it("keeps research-only permission for profit exploration", () => {
    const c = classifyOwnerCommand("이번 달 순이익을 높여");
    expect(c.executionScope).toBe("RESEARCH_ONLY");
    expect(toolsFor("finance").deny).toContain("PAYMENT");
    expect(toolsFor("finance").allow).not.toContain("PAYMENT");
  });

  it("classifies financial action separately from research", () => {
    const c = classifyOwnerCommand("고객 환불 실행해");
    expect(c.executionScope).toBe("FINANCIAL_ACTION");
  });
});

describe("Department router", () => {
  it("runs only needed departments for tracking lookup", () => {
    const cmd = classifyOwnerCommand("배송 어디까지 왔어");
    const selected = selectDepartments(cmd);
    expect(selected).toEqual(["sales"]);
    expect(unusedDepartments(cmd)).toContain("strategy");
    expect(unusedDepartments(cmd)).toContain("marketing");
  });

  it("does not fan out every department for a CS question", () => {
    const cmd = classifyOwnerCommand("반품률 왜 올랐어");
    const selected = selectDepartments(cmd);
    expect(selected).toContain("cs");
    expect(selected).not.toContain("marketing");
    expect(selected).not.toContain("sales");
    expect(selected.length).toBeLessThan(12);
  });
});

describe("Debate protocol", () => {
  it("caps debate and reanalysis rounds", () => {
    const debate = runDebateProtocol(
      [
        { department: "market", result: deptResult({ recommendations: ["expand pets"] }) },
        { department: "risk", result: deptResult({ recommendations: ["do not expand pets"], risks: ["brand"] }) },
      ],
      { maxRounds: 9, maxReanalysis: 9 },
    );
    const debateRounds = debate.rounds.filter((r) => r.kind === "CROSS_REVIEW" || r.kind === "OBJECTION");
    expect(debateRounds.length).toBeLessThanOrEqual(2);
    expect(debate.rounds.filter((r) => r.kind === "REANALYSIS").length).toBeLessThanOrEqual(1);
    expect(debate.conflicts.length).toBeGreaterThan(0);
  });

  it("audits after debate", () => {
    const results = [
      { department: "finance", result: deptResult({ evidenceRefs: [] }) },
      { department: "risk", result: deptResult({ risks: ["policy"] }) },
    ];
    const debate = runDebateProtocol(results);
    const audit = runInternalAudit({
      results,
      proposals: [],
      freshness: ["UNKNOWN"],
      inventedNumberHints: [],
      riskBypassAttempt: false,
      missingCostFields: [],
      executionReady: false,
    });
    expect(debate.rounds.length).toBeGreaterThan(0);
    expect(["PASS", "PASS_WITH_WARNINGS", "REVIEW_REQUIRED", "BLOCK"]).toContain(audit.decision);
  });
});

describe("Agent runtime", () => {
  it("denies write tools even if requested", () => {
    const run = runAgent({
      department: "finance",
      role: "treasurer",
      requestedTool: "PAYMENT",
      providerReady: true,
    });
    expect(run.status).toBe("DENIED");
  });
});

describe("Execution Core gates", () => {
  it("blocks Risk BLOCK products from write execution", () => {
    const decision = evaluateExecutionGates(DEFAULT_SAFETY_SETTINGS, gateReq({ riskDecision: "BLOCK" }));
    expect(decision.allowed).toBe(false);
    expect(decision.failed).toContain("risk");
  });

  it("blocks insufficient freshness", () => {
    const decision = evaluateExecutionGates(DEFAULT_SAFETY_SETTINGS, gateReq({ freshness: "STALE" }));
    expect(decision.failed).toContain("freshness");
    expect(decision.allowed).toBe(false);
  });

  it("blocks budget exceeded", () => {
    const decision = evaluateExecutionGates(
      DEFAULT_SAFETY_SETTINGS,
      gateReq({ dailyAiUsd: 50, dailyAiBudgetUsd: 10, executionScope: "RESEARCH_ONLY", action: "PAUSE_PRODUCT" }),
    );
    expect(decision.failed).toContain("budget");
  });

  it("blocks permission mismatch", () => {
    const decision = evaluateExecutionGates(
      DEFAULT_SAFETY_SETTINGS,
      gateReq({ executionScope: "READ_ONLY", action: "MARKETPLACE_LISTING", freshness: "LIVE" }),
    );
    expect(decision.failed).toContain("permission");
  });
});

describe("SYSTEM WATCH", () => {
  it("detects API 429 burst", () => {
    const { repo } = services();
    for (let i = 0; i < 6; i += 1) {
      repo.recordApiEvent({ provider: "cj", ok: false, status: 429, error: "429", circuit: "CLOSED" });
    }
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("429"))).toBe(true);
  });

  it("detects API 401", () => {
    const { repo } = services();
    repo.recordApiEvent({ provider: "cj", ok: false, status: 401, error: "401", circuit: "CLOSED" });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("401"))).toBe(true);
  });

  it("detects timeout burst", () => {
    const { repo } = services();
    for (let i = 0; i < 4; i += 1) {
      repo.recordApiEvent({ provider: "cj", ok: false, status: 0, error: "timeout", circuit: "CLOSED" });
    }
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("timeout"))).toBe(true);
  });

  it("detects queue backlog", () => {
    const { repo } = services();
    for (let i = 0; i < 25; i += 1) repo.enqueueJob("SCOUT_PRODUCTS", { i });
    const snap = runWatchCycle(repo);
    expect(snap.queue).toBe("Backlog");
    expect(repo.listIncidents().some((i) => i.title.includes("Queue backlog"))).toBe(true);
  });

  it("detects stuck jobs", () => {
    const { repo } = services();
    const old = new Date(Date.now() - 20 * 60_000).toISOString();
    repo.seedJob({ type: "SCOUT_PRODUCTS", status: "RUNNING", updatedAt: old, createdAt: old });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("Stuck job"))).toBe(true);
  });

  it("detects duplicate running jobs", () => {
    const { repo } = services();
    repo.seedJob({ type: "SCOUT_PRODUCTS", status: "RUNNING", payload: { k: 1 } });
    repo.seedJob({ type: "SCOUT_PRODUCTS", status: "RUNNING", payload: { k: 1 } });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("Duplicate job"))).toBe(true);
  });

  it("detects negative/zero supplier price", () => {
    const { repo } = services();
    repo.saveProduct(product({ id: "neg", status: "DISCOVERED", supplierPriceKrw: 0 }));
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("비정상 공급가"))).toBe(true);
  });

  it("detects duplicated marketplace orders", () => {
    const { repo } = services();
    const now = new Date().toISOString();
    const ship = { ciphertext: "c", iv: "i", tag: "t" };
    repo.insertOrder({
      id: "o1",
      marketplace: "COUPANG",
      marketplaceOrderId: "mkt-1",
      productId: "p",
      variantId: null,
      quantity: 1,
      saleAmount: 1000,
      shipping: ship,
      orderStatus: "NEW",
      fulfillmentStatus: "NONE",
      supplierOrderId: "cj-dup",
      createdAt: now,
    });
    repo.insertOrder({
      id: "o2",
      marketplace: "COUPANG",
      marketplaceOrderId: "mkt-2",
      productId: "p",
      variantId: null,
      quantity: 1,
      saleAmount: 1000,
      shipping: ship,
      orderStatus: "NEW",
      fulfillmentStatus: "NONE",
      supplierOrderId: "cj-dup",
      createdAt: now,
    });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("중복 마켓 주문"))).toBe(true);
  });

  it("detects stale supplier cost on LIVE products", () => {
    const { repo } = services();
    repo.saveProduct(product({ id: "live-stale", status: "LIVE" }));
    repo.saveSnapshot({
      source: "CJ",
      entityType: "product",
      entityId: "live-stale",
      payloadHash: "h",
      payload: {},
      capturedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
      expiresAt: null,
      freshness: "STALE",
    });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("STALE 공급원가"))).toBe(true);
  });

  it("detects settlement mismatch", () => {
    const { repo } = services();
    repo.saveSettlement({
      orderId: "missing-order",
      expectedNetProfit: 1000,
      actualProductCost: 500,
      actualShipping: 100,
      actualFee: 50,
      actualAds: 0,
      actualRefund: 0,
      actualReturnLoss: 0,
      actualSettlement: 700,
      actualNetProfit: 700,
    });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("정산 불일치"))).toBe(true);
  });

  it("detects supplier price spike", () => {
    const { repo } = services();
    repo.saveProduct(product({ id: "spike", status: "DISCOVERED", supplierPriceKrw: 20000 }));
    repo.insertPriceHistory({
      productId: "spike",
      supplier: "cjdropshipping",
      supplierProductId: "spike",
      variantId: "v1",
      price: 10000,
      currency: "KRW",
      capturedAt: new Date().toISOString(),
    });
    repo.insertPriceHistory({
      productId: "spike",
      supplier: "cjdropshipping",
      supplierProductId: "spike",
      variantId: "v1",
      price: 20000,
      currency: "KRW",
      capturedAt: new Date().toISOString(),
    });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("공급가 급등"))).toBe(true);
  });

  it("detects AI cost spike", () => {
    const { repo } = services();
    repo.insertAiUsage({
      provider: "openai",
      model: "gpt",
      task: "mission",
      tokensIn: 10,
      tokensOut: 10,
      estimatedUsd: 6,
      missionId: null,
      department: null,
    });
    runWatchCycle(repo);
    expect(repo.listIncidents().some((i) => i.title.includes("AI 비용 급증"))).toBe(true);
  });
});

describe("Global Safety Lock", () => {
  it("enables lock on CRITICAL business-logic incident and blocks writes while allowing reads", () => {
    const { repo } = services();
    repo.saveProduct(
      product({
        id: "danger",
        status: "LIVE",
        risk: { decision: "BLOCK" },
      }),
    );
    const snap = runWatchCycle(repo);
    expect(snap.safetyLock).toBe(true);
    expect(repo.listIncidents().some((i) => i.severity === "CRITICAL")).toBe(true);
    const locked = { ...repo.getSafetySettings(), operatingMode: "LIVE_TRADE" as const, globalSafetyLock: true };
    const ctx = {
      amountKRW: 1000,
      dailySpentKRW: 0,
      monthlySpentKRW: 0,
      netMarginRate: 0.3,
      confidence: 0.9,
      supplierPriceIncreaseRate: 0,
      humanApproved: true,
      riskDecision: "PASS" as const,
    };
    expect(evaluateSafetyGate(locked, { ...ctx, action: "SUPPLIER_ORDER" }).allowed).toBe(false);
    expect(evaluateSafetyGate(locked, { ...ctx, action: "SUPPLIER_PAYMENT" }).allowed).toBe(false);
    expect(evaluateSafetyGate(locked, { ...ctx, action: "MARKETPLACE_LISTING" }).allowed).toBe(false);
    expect(evaluateSafetyGate(locked, { ...ctx, action: "PAUSE_PRODUCT" }).allowed).toBe(true);
  });
});

describe("Recovery / circuit breaker / mission resume", () => {
  it("opens then half-opens a provider circuit", () => {
    const limiter = new RateLimitManager({ cj: { openAfterFailures: 5 } });
    for (let i = 0; i < 5; i += 1) limiter.recordFailure("cj");
    expect(limiter.snapshot("cj").circuit).toBe("OPEN");
    limiter.forceHalfOpen("cj");
    expect(limiter.snapshot("cj").circuit).toBe("HALF_OPEN");
    limiter.recordSuccess("cj");
    expect(limiter.snapshot("cj").circuit).toBe("CLOSED");
  });

  it("allows only safe recovery actions", () => {
    expect(safeRecoveryAction("job_retry").allowed).toBe(true);
    expect(safeRecoveryAction("token_refresh").allowed).toBe(true);
    expect(safeRecoveryAction("patch_risk_gate").allowed).toBe(false);
    expect(safeRecoveryAction("auto_deploy").allowed).toBe(false);
  });

  it("persists and resumes a strategic mission", async () => {
    const svc = services();
    const started = await startOwnerMission(svc, "새로운 방향을 찾아봐");
    expect(started.level).toBe("STRATEGIC");
    expect(started.executionScope).toBe("RESEARCH_ONLY");
    expect(started.departments).toContain("strategy");
    expect(started.departments).not.toContain("watch");
    const n = resumeMissions(svc);
    expect(n).toBeGreaterThan(0);
    expect(svc.repo.getMission(started.id)?.status).toBe("RECOVERING");
    const done = await executeMissionPlan(svc, started.id);
    expect(done.status).toBe("COMPLETED");
    const tasks = svc.repo.listDepartmentTasks(started.id);
    expect(tasks.length).toBeGreaterThan(3);
    const report = done.resultJson as {
      proposals: Array<{ title: string; confidence: number }>;
      audit: { decision: string };
    };
    expect(report.proposals.length).toBeGreaterThan(0);
    expect(report.proposals.length).toBeLessThanOrEqual(3);
    expect(report.audit.decision).toBeTruthy();
    expect(svc.repo.listMissions({ resumable: true })).toHaveLength(0);
  });

  it("exposes HQ and System Watch APIs without executing LIVE money actions", async () => {
    const svc = services();
    await startOwnerMission(svc, "현재 시스템에 문제 없는지 확인해");
    const app = createApp(svc);
    const dash = await app.request("/api/dashboard");
    expect(dash.status).toBe(200);
    const body = (await dash.json()) as { watch: { overall: string }; hq: { currentMission: unknown } };
    expect(body.watch.overall).toBeTruthy();
    const watch = await app.request("/api/watch");
    expect(watch.status).toBe(200);
    const missions = await app.request("/api/missions");
    expect(missions.status).toBe(200);
    expect(svc.repo.listOrders()).toHaveLength(0);
  });
});
