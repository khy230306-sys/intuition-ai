import { afterEach, describe, expect, it, vi } from "vitest";
import { CjDropshippingAdapter } from "../adapters/suppliers/cjdropshipping.ts";
import { CJTokenManager, isOfficialCjSuccess } from "../adapters/suppliers/cj-token-manager.ts";
import { maskSecret } from "../env.ts";
import { classifyFxDisplay, createCurrencyService } from "../adapters/fx/currency-service.ts";
import { analyzeProfit, classifyProfitStage } from "../engines/profit/profit-truth.ts";
import { assessRisk } from "../engines/risk/risk-engine.ts";
import { classifyInventory, scoreDataConfidence } from "../engines/confidence/data-confidence.ts";
import { evaluateSafetyGate } from "../engines/safety/safety-gate.ts";
import { BLOCKED_BY_LIVE_OBSERVE, detectLiveObserveWrite, liveObserveWriteBlock } from "../engines/safety/live-observe.ts";
import { scoutProducts, passesHardFilters } from "../engines/scout/product-scout.ts";
import { openSqlite, migrate } from "../db/client.ts";
import { Repository } from "../db/repository.ts";
import { DEFAULT_SAFETY_SETTINGS } from "../shared/types.ts";
import { createApp } from "../routes/app.ts";
import { ProviderRegistry } from "../engines/manager/provider-registry.ts";
import { ManagerAi } from "../engines/manager/manager-ai.ts";
import { VisionEngine } from "../engines/vision/vision-engine.ts";
import { OpenAiAdapter } from "../adapters/ai/openai.ts";
import { GeminiAdapter } from "../adapters/ai/gemini.ts";
import { ClaudeAdapter } from "../adapters/ai/claude.ts";
import { CoupangAdapter } from "../adapters/marketplaces/coupang.ts";
import { NaverCommerceAdapter } from "../adapters/marketplaces/naver.ts";
import { RateLimitManager } from "../data-hub/rate-limit.ts";
import { runWatchCycle } from "../watch/cycle.ts";
import { prepareAndList } from "../engines/listing/listing-engine.ts";
import type { SupplierAdapter, SupplierProduct, FreightOption } from "../adapters/suppliers/types.ts";
import { processOne, enqueue } from "../jobs/queue.ts";
import type { AppServices } from "../app-context.ts";
import type { ProductRecord } from "../db/repository.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function routeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)));
}

function repo() {
  const db = openSqlite(":memory:");
  migrate(db);
  const r = new Repository(db);
  r.saveSafetySettings({
    ...DEFAULT_SAFETY_SETTINGS,
    fx: { provider: "manual", manualUsdKrw: 1300 },
    scout: { ...DEFAULT_SAFETY_SETTINGS.scout, limit: 5, keyword: "storage organizer" },
  });
  return r;
}

function appServices(cj: CjDropshippingAdapter, r = repo()): AppServices {
  const providers = new ProviderRegistry([
    new OpenAiAdapter("", "x"),
    new GeminiAdapter("", "x"),
    new ClaudeAdapter("", "x"),
  ]);
  return {
    repo: r,
    providers,
    manager: new ManagerAi(providers),
    vision: new VisionEngine(providers),
    cj,
    coupang: new CoupangAdapter("", "", ""),
    naver: new NaverCommerceAdapter("", ""),
  };
}

