import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppServices } from "../app-context.ts";
import { approveProductSchema, commandSchema, safetySettingsSchema } from "../shared/schemas.ts";
import { routeCommand } from "../engines/command/command-router.ts";
import { classifyOwnerCommand } from "../organization/classify.ts";
import { startOwnerMission } from "../organization/orchestrator.ts";
import { runWatchCycle } from "../watch/cycle.ts";
import { DEPARTMENT_LABEL } from "../organization/types.ts";
import { enqueue } from "../jobs/queue.ts";
import { evaluateSafetyGate } from "../engines/safety/safety-gate.ts";
import { BLOCKED_BY_LIVE_OBSERVE, detectLiveObserveWrite, liveObserveWriteBlock } from "../engines/safety/live-observe.ts";
import { generateContent } from "../engines/content/content-engine.ts";
import { prepareAndList } from "../engines/listing/listing-engine.ts";
import { draftCsReply, classifyCs } from "../engines/cs/cs-engine.ts";
import { settle } from "../engines/settlement/settlement-engine.ts";
import type { ProfitAnalysis, ProductStatus } from "../shared/types.ts";
import { nowIso } from "../shared/ids.ts";
import { maskSecret } from "../env.ts";
import { env } from "../env.ts";
import type { CjConnectionReport } from "../adapters/suppliers/cjdropshipping.ts";
import {
  connectionTestErrorCode,
  credentialConfiguredLabel,
  redactCredentialText,
  supplierConnectionLabel,
} from "../adapters/suppliers/cj-errors.ts";