class FakeSupplier implements SupplierAdapter {
  readonly id = "cjdropshipping";
  readonly label = "CJdropshipping";
  products: SupplierProduct[] = [];
  freight: FreightOption[] = [{ name: "CJ Packet Ordinary", priceUsd: 4.2, aging: "8-15", freshness: "LIVE" }];
  stockNum: number | null = 342;
  circuit: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  capabilities() {
    return {
      productSearch: true,
      categorySearch: true,
      productDetail: true,
      variantSku: true,
      supplyPrice: true,
      inventory: true,
      warehouse: true,
      shippingCost: true,
      deliveryEta: true,
      orderCreate: false,
      orderQuery: true,
      tracking: true,
      dispute: true,
    };
  }
  circuitState() {
    return this.circuit;
  }
  async getStatus() {
    return "READY" as const;
  }
  async testConnection() {
    return { status: "READY" as const, error: null };
  }
  async searchProducts() {
    return { status: "READY" as const, products: this.products, error: null };
  }
  async getCategories() {
    return { status: "READY" as const, categories: [], error: null };
  }
  async getProduct(pid: string) {
    const product = this.products.find((p) => p.supplierProductId === pid) ?? null;
    return { status: "READY" as const, product, error: product ? null : "missing SKU / empty product" };
  }
  async getVariants(pid: string) {
    const p = this.products.find((x) => x.supplierProductId === pid);
    return { status: "READY" as const, variants: p?.variantId ? [{ vid: p.variantId, variantSellPrice: p.priceUsd }] : [], error: null };
  }
  async getStock() {
    if (this.stockNum === null) return { status: "READY" as const, stock: [], error: null };
    return { status: "READY" as const, stock: [{ vid: "v1", totalInventoryNum: this.stockNum }], error: null };
  }
  async getWarehouses() {
    return { status: "READY" as const, warehouses: [], error: null };
  }
  async getFreight() {
    return { status: "READY" as const, options: this.freight, error: null };
  }
  async createOrder() {
    return { status: "UNAVAILABLE" as const, order: null, error: "LIVE_OBSERVE" };
  }
  async getOrder() {
    return { status: "READY" as const, order: null, error: null };
  }
  async getTracking() {
    return { status: "READY" as const, tracking: null, error: null };
  }
  async getDispute() {
    return { status: "READY" as const, dispute: null, error: null };
  }
}

function sample(overrides: Partial<SupplierProduct> = {}): SupplierProduct {
  return {
    supplierProductId: "PID-LIVE-1",
    title: "Storage Organizer Bin",
    imageUrl: null,
    category: "Home Storage",
    priceUsd: 8.4,
    sku: "SKU-1",
    variantId: "VID-1",
    warehouse: "CN",
    raw: { pid: "PID-LIVE-1", vid: "VID-1", productWeight: 320 },
    capturedAt: new Date().toISOString(),
    freshness: "LIVE",
    ...overrides,
  };
}

describe("Authentication / Token Manager", () => {
  it("credential missing is NOT_CONFIGURED", () => {
    const tm = new CJTokenManager();
    tm.configure({ apiKey: "", accessToken: "" });
    expect(tm.currentStatus()).toBe("NOT_CONFIGURED");
    expect(tm.snapshot().hasApiKey).toBe(false);
  });

  it("access token valid is READY and distinct from API Key", () => {
    const tm = new CJTokenManager();
    tm.configure({ apiKey: "key-aaaa-bbbb-cccc", accessToken: "tok-1111-2222-3333" });
    expect(tm.currentStatus()).toBe("READY");
    expect(tm.snapshot().maskedApiKey).not.toBe(tm.snapshot().maskedAccessToken);
    expect(tm.snapshot().maskedApiKey).not.toContain("key-aaaa");
    expect(JSON.stringify(tm.snapshot())).not.toContain("tok-1111-2222-3333");
  });

  it("token expired is TOKEN_EXPIRED", () => {
    const tm = new CJTokenManager();
    tm.configure({ accessToken: "old-token-value", accessExpiry: "2000-01-01T00:00:00Z" });
    expect(tm.currentStatus()).toBe("TOKEN_EXPIRED");
  });

  it("token expiring within 24h is TOKEN_EXPIRING but adapter getStatus is READY", async () => {
    const exp = new Date(Date.now() + 12 * 3600_000).toISOString();
    const cj = new CjDropshippingAdapter({ accessToken: "live-token-value", accessExpiry: exp });
    expect(cj.getCredentialStatus()).toBe("TOKEN_EXPIRING");
    expect(await cj.getStatus()).toBe("READY");
  });

  it("authentication failure is AUTH_FAILED", async () => {
    routeFetch(() => jsonRes(401, { result: false, message: "User not find" }));
    const cj = new CjDropshippingAdapter({ apiKey: "bad-key-value" });
    const auth = await cj.ensureToken();
    expect(auth.status).toBe("AUTH_FAILED");
    expect(JSON.stringify(auth)).not.toContain("bad-key-value");
  });

  it("secret masking uses abcd********wxyz form", () => {
    expect(maskSecret("abcdefghijklmnop")).toBe("abcd********mnop");
    expect(maskSecret("short")).toBe("••••");
  });

  it("legacy password warning does not treat API Key as Access Token", () => {
    const tm = new CJTokenManager();
    tm.configure({ legacyPasswordAlias: "legacy-password-value" });
    expect(tm.getLegacyWarning()).toMatch(/CJ_API_PASSWORD/);
    expect(tm.getApiKey()).toBe("legacy-password-value");
    expect(tm.getAccessToken()).toBeNull();
  });

  it("official success requires code 200", () => {
    expect(isOfficialCjSuccess({ code: 200, result: true })).toBe(true);
    expect(isOfficialCjSuccess({ code: 1600000, result: true })).toBe(false);
    expect(isOfficialCjSuccess({ result: false })).toBe(false);
  });
});

describe("CJ API payloads", () => {
  it("product success maps official fields", async () => {
    routeFetch(() =>
      jsonRes(200, {
        code: 200,
        result: true,
        data: { list: [{ pid: "P1", productNameEn: "Bin", sellPrice: 8.4, vid: "V1" }] },
      }),
    );
    const cj = new CjDropshippingAdapter({ accessToken: "t" });
    const search = await cj.searchProducts({ pageSize: 20 });
    expect(search.products[0]?.supplierProductId).toBe("P1");
    expect(search.products[0]?.priceUsd).toBe(8.4);
    expect(search.products[0]?.variantId).toBe("V1");
  });

  it("malformed product is skipped", async () => {
    routeFetch(() => jsonRes(200, { code: 200, result: true, data: { list: [{ pid: "", productNameEn: "" }] } }));
    const cj = new CjDropshippingAdapter({ accessToken: "t" });
    expect((await cj.searchProducts({})).products).toEqual([]);
  });

  it("missing price stays null", async () => {
    routeFetch(() => jsonRes(200, { code: 200, result: true, data: { list: [{ pid: "P1", productNameEn: "Bin" }] } }));
    const cj = new CjDropshippingAdapter({ accessToken: "t" });
    expect((await cj.searchProducts({})).products[0]?.priceUsd).toBeNull();
  });

  it("missing variant is not invented", async () => {
    routeFetch(() => jsonRes(200, { code: 200, result: true, data: { list: [{ pid: "P1", productNameEn: "Bin", sellPrice: 1 }] } }));
    const cj = new CjDropshippingAdapter({ accessToken: "t" });
    expect((await cj.searchProducts({})).products[0]?.variantId).toBeNull();
  });

  it("inventory success and sold out", async () => {
    routeFetch((url) => {
      if (url.includes("queryByVid")) return jsonRes(200, { code: 200, result: true, data: [{ totalInventoryNum: 0 }] });
      return jsonRes(200, { code: 200, result: true, data: [] });
    });
    const cj = new CjDropshippingAdapter({ accessToken: "t" });
    const stock = await cj.getStock({ vid: "V1" });
    expect(stock.status).toBe("READY");
  });

  it("Korea shipping available / unavailable / missing quote", async () => {
    const cj = new CjDropshippingAdapter({ accessToken: "t" });
    routeFetch(() => jsonRes(200, { code: 200, result: true, data: [{ logisticName: "CJ Packet", logisticPrice: 4.2, logisticAging: "8-15" }] }));
    const ok = await cj.quoteKoreaShipping("V1");
    expect(ok.availability).toBe("AVAILABLE");
    expect(ok.option?.priceUsd).toBe(4.2);
    routeFetch(() => jsonRes(200, { code: 200, result: true, data: [] }));
    expect((await cj.quoteKoreaShipping("V1")).availability).toBe("UNAVAILABLE");
    routeFetch(() => jsonRes(500, { result: false }));
    expect((await cj.quoteKoreaShipping("V1")).availability).toBe("UNKNOWN");
  });
});