export function createApp(services: AppServices) {
  const app = new Hono();
  app.use("*", cors());

  app.get("/api/health", (c) => c.json({ ok: true, name: "AIZIO COMMERCE", time: nowIso() }));

  app.get("/api/dashboard", (c) => {
    const analyzedToday = services.repo.countProducts("updated_at >= date('now')");
    const candidates = services.repo.countProducts("status IN ('DISCOVERED','ANALYZING','REVIEW_REQUIRED','TEST_SELL')");
    const recommended = services.repo.countProducts("status IN ('TEST_SELL','APPROVED','LISTING_READY')");
    const live = services.repo.countProducts("status = 'LIVE'");
    const review = services.repo.countProducts("status IN ('REVIEW_REQUIRED','BLOCKED')");
    const ordersToday = services.repo.countOrdersToday();
    const profit = services.repo.profitTotals();
    const integrations = services.repo.listIntegrations();
    const pending = integrations.filter((i) =>
      ["PENDING_SETUP", "NOT_CONFIGURED", "NOT_CONNECTED"].includes(i.status),
    );
    const cj = integrations.find((i) => i.id === "cjdropshipping");
    const settings = services.repo.getSafetySettings();
    const lastRun = services.repo.latestScoutRun();
    const scoutCounts = services.repo.scoutCountsFromDb();
    const watch = services.repo.latestWatchSnapshot() ?? runWatchCycle(services.repo);
    const currentMission = services.repo.listMissions({ limit: 1 })[0] ?? null;
    const deptHealth = Object.fromEntries(
      (currentMission?.departments ?? []).map((d) => {
        const tasks = currentMission ? services.repo.listDepartmentTasks(currentMission.id) : [];
        const t = tasks.find((x) => x.department === d);
        return [d, t?.status === "SUCCESS" ? "READY" : t?.status === "RUNNING" ? "BUSY" : t?.status === "FAILED" ? "DEGRADED" : "READY"];
      }),
    );
    return c.json({
      analyzedToday,
      candidates,
      recommended,
      live,
      ordersToday,
      autoProcessed: 0,
      reviewNeeded: review,
      expectedNetProfit: profit.expectedNetProfit,
      actualNetProfit: profit.actualNetProfit,
      pendingSetupCount: pending.length,
      operatingMode: settings.operatingMode,
      cjStatus: cj?.status ?? "PENDING_SETUP",
      supplier: {
        name: "CJdropshipping",
        status: cj?.status ?? "PENDING_SETUP",
        connection: supplierConnectionLabel(cj?.status ?? "PENDING_SETUP"),
        mode: (cj?.status ?? "PENDING_SETUP") === "READY" ? "READ ONLY" : "NOT CONNECTED",
      },
      cjDegraded: (watch.findings ?? []).some((f) => f.includes("CJ API DEGRADED")) || cj?.status === "RATE_LIMITED",
      scout: {
        cjReady: cj?.status === "READY",
        lastRun,
        counts: scoutCounts,
      },
      note: pending.length
        ? "외부 API가 연결되지 않아 실시간 판매 수치는 0일 수 있습니다. 가상 매출은 표시하지 않습니다."
        : null,
      watch,
      safetyLock: settings.globalSafetyLock,
      hq: {
        currentMission: currentMission
          ? {
              id: currentMission.id,
              command: currentMission.ownerCommand,
              status: currentMission.status,
              progress: currentMission.progress,
              departments: currentMission.departments.map((d) => ({
                id: d,
                label: DEPARTMENT_LABEL[d],
                health: deptHealth[d] ?? "READY",
              })),
            }
          : null,
      },
    });
  });

  app.get("/api/products", (c) => {
    const status = c.req.query("status");
    const minMargin = c.req.query("minMargin");
    let products = services.repo.listProducts({ status: status || undefined, limit: 100 });
    if (minMargin) {
      const min = Number(minMargin);
      products = products.filter((p) => {
        const profit = p.profit as ProfitAnalysis | null;
        return profit !== null && profit.netMarginRate >= min;
      });
    }
    return c.json({ products, count: products.length });
  });

  app.get("/api/products/:id", (c) => {
    const product = services.repo.getProduct(c.req.param("id"));
    if (!product) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({ product });
  });

  app.get("/api/products/:id/history", (c) => {
    const product = services.repo.getProduct(c.req.param("id"));
    if (!product) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({
      price: services.repo.listPriceHistory(product.id),
      inventory: services.repo.listInventoryHistory(product.id),
      shipping: services.repo.listShippingQuoteHistory(product.id),
    });
  });

  app.post("/api/products/scout", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const keyword = typeof body.keyword === "string" ? body.keyword : undefined;
    hydrateCjCredentials(services);
    const gate = await scoutGate(services);
    if (!gate.ok) return c.json(gate.body, gate.status);
    const jobId = enqueue(services.repo, "SCOUT_PRODUCTS", { keyword });
    services.repo.insertAudit({
      actor: "USER",
      action: "SCOUT_ENQUEUED",
      entityType: "job",
      entityId: jobId,
      summary: `실제 상품 찾기 작업이 대기열에 들어갔습니다.${keyword ? ` 키워드: ${keyword}` : ""}`,
    });
    return c.json({ jobId, status: "QUEUED" });
  });

  app.post("/api/products/:id/approve", async (c) => {
    const parsed = approveProductSchema.safeParse({
      ...(await c.req.json().catch(() => ({}))),
      productId: c.req.param("id"),
    });
    if (!parsed.success) return c.json({ error: "INVALID", details: parsed.error.flatten() }, 400);
    const product = services.repo.getProduct(parsed.data.productId);
    if (!product) return c.json({ error: "NOT_FOUND" }, 404);
    const risk = product.risk as { decision?: string } | null;
    if (risk?.decision === "BLOCK") {
      return c.json({ error: "RISK_BLOCK", message: "Risk Engine BLOCK은 승인할 수 없습니다." }, 409);
    }
    const settings = services.repo.getSafetySettings();
    const profit = product.profit as ProfitAnalysis | null;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const gate = evaluateSafetyGate(settings, {
      action: "MARKETPLACE_LISTING",
      amountKRW: parsed.data.sellingPrice ?? product.recommendedPriceKrw ?? 0,
      dailySpentKRW: services.repo.spendBetween(startOfDay.toISOString(), nowIso()),
      monthlySpentKRW: services.repo.spendBetween(startOfMonth.toISOString(), nowIso()),
      netMarginRate: profit?.netMarginRate ?? null,
      confidence: profit?.confidence ?? product.confidence,
      supplierPriceIncreaseRate: 0,
      category: product.category,
      supplierId: product.supplier,
      riskDecision: (risk?.decision as "PASS" | "REVIEW_REQUIRED" | "BLOCK" | undefined) ?? "PASS",
      humanApproved: true,
    });
    if (!gate.allowed) {
      services.repo.insertAudit({
        actor: "SAFETY_GATE",
        action: "APPROVAL_BLOCKED",
        entityType: "product",
        entityId: product.id,
        summary: `판매 승인 차단: ${gate.reasons.join(" / ")}`,
        detail: gate,
      });
      return c.json({ error: gate.decision, code: gate.code ?? BLOCKED_BY_LIVE_OBSERVE, reasons: gate.reasons }, 409);
    }

    const content = await generateContent(services.providers, { title: product.title });
    const nextStatus: ProductStatus = "APPROVED";
    services.repo.saveProduct({
      ...product,
      status: nextStatus,
      content,
      recommendedPriceKrw: parsed.data.sellingPrice ?? product.recommendedPriceKrw,
      updatedAt: nowIso(),
    });
    services.repo.insertAudit({
      actor: "USER",
      action: "PRODUCT_APPROVED",
      entityType: "product",
      entityId: product.id,
      summary: `상품 ${product.title} 판매 승인`,
    });

    let listing = null;
    if (parsed.data.autoList && parsed.data.marketplace) {
      const mp = parsed.data.marketplace === "naver" ? services.naver : services.coupang;
      listing = await prepareAndList({
        product: { ...product, status: nextStatus, content },
        marketplace: mp,
        supplier: services.cj,
        repo: services.repo,
        settings,
        humanApproved: true,
        dailySpent: services.repo.spendBetween(startOfDay.toISOString(), nowIso()),
        monthlySpent: services.repo.spendBetween(startOfMonth.toISOString(), nowIso()),
      });
    }
    return c.json({ status: nextStatus, content, listing });
  });

  app.post("/api/products/:id/pause", (c) => {
    const product = services.repo.getProduct(c.req.param("id"));
    if (!product) return c.json({ error: "NOT_FOUND" }, 404);
    const settings = services.repo.getSafetySettings();
    const gate = evaluateSafetyGate(settings, {
      action: "PAUSE_PRODUCT",
      amountKRW: 0,
      dailySpentKRW: 0,
      monthlySpentKRW: 0,
      netMarginRate: null,
      confidence: 1,
      supplierPriceIncreaseRate: null,
      humanApproved: true,
    });
    if (!gate.allowed) return c.json({ error: gate.decision, reasons: gate.reasons }, 409);
    services.repo.saveProduct({ ...product, status: "PAUSED", updatedAt: nowIso() });
    services.repo.insertAudit({
      actor: "USER",
      action: "PRODUCT_PAUSED",
      entityType: "product",
      entityId: product.id,
      summary: `상품 ${product.title} 일시중지`,
    });
    return c.json({ status: "PAUSED" });
  });

  app.get("/api/orders", (c) => c.json({ orders: services.repo.listOrders() }));

  app.get("/api/audit", (c) => c.json({ entries: services.repo.listAudit(200) }));

  app.get("/api/jobs", (c) => c.json({ jobs: services.repo.listJobs(80) }));

  app.get("/api/integrations", async (c) => {
    const snapshots = await services.providers.snapshots();
    await refreshIntegrationRows(services);
    const settings = services.repo.getSafetySettings();
    const watch = services.repo.latestWatchSnapshot() ?? runWatchCycle(services.repo);
    const snap = services.cj.tokenSnapshot();
    return c.json({
      integrations: services.repo.listIntegrations(),
      ai: snapshots,
      operatingMode: settings.operatingMode,
      safetyLock: settings.globalSafetyLock,
      watchOverall: watch.overall,
      scoutLimit: settings.scout.limit,
      secrets: {
        openai: maskSecret(env.openaiKey),
        gemini: maskSecret(env.geminiKey),
        claude: maskSecret(env.anthropicKey),
        cjApiKey: maskSecret(env.cjApiKey || env.cjApiPassword || services.repo.getEncryptedSecret("cj.apiKey")),
        cjAccessToken: maskSecret(env.cjAccessToken || services.repo.getEncryptedSecret("cj.accessToken")),
        cj: maskSecret(
          env.cjApiKey || env.cjApiPassword || env.cjAccessToken || services.repo.getEncryptedSecret("cj.apiKey"),
        ),
        coupang: maskSecret(env.coupangAccessKey),
        naver: maskSecret(env.naverClientId),
      },
      token: {
        status: snap.status,
        hasApiKey: snap.hasApiKey,
        hasAccessToken: snap.hasAccessToken,
        hasRefreshToken: snap.hasRefreshToken,
        expiresAt: snap.expiresAt,
        apiKey: credentialConfiguredLabel(snap.hasApiKey),
        accessToken: credentialConfiguredLabel(snap.hasAccessToken),
        maskedApiKey: snap.maskedApiKey,
        maskedAccessToken: snap.maskedAccessToken,
        legacyWarning: snap.legacyWarning,
      },
      legacyWarning: snap.legacyWarning,
    });
  });

  app.post("/api/integrations/:id/test", async (c) => {
    const id = c.req.param("id");
    if (id === "cjdropshipping") {
      hydrateCjCredentials(services);
      const report = await services.cj.runConnectionTest({ pauseMs: process.env.VITEST ? 0 : 1100 });
      const display = report.status === "NOT_CONFIGURED" ? "PENDING_SETUP" : report.status;
      services.repo.upsertIntegration({
        id: "cjdropshipping",
        kind: "supplier",
        name: "CJdropshipping",
        status: display,
        lastSuccessAt: report.status === "READY" ? report.lastConnectedAt : null,
        lastError: report.error,
        capabilities: report.capabilities,
        docsUrl: "https://developers.cjdropshipping.cn/en/api/api2/api/auth.html",
      });
      return c.json(publicCjReport(services, report));
    }
    let result: { status: string; error: string | null } = { status: "UNAVAILABLE", error: "unknown integration" };
    if (id === "openai" || id === "gemini" || id === "claude") {
      const p = services.providers.get(id);
      result = p ? await p.testConnection() : result;
    }     else if (id === "coupang") result = await services.coupang.testConnection();
    else if (id === "naver") result = await services.naver.testConnection();
    await refreshIntegrationRows(services, id, result);
    return c.json(result);
  });

  app.post("/api/integrations/cjdropshipping/connect", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { apiKey?: unknown; accessToken?: unknown };
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    if (!apiKey && !accessToken) {
      return c.json(
        {
          connection: "FAILED",
          status: "NOT_CONFIGURED",
          error: "CREDENTIAL_REQUIRED",
          errorCode: "CREDENTIAL_REQUIRED",
          mode: "NOT CONNECTED",
          operatingMode: "LIVE_OBSERVE",
          credentials: { apiKey: "MISSING", accessToken: "MISSING" },
        },
        400,
      );
    }
    if (apiKey) services.repo.setEncryptedSecret("cj.apiKey", apiKey);
    if (accessToken) services.repo.setEncryptedSecret("cj.accessToken", accessToken);
    services.cj.configure({
      apiKey: apiKey || services.repo.getEncryptedSecret("cj.apiKey") || env.cjApiKey,
      accessToken: accessToken || services.repo.getEncryptedSecret("cj.accessToken") || env.cjAccessToken,
      refreshToken: services.repo.getEncryptedSecret("cj.refreshToken") || env.cjRefreshToken,
      accessExpiry: services.repo.getEncryptedSecret("cj.accessExpiry") ?? undefined,
      legacyPasswordAlias: env.cjApiPassword,
    });
    const snap = services.cj.tokenSnapshot();
    services.repo.insertAudit({
      actor: "USER",
      action: "CJ_CONNECT_ATTEMPT",
      entityType: "integration",
      entityId: "cjdropshipping",
      summary: `CJ 연결 시도 (API Key ${snap.maskedApiKey ?? "없음"} / Access Token ${snap.maskedAccessToken ?? "없음"})`,
    });
      const report = await services.cj.runConnectionTest({ pauseMs: process.env.VITEST ? 0 : 1100 });
    const issued = services.cj.persistableTokens();
    if (issued.accessToken) services.repo.setEncryptedSecret("cj.accessToken", issued.accessToken);
    if (issued.refreshToken) services.repo.setEncryptedSecret("cj.refreshToken", issued.refreshToken);
    if (issued.accessExpiry) services.repo.setEncryptedSecret("cj.accessExpiry", issued.accessExpiry);
    const display = report.status === "NOT_CONFIGURED" ? "PENDING_SETUP" : report.status;
    services.repo.upsertIntegration({
      id: "cjdropshipping",
      kind: "supplier",
      name: "CJdropshipping",
      status: display,
      lastSuccessAt: report.status === "READY" ? report.lastConnectedAt : null,
      lastError: report.error,
      capabilities: {
        ...report.capabilities,
        authentication: report.status === "READY" || report.status === "TOKEN_EXPIRING" ? "READY" : report.status,
        products: report.capabilities.productSearch,
        orders: "LOCKED",
        payments: "LOCKED",
        disputes: "LOCKED",
      },
      docsUrl: "https://developers.cjdropshipping.cn/en/api/api2/api/auth.html",
    });
    return c.json(publicCjConnectResponse(services, report, [apiKey, accessToken]));
  });

  app.get("/api/settings/safety", (c) => c.json(services.repo.getSafetySettings()));
  app.put("/api/settings/safety", async (c) => {
    const parsed = safetySettingsSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: "INVALID", details: parsed.error.flatten() }, 400);
    services.repo.saveSafetySettings(parsed.data);
    services.repo.insertAudit({
      actor: "USER",
      action: "SAFETY_SETTINGS_UPDATED",
      entityType: "settings",
      entityId: "safety",
      summary: "Safety Gate 한도가 변경되었습니다.",
      detail: parsed.data,
    });
    return c.json(parsed.data);
  });

  app.post("/api/command", async (c) => {
    const parsed = commandSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: "INVALID" }, 400);
    const classified = classifyOwnerCommand(parsed.data.text);
    const routed = routeCommand(parsed.data.text);
    const blockedWrite = detectLiveObserveWrite(parsed.data.text);
    if (blockedWrite) {
      const block = liveObserveWriteBlock(blockedWrite);
      services.repo.insertAudit({
        actor: "SAFETY_GATE",
        action: BLOCKED_BY_LIVE_OBSERVE,
        entityType: "command",
        entityId: blockedWrite,
        summary: block.error,
      });
      return c.json(
        {
          code: block.code,
          error: block.error,
          classified,
          routed,
          source: classified.level === "STRATEGIC" || classified.level === "URGENT" ? "COMMANDER" : "CODE_ROUTER",
        },
        409,
      );
    }
    const useCommander =
      classified.level === "STRATEGIC" ||
      classified.level === "URGENT" ||
      classified.intent === "org_watch" ||
      classified.intent === "org_returns";
    if (useCommander) {
      const mission = await startOwnerMission(services, parsed.data.text);
      return c.json({ classified, mission, routed, source: "COMMANDER" });
    }
    if (routed.mutating) {
      const settings = services.repo.getSafetySettings();
      const gate = evaluateSafetyGate(settings, {
        action: routed.intent === "pause_loss" ? "PAUSE_PRODUCT" : "SUPPLIER_ORDER",
        amountKRW: 0,
        dailySpentKRW: 0,
        monthlySpentKRW: 0,
        netMarginRate: null,
        confidence: 1,
        supplierPriceIncreaseRate: null,
        humanApproved: routed.intent !== "pause_loss",
      });
      if (routed.intent === "pause_loss" && !gate.allowed && gate.decision === "BLOCK") {
        return c.json({ routed, classified, error: gate.reasons }, 409);
      }
    }
    const result = await executeCommand(services, routed);
    return c.json({ routed, classified, result, source: "CODE_ROUTER" });
  });

  app.get("/api/missions", (c) => c.json({ missions: services.repo.listMissions({ limit: 30 }) }));
  app.get("/api/missions/:id", (c) => {
    const mission = services.repo.getMission(c.req.param("id"));
    if (!mission) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({
      mission,
      tasks: services.repo.listDepartmentTasks(mission.id),
    });
  });
  app.get("/api/watch", (c) => {
    const report = services.repo.latestWatchSnapshot() ?? runWatchCycle(services.repo);
    return c.json({
      report,
      incidents: services.repo.listIncidents(),
      lock: services.repo.getGlobalSafetyLock(),
    });
  });
  app.post("/api/watch/tick", (c) => c.json(runWatchCycle(services.repo)));

  app.post("/api/vision", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
    if (!imageBase64) return c.json({ error: "imageBase64 required" }, 400);
    const analysis = await services.vision.analyzeImage(imageBase64, mimeType);
    if (analysis.status === "READY" && analysis.analysis?.supplierSearchKeywords[0]) {
      enqueue(services.repo, "SCOUT_PRODUCTS", {
        keyword: analysis.analysis.supplierSearchKeywords[0],
      });
    }
    return c.json(analysis);
  });

  app.get("/api/cs", (c) => c.json({ drafts: services.repo.listCsDrafts() }));
  app.post("/api/cs/draft", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const kind = typeof body.kind === "string" ? body.kind : "basic_product_info";
    const classified = classifyCs(kind);
    const draft = draftCsReply({
      kind,
      facts: {
        status: typeof body.status === "string" ? body.status : null,
        productName: typeof body.productName === "string" ? body.productName : null,
      },
    });
    const id = services.repo.insertCsDraft({
      orderId: typeof body.orderId === "string" ? body.orderId : null,
      marketplace: typeof body.marketplace === "string" ? body.marketplace : null,
      inquiryId: typeof body.inquiryId === "string" ? body.inquiryId : null,
      draft,
      status: "DRAFT",
      riskLevel: classified.mode,
    });
    return c.json({ id, draft, classified, mode: "AI Draft → 확인 → 전송" });
  });

  app.post("/api/settlements", async (c) => {
    const body = await c.req.json();
    const result = settle({
      expectedNetProfit: numOrNull(body.expectedNetProfit),
      actualProductCost: numOrNull(body.actualProductCost),
      actualShipping: numOrNull(body.actualShipping),
      actualFee: numOrNull(body.actualFee),
      actualAds: numOrNull(body.actualAds),
      actualRefund: numOrNull(body.actualRefund),
      actualReturnLoss: numOrNull(body.actualReturnLoss),
      actualSettlement: numOrNull(body.actualSettlement),
    });
    if (typeof body.orderId === "string") {
      services.repo.saveSettlement({ orderId: body.orderId, ...result });
    }
    return c.json(result);
  });

  return app;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function executeCommand(services: AppServices, routed: ReturnType<typeof routeCommand>) {
  switch (routed.intent) {
    case "scout": {
      hydrateCjCredentials(services);
      const gate = await scoutGate(services);
      if (!gate.ok) return { message: String((gate.body as { message?: string }).message ?? "공급처 연결 필요"), ...gate.body };
      const jobId = enqueue(services.repo, "SCOUT_PRODUCTS", {});
      return { message: "실제 상품 찾기 작업을 시작했습니다.", jobId };
    }
    case "recommendations":
      return { products: services.repo.listProducts({ status: "TEST_SELL" }) };
    case "filter_margin": {
      const min = Number(routed.slots.minMargin ?? 0.25);
      const products = services.repo.listProducts().filter((p) => {
        const profit = p.profit as ProfitAnalysis | null;
        return profit !== null && profit.netMarginRate >= min;
      });
      return { min, products };
    }
    case "high_return":
      return { message: "반품률 LIVE 데이터가 아직 없습니다.", freshness: "INSUFFICIENT_DATA", products: [] };
    case "pause_loss": {
      const products = services.repo.listProducts().filter((p) => {
        const profit = p.profit as ProfitAnalysis | null;
        return profit !== null && profit.expectedNetProfit < 0 && p.status === "LIVE";
      });
      for (const p of products) {
        services.repo.saveProduct({ ...p, status: "PAUSED", updatedAt: nowIso() });
        services.repo.insertAudit({
          actor: "COMMAND_ROUTER",
          action: "PRODUCT_PAUSED",
          entityType: "product",
          entityId: p.id,
          summary: `적자 상품 ${p.title} 일시중지`,
        });
      }
      return { paused: products.length };
    }
    case "orders_today":
      return { count: services.repo.countOrdersToday(), orders: services.repo.listOrders(20) };
    case "cost_up":
      return { message: "원가 상승 비교는 공급처 LIVE 재조회가 필요합니다.", products: [] };
    case "profit_month":
      return services.repo.profitTotals();
    default:
      return { message: "명령을 이해하지 못했습니다. 예: 오늘 팔만한 상품 찾아줘" };
  }
}

export async function refreshIntegrationRows(
  services: AppServices,
  onlyId?: string,
  test?: { status: string; error: string | null },
) {
  const rows = [
    {
      id: "openai",
      kind: "ai",
      name: "OpenAI",
      adapter: () => services.providers.get("openai")?.getStatus() ?? Promise.resolve("NOT_CONFIGURED" as const),
      capabilities: { chat: true, vision: false },
      docsUrl: "https://platform.openai.com/docs",
    },
    {
      id: "gemini",
      kind: "ai",
      name: "Gemini",
      adapter: () => services.providers.get("gemini")?.getStatus() ?? Promise.resolve("NOT_CONFIGURED" as const),
      capabilities: { chat: true, vision: true },
      docsUrl: "https://ai.google.dev/gemini-api/docs",
    },
    {
      id: "claude",
      kind: "ai",
      name: "Claude",
      adapter: () => services.providers.get("claude")?.getStatus() ?? Promise.resolve("NOT_CONFIGURED" as const),
      capabilities: { chat: true, vision: false },
      docsUrl: "https://docs.anthropic.com/en/api",
    },
    {
      id: "cjdropshipping",
      kind: "supplier",
      name: "CJdropshipping",
      adapter: () => services.cj.getStatus(),
      capabilities: services.cj.capabilities(),
      docsUrl: "https://developers.cjdropshipping.com/en/api/api2/api/product.html",
    },
    {
      id: "coupang",
      kind: "marketplace",
      name: "Coupang",
      adapter: () => services.coupang.getStatus(),
      capabilities: services.coupang.capabilities(),
      docsUrl: "https://developers.coupang.com/en/api",
    },
    {
      id: "naver",
      kind: "marketplace",
      name: "Naver SmartStore",
      adapter: () => services.naver.getStatus(),
      capabilities: services.naver.capabilities(),
      docsUrl: "https://apicenter.commerce.naver.com/docs/auth",
    },
  ];
  const existing = services.repo.listIntegrations();
  for (const row of rows) {
    if (onlyId && row.id !== onlyId) continue;
    const status = test && onlyId === row.id ? test.status : await row.adapter();
    const display =
      status === "NOT_CONFIGURED" && (row.kind === "supplier" || row.kind === "marketplace")
        ? "PENDING_SETUP"
        : status;
    const prev = existing.find((i) => i.id === row.id);
    const prevCaps = prev?.capabilities as Record<string, unknown> | undefined;
    const keepDetailed = prevCaps && typeof prevCaps.productSearch === "string";
    services.repo.upsertIntegration({
      id: row.id,
      kind: row.kind,
      name: row.name,
      status: display,
      lastSuccessAt: display === "READY" ? (prev?.lastSuccessAt ?? nowIso()) : null,
      lastError: test && onlyId === row.id ? test.error : display === "PENDING_SETUP" ? `${row.name} — PENDING_SETUP` : null,
      capabilities: keepDetailed ? prevCaps : row.capabilities,
      docsUrl: row.docsUrl,
    });
  }
}