describe("Currency / Profit / Confidence / Risk", () => {
  it("LIVE FX / MANUAL FX / missing / stale", async () => {
    const live = classifyFxDisplay({ status: "LIVE", capturedAt: new Date().toISOString() });
    expect(live).toBe("LIVE_FX");
    expect(classifyFxDisplay({ status: "MANUAL_RATE", capturedAt: new Date().toISOString() })).toBe("MANUAL_FX");
    expect(classifyFxDisplay({ status: "FX_RATE_NOT_CONFIGURED" })).toBe("FX_NOT_CONFIGURED");
    expect(classifyFxDisplay({ status: "LIVE", capturedAt: new Date(Date.now() - 48 * 3600_000).toISOString() })).toBe("STALE_FX");
    const none = await createCurrencyService({ provider: "none", manualUsdKrw: null }).resolveUsdKrw();
    expect(none.ok).toBe(false);
  });

  it("LIVE supplier+shipping with unknown marketplace price is TARGET_MARGIN not ACTUAL_PROFIT", () => {
    const profit = analyzeProfit({
      sellingPrice: 29900,
      productCost: 10920,
      internationalShipping: 5460,
      domesticShipping: null,
      customsDuty: null,
      vat: null,
      marketplaceFee: null,
      paymentFee: null,
      expectedAdCost: null,
      promotionCost: null,
      expectedReturnLoss: null,
      fxBuffer: null,
      otherCost: null,
      sellingPriceKind: "TARGET_MARGIN_PRICE",
      fxStatus: "MANUAL_RATE",
      inputFreshness: {
        productCost: "LIVE",
        internationalShipping: "LIVE",
        sellingPrice: "ESTIMATE",
      },
    });
    expect(profit.stage).not.toBe("ACTUAL_PROFIT");
    expect(profit.sellingPriceKind).toBe("TARGET_MARGIN_PRICE");
    expect(classifyProfitStage({
      supplierLive: true,
      shippingLive: true,
      fxStatus: "MANUAL_RATE",
      marketplaceFeeKnown: false,
      sellingPriceKind: "TARGET_MARGIN_PRICE",
      adsKnown: false,
      returnKnown: false,
    })).toBe("ESTIMATED_PROFIT");
  });

  it("deterministic confidence does not invent 91%", () => {
    const score = scoreDataConfidence({
      hasSupplierPrice: true,
      inventory: "IN_STOCK",
      hasShippingCost: true,
      shippingAvailability: "AVAILABLE",
      fresh: true,
      riskAssessed: true,
      hasFx: true,
      hasMarketPrice: false,
    });
    expect(score).toBe(0.96);
    expect(classifyInventory(null)).toBe("UNKNOWN");
    expect(classifyInventory(0)).toBe("OUT_OF_STOCK");
    expect(classifyInventory(342)).toBe("IN_STOCK");
  });

  it("risk: safe / regulated / unknown cert / brand", () => {
    expect(assessRisk({ title: "Storage organizer bin", category: "Home" }).decision).toBe("PASS");
    expect(assessRisk({ title: "Snack food gift box" }).decision).toBe("BLOCK");
    expect(assessRisk({ title: "USB lamp unknown certification" }).decision).toBe("REVIEW_REQUIRED");
    expect(assessRisk({ title: "Storage bin", brandVisible: true, possibleBrand: "Acme" }).decision).toBe("REVIEW_REQUIRED");
    expect(assessRisk({ title: "Cosmetic serum cream" }).decision).toBe("REVIEW_REQUIRED");
  });
});