function hydrateCjCredentials(services: AppServices): void {
  services.cj.configure({
    apiKey: services.repo.getEncryptedSecret("cj.apiKey") || env.cjApiKey,
    accessToken: services.repo.getEncryptedSecret("cj.accessToken") || env.cjAccessToken,
    refreshToken: services.repo.getEncryptedSecret("cj.refreshToken") || env.cjRefreshToken,
    accessExpiry: services.repo.getEncryptedSecret("cj.accessExpiry") ?? undefined,
    legacyPasswordAlias: env.cjApiPassword,
  });
}

async function scoutGate(
  services: AppServices,
): Promise<{ ok: true } | { ok: false; status: 409; body: Record<string, unknown> }> {
  const cjStatus = await services.cj.getStatus();
  if (cjStatus !== "READY") {
    return {
      ok: false,
      status: 409,
      body: { error: "SUPPLIER_NOT_READY", message: "공급처 연결 필요", status: cjStatus },
    };
  }
  const settings = services.repo.getSafetySettings();
  if (settings.operatingMode !== "LIVE_OBSERVE") {
    return {
      ok: false,
      status: 409,
      body: {
        error: "LIVE_OBSERVE_REQUIRED",
        message: "LIVE_OBSERVE에서만 상품 찾기를 실행합니다.",
        operatingMode: settings.operatingMode,
      },
    };
  }
  if (settings.globalSafetyLock) {
    return {
      ok: false,
      status: 409,
      body: { error: "SAFETY_LOCK", message: "Safety Lock이 켜져 있어 상품 찾기를 실행하지 않습니다." },
    };
  }
  const watch = services.repo.latestWatchSnapshot() ?? runWatchCycle(services.repo);
  if (watch.overall === "CRITICAL") {
    return {
      ok: false,
      status: 409,
      body: {
        error: "WATCH_CRITICAL",
        message: "System Watch가 CRITICAL이라 상품 찾기를 실행하지 않습니다.",
        watch: watch.overall,
      },
    };
  }
  return { ok: true };
}

function storedCjSecrets(services: AppServices, extra: string[] = []): string[] {
  return [
    ...extra,
    env.cjApiKey,
    env.cjApiPassword,
    env.cjAccessToken,
    env.cjRefreshToken,
    services.repo.getEncryptedSecret("cj.apiKey"),
    services.repo.getEncryptedSecret("cj.accessToken"),
    services.repo.getEncryptedSecret("cj.refreshToken"),
    services.cj.persistableTokens().accessToken,
    services.cj.persistableTokens().refreshToken,
  ].filter((v): v is string => Boolean(v && v.length >= 4));
}

function publicTokenView(services: AppServices) {
  const snap = services.cj.tokenSnapshot();
  return {
    status: snap.status,
    hasApiKey: snap.hasApiKey,
    hasAccessToken: snap.hasAccessToken,
    hasRefreshToken: snap.hasRefreshToken,
    expiresAt: snap.expiresAt,
    apiKey: credentialConfiguredLabel(snap.hasApiKey),
    accessToken: credentialConfiguredLabel(snap.hasAccessToken),
    maskedApiKey: snap.maskedApiKey,
    maskedAccessToken: snap.maskedAccessToken,
    legacyWarning: snap.legacyWarning,
  };
}

function stripSecrets<T>(payload: T, secrets: string[]): T {
  return JSON.parse(redactCredentialText(JSON.stringify(payload), secrets)) as T;
}