describe("LIVE_OBSERVE safety", () => {
  it("create order / payment / listing / refund blocked with BLOCKED_BY_LIVE_OBSERVE", async () => {
    const gateOrder = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, {
      action: "SUPPLIER_ORDER",
      amountKRW: 1000,
      dailySpentKRW: 0,
      monthlySpentKRW: 0,
      netMarginRate: 0.4,
      confidence: 0.9,
      supplierPriceIncreaseRate: 0,
      humanApproved: true,
    });
    expect(gateOrder.code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    expect(evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, {
      action: "SUPPLIER_PAYMENT",
      amountKRW: 1000,
      dailySpentKRW: 0,
      monthlySpentKRW: 0,
      netMarginRate: 0.4,
      confidence: 0.9,
      supplierPriceIncreaseRate: 0,
      humanApproved: true,
    }).code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    expect(evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, {
      action: "MARKETPLACE_LISTING",
      amountKRW: 1000,
      dailySpentKRW: 0,
      monthlySpentKRW: 0,
      netMarginRate: 0.4,
      confidence: 0.9,
      supplierPriceIncreaseRate: 0,
      humanApproved: true,
    }).code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    expect(liveObserveWriteBlock("REFUND").code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    const cj = new CjDropshippingAdapter({ accessToken: "t", writeEnabled: true });
    expect((await cj.createOrder({})).error).toMatch(/BLOCKED_BY_LIVE_OBSERVE/);
  });

  it("OWNER command cannot bypass external writes", async () => {
    const svc = appServices(new CjDropshippingAdapter("", "", ""));
    const app = createApp(svc);
    for (const text of ["CJ에 발주해줘", "결제 실행해", "쿠팡 리스팅 등록해", "환불 처리해"]) {
      const res = await app.request("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    }
    expect(detectLiveObserveWrite("오늘 주문 보여줘")).toBeNull();
  });

  it("listing engine is blocked in LIVE_OBSERVE", async () => {
    const r = repo();
    const product = {
      id: "prd_x",
      supplier: "cjdropshipping",
      supplierProductId: "P1",
      supplierVariantId: "V1",
      title: "Bin",
      status: "APPROVED",
      category: "Home",
      imageUrl: null,
      supplierPriceKrw: 10000,
      supplierPriceUsd: 8,
      currency: "USD",
      shippingKrw: 5000,
      shippingUsd: 4,
      shippingAvailability: "AVAILABLE",
      shippingMethod: "CJ Packet",
      recommendedPriceKrw: 29900,
      targetMarginPriceKrw: 29900,
      marketObservedPriceKrw: null,
      sellingPriceKind: "TARGET_MARGIN_PRICE",
      profitStage: "ESTIMATED_PROFIT",
      stock: 10,
      warehouse: "CN",
      deliveryMin: 8,
      deliveryMax: 15,
      weight: 1,
      sourceUrl: null,
      capturedAt: new Date().toISOString(),
      scoutCandidate: true,
      profit: { expectedNetProfit: 1000, netMarginRate: 0.3, confidence: 0.5 },
      risk: { decision: "PASS" },
      decision: null,
      market: null,
      content: null,
      sourceFacts: {},
      confidence: 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ProductRecord;
    const listed = await prepareAndList({
      product,
      marketplace: new CoupangAdapter("ak", "sk", "vid"),
      supplier: null,
      repo: r,
      settings: r.getSafetySettings(),
      humanApproved: true,
      dailySpent: 0,
      monthlySpent: 0,
    });
    expect(listed.blocked).toBe(true);
    expect(listed.code).toBe(BLOCKED_BY_LIVE_OBSERVE);
  });
});

describe("Scout inventory / shipping / wizard / watch", () => {
  it("unknown inventory is not stored as 0", async () => {
    const r = repo();
    const supplier = new FakeSupplier();
    supplier.stockNum = null;
    supplier.products = [sample()];
    await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    const p = r.listProducts()[0];
    expect(p?.stock).toBeNull();
    expect(p?.sourceFacts.inventoryStatus).toBe("UNKNOWN");
    expect(p?.scoutCandidate).toBe(false);
  });

  it("Korea shipping unavailable sets KOREA_SHIPPING_UNAVAILABLE and is not recommended", async () => {
    const r = repo();
    const supplier = new FakeSupplier();
    supplier.freight = [];
    supplier.products = [sample()];
    await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    const p = r.listProducts()[0];
    expect(p?.status).toBe("KOREA_SHIPPING_UNAVAILABLE");
    expect(p?.scoutCandidate).toBe(false);
    expect(passesHardFilters({
      identifiable: true,
      stock: 10,
      supplierPrice: 8,
      shippingCost: null,
      shippingAvailability: "UNAVAILABLE",
      riskDecision: "PASS",
    }).ok).toBe(false);
  });

  it("connection wizard stores masked credentials only", async () => {
    routeFetch((url) => {
      if (url.includes("getAccessToken")) {
        return jsonRes(200, {
          code: 200,
          result: true,
          data: { accessToken: "issued-secret-token", refreshToken: "refresh-secret", accessTokenExpiryDate: "2099-01-01T00:00:00Z" },
        });
      }
      if (url.includes("listV2")) {
        return jsonRes(200, {
          code: 200,
          result: true,
          data: { list: [{ pid: "P1", productNameEn: "Bin", sellPrice: 8, vid: "V1" }] },
        });
      }
      if (url.includes("queryByVid")) return jsonRes(200, { code: 200, result: true, data: [{ totalInventoryNum: 3 }] });
      if (url.includes("freightCalculate")) {
        return jsonRes(200, { code: 200, result: true, data: [{ logisticName: "CJ Packet", logisticPrice: 4.2 }] });
      }
      return jsonRes(200, { code: 200, result: true, data: [] });
    });
    const r = repo();
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" }), r));
    const missing = await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { error: string }).error).toBe("CREDENTIAL_REQUIRED");
    const res = await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "official-api-key-value-xxxx" }),
    });
    const body = (await res.json()) as {
      connection: string;
      mode: string;
      capabilities: Record<string, string>;
      token: { maskedApiKey: string; maskedAccessToken: string };
    };
    expect(body.connection).toBe("CONNECTED");
    expect(body.mode).toBe("READ ONLY");
    expect(body.capabilities.orders).toBe("LOCKED");
    expect(body.capabilities.payments).toBe("LOCKED");
    expect(JSON.stringify(body)).not.toContain("official-api-key-value-xxxx");
    expect(JSON.stringify(body)).not.toContain("issued-secret-token");
    const audit = JSON.stringify(r.listAudit());
    expect(audit).not.toContain("official-api-key-value-xxxx");
    expect(audit).not.toContain("issued-secret-token");
  });

  it("Watch records CJ 401 / 429 / timeout / circuit / stale snapshot", () => {
    const r = repo();
    r.recordApiEvent({ provider: "cjdropshipping", ok: false, status: 401, error: "401", circuit: "CLOSED" });
    let report = runWatchCycle(r);
    expect(report.findings.some((f) => f.includes("CJ 401"))).toBe(true);
    for (let i = 0; i < 5; i += 1) {
      r.recordApiEvent({ provider: "cjdropshipping", ok: false, status: 429, error: "429", circuit: i === 4 ? "OPEN" : "CLOSED" });
    }
    report = runWatchCycle(r);
    expect(report.findings).toContain("CJ API DEGRADED");
    expect(report.overall).not.toBe("HEALTHY");
    r.recordApiEvent({ provider: "cjdropshipping", ok: false, status: 0, error: "timeout", circuit: "OPEN" });
    report = runWatchCycle(r);
    expect(report.findings.some((f) => f.includes("timeout"))).toBe(true);
    const capturedAt = new Date(Date.now() - 3 * 86400_000).toISOString();
    r.saveProduct({
      id: "prd_stale",
      supplier: "cjdropshipping",
      supplierProductId: "P-STALE",
      supplierVariantId: "V1",
      title: "Old bin",
      status: "DISCOVERED",
      category: "Home",
      imageUrl: null,
      supplierPriceKrw: 1000,
      supplierPriceUsd: 1,
      currency: "USD",
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
      weight: 1,
      sourceUrl: null,
      capturedAt,
      scoutCandidate: false,
      profit: null,
      risk: null,
      decision: null,
      market: null,
      content: null,
      sourceFacts: {},
      confidence: 0.5,
      createdAt: capturedAt,
      updatedAt: capturedAt,
    });
    report = runWatchCycle(r);
    expect(report.findings.some((f) => f.includes("stale snapshot"))).toBe(true);
  });

  it("circuit OPEN pauses SCOUT_PRODUCTS and keeps snapshots", async () => {
    const r = repo();
    const limiter = new RateLimitManager({
      cjdropshipping: { requestsPerSec: 100, requestsPerMin: 1000, openAfterFailures: 1 },
    });
    routeFetch(() => jsonRes(429, { message: "too many" }));
    const cj = new CjDropshippingAdapter({ accessToken: "t", limiter });
    await cj.searchProducts({ keyword: "bin" });
    expect(cj.circuitState()).toBe("OPEN");
    const svc = appServices(cj, r);
    enqueue(svc.repo, "SCOUT_PRODUCTS", {});
    await processOne(svc);
    const job = r.listJobs()[0];
    expect(job?.status).toBe("BLOCKED");
    expect(job?.error).toMatch(/CJ API DEGRADED/);
  });

  it("scout uses deterministic confidence and TARGET_MARGIN_PRICE", async () => {
    const r = repo();
    const supplier = new FakeSupplier();
    supplier.products = [sample({ priceUsd: 8.4 })];
    const result = await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    expect(result.saved).toBe(1);
    const p = r.listProducts()[0];
    expect(p?.sellingPriceKind).toBe("TARGET_MARGIN_PRICE");
    expect(p?.marketObservedPriceKrw).toBeNull();
    expect(p?.profitStage).not.toBe("ACTUAL_PROFIT");
    expect(p?.confidence).toBe(scoreDataConfidence({
      hasSupplierPrice: true,
      inventory: "IN_STOCK",
      hasShippingCost: true,
      shippingAvailability: "AVAILABLE",
      fresh: true,
      riskAssessed: true,
      hasFx: true,
      hasMarketPrice: false,
    }));
    expect(p?.sourceFacts.evidence).toBeTruthy();
  });
});