function publicCjReport(services: AppServices, report: CjConnectionReport, extraSecrets: string[] = []) {
  const errorCode = connectionTestErrorCode(report.probes, report.status);
  const connected = report.status === "READY" || report.status === "TOKEN_EXPIRING";
  return stripSecrets(
    {
      ...report,
      error: errorCode ?? report.error,
      errorCode,
      connection: connected ? "CONNECTED" : report.status === "NOT_CONFIGURED" ? "NOT CONNECTED" : "FAILED",
      mode: connected ? "READ ONLY" : "NOT CONNECTED",
      operatingMode: "LIVE_OBSERVE",
      credentials: {
        apiKey: credentialConfiguredLabel(services.cj.tokenSnapshot().hasApiKey),
        accessToken: credentialConfiguredLabel(services.cj.tokenSnapshot().hasAccessToken),
      },
      token: publicTokenView(services),
    },
    storedCjSecrets(services, extraSecrets),
  );
}

function publicCjConnectResponse(services: AppServices, report: CjConnectionReport, extraSecrets: string[] = []) {
  const errorCode = connectionTestErrorCode(report.probes, report.status);
  const connected = report.status === "READY" || report.status === "TOKEN_EXPIRING";
  const snap = services.cj.tokenSnapshot();
  return stripSecrets(
    {
      connection: connected ? "CONNECTED" : "FAILED",
      mode: connected ? "READ ONLY" : "NOT CONNECTED",
      operatingMode: "LIVE_OBSERVE",
      status: report.status,
      lastConnectedAt: report.lastConnectedAt,
      error: errorCode ?? report.error,
      errorCode,
      probes: report.probes,
      capabilities: {
        authentication: report.probes.find((p) => p.name === "authentication")?.status ?? report.status,
        products: report.capabilities.productSearch,
        productDetail: report.capabilities.productDetail,
        inventory: report.capabilities.inventory,
        shipping: report.capabilities.shipping,
        orders: "LOCKED",
        payments: "LOCKED",
        disputes: "LOCKED",
      },
      credentials: {
        apiKey: credentialConfiguredLabel(snap.hasApiKey),
        accessToken: credentialConfiguredLabel(snap.hasAccessToken),
      },
      token: publicTokenView(services),
    },
    storedCjSecrets(services, extraSecrets),
  );
}

