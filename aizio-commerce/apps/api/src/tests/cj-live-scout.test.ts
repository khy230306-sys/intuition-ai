import { afterEach, describe, expect, it, vi } from "vitest";
import { CjDropshippingAdapter, parseOfficialAgingMax } from "../adapters/suppliers/cjdropshipping.ts";
import { createCurrencyService } from "../adapters/fx/currency-service.ts";
import { assessRisk } from "../engines/risk/risk-engine.ts";
import { scoutProducts, passesHardFilters, stableProductId } from "../engines/scout/product-scout.ts";
import { openSqlite, migrate } from "../db/client.ts";
import { Repository } from "../db/repository.ts";
import { DEFAULT_SAFETY_SETTINGS } from "../shared/types.ts";
import type { SupplierAdapter, SupplierProduct, FreightOption } from "../adapters/suppliers/types.ts";
import { createApp } from "../routes/app.ts";
import { ProviderRegistry } from "../engines/manager/provider-registry.ts";
import { ManagerAi } from "../engines/manager/manager-ai.ts";
import { VisionEngine } from "../engines/vision/vision-engine.ts";
import { OpenAiAdapter } from "../adapters/ai/openai.ts";
import { GeminiAdapter } from "../adapters/ai/gemini.ts";
import { ClaudeAdapter } from "../adapters/ai/claude.ts";
import { CoupangAdapter } from "../adapters/marketplaces/coupang.ts";
import { NaverCommerceAdapter } from "../adapters/marketplaces/naver.ts";

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

class FakeSupplier implements SupplierAdapter {
  readonly id = "cjdropshipping";
  readonly label = "CJdropshipping";
  products: SupplierProduct[] = [];
  freight: FreightOption[] = [{ name: "CJ Packet Ordinary", priceUsd: 4.71, aging: "8-15", freshness: "LIVE" }];
  stockNum = 42;

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
    return { status: "READY" as const, variants: p ? [{ vid: p.variantId, variantSellPrice: p.priceUsd }] : [], error: null };
  }
  async getStock() {
    return { status: "READY" as const, stock: [{ vid: "v1", totalInventoryNum: this.stockNum }], error: null };
  }
  async getWarehouses() {
    return { status: "READY" as const, warehouses: [], error: null };
  }
  async getFreight() {
    return { status: "READY" as const, options: this.freight, error: null };
  }
  async quoteKoreaShipping() {
    const priced = this.freight.filter((o) => o.priceUsd !== null);
    return {
      availability: priced.length ? ("AVAILABLE" as const) : ("UNAVAILABLE" as const),
      option: priced[0] ?? null,
      capturedAt: new Date().toISOString(),
      source: "/logistic/freightCalculate",
    };
  }
  async createOrder() {
    return { status: "UNAVAILABLE" as const, order: null, error: "LIVE_OBSERVE: CJ 주문 생성은 서버에서 차단됩니다." };
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

function sampleProduct(overrides: Partial<SupplierProduct> = {}): SupplierProduct {
  return {
    supplierProductId: "PID-STORAGE-1",
    title: "Storage Organizer Bin",
    imageUrl: null,
    category: "Home Storage",
    priceUsd: 8.2,
    sku: "SKU-1",
    variantId: "VID-1",
    warehouse: "CN",
    raw: { pid: "PID-STORAGE-1", vid: "VID-1", productWeight: 320 },
    capturedAt: new Date().toISOString(),
    freshness: "LIVE",
    ...overrides,
  };
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

describe("CJ credential flow", () => {
  it("CJ credential missing stays NOT_CONFIGURED / PENDING_SETUP", async () => {
    const cj = new CjDropshippingAdapter({ apiKey: "", accessToken: "" });
    expect(cj.getCredentialStatus()).toBe("NOT_CONFIGURED");
    expect(await cj.getStatus()).toBe("PENDING_SETUP");
    const report = await cj.runConnectionTest();
    expect(report.status).toBe("NOT_CONFIGURED");
    expect(report.capabilities.productSearch).toBe("NOT_CONFIGURED");
  });

  it("CJ auth success mock uses official apiKey body", async () => {
    routeFetch((url, init) => {
      if (url.includes("getAccessToken")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        expect(body.apiKey).toBe("CJUserNum@api@testkey");
        expect(body.email).toBeUndefined();
        expect(body.password).toBeUndefined();
        return jsonRes(200, {
          code: 200,
          result: true,
          data: { accessToken: "issued-token-value", refreshToken: "refresh-value", accessTokenExpiryDate: "2099-01-01T00:00:00Z" },
        });
      }
      return jsonRes(404, { result: false });
    });
    const cj = new CjDropshippingAdapter({ apiKey: "CJUserNum@api@testkey" });
    const auth = await cj.ensureToken();
    expect(auth.status).toBe("READY");
    expect(auth.token).toBe("issued-token-value");
    expect(JSON.stringify(auth.error)).not.toContain("issued-token-value");
  });

  it("CJ auth failure maps to AUTH_FAILED", async () => {
    routeFetch(() => jsonRes(401, { result: false, message: "User not find" }));
    const cj = new CjDropshippingAdapter({ apiKey: "bad" });
    const auth = await cj.ensureToken();
    expect(auth.status).toBe("AUTH_FAILED");
    expect(auth.token).toBeNull();
  });

  it("CJ token expiry on 401 after existing token", async () => {
    routeFetch(() => jsonRes(401, { result: false, message: "Authentication failed" }));
    const cj = new CjDropshippingAdapter({ accessToken: "expired-token" });
    const product = await cj.getProduct("PID");
    expect(product.status).toBe("TOKEN_EXPIRED");
    expect(cj.getCredentialStatus()).toBe("TOKEN_EXPIRED");
  });

  it("CJ 401 on product call is TOKEN_EXPIRED", async () => {
    routeFetch(() => jsonRes(401, { message: "no" }));
    const cj = new CjDropshippingAdapter("", "", "token");
    const search = await cj.searchProducts({ keyword: "bin" });
    expect(search.status).toBe("TOKEN_EXPIRED");
    expect(search.products).toEqual([]);
  });

  it("CJ 429 is RATE_LIMITED", async () => {
    routeFetch(() => jsonRes(429, { message: "too many" }));
    const cj = new CjDropshippingAdapter("", "", "token");
    const search = await cj.searchProducts({ keyword: "bin" });
    expect(search.status).toBe("RATE_LIMITED");
  });

  it("CJ timeout is UNAVAILABLE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const cj = new CjDropshippingAdapter("", "", "token");
    const search = await cj.searchProducts({ keyword: "bin" });
    expect(search.status).toBe("UNAVAILABLE");
  });
});

describe("CJ product payloads", () => {
  it("skips malformed product without inventing a title", async () => {
    routeFetch(() =>
      jsonRes(200, { code: 200, result: true, data: { list: [{ pid: "", productNameEn: "" }] } }),
    );
    const cj = new CjDropshippingAdapter("", "", "token");
    const search = await cj.searchProducts({ pageSize: 5 });
    expect(search.products).toEqual([]);
  });

  it("missing price stays null", async () => {
    routeFetch(() =>
      jsonRes(200, {
        code: 200,
        result: true,
        data: { list: [{ pid: "P1", productNameEn: "Bin", sellPrice: null }] },
      }),
    );
    const cj = new CjDropshippingAdapter("", "", "token");
    const search = await cj.searchProducts({});
    expect(search.products[0]?.priceUsd).toBeNull();
  });

  it("Korea shipping unavailable when freight list is empty", async () => {
    routeFetch((url) => {
      if (url.includes("freightCalculate")) return jsonRes(200, { code: 200, result: true, data: [] });
      return jsonRes(200, { code: 200, result: true, data: [] });
    });
    const cj = new CjDropshippingAdapter("", "", "token");
    const quote = await cj.quoteKoreaShipping("VID-1");
    expect(quote.availability).toBe("UNAVAILABLE");
    expect(quote.option).toBeNull();
  });

  it("Korea shipping quote success records official USD price and aging", async () => {
    routeFetch((url) => {
      if (url.includes("freightCalculate")) {
        return jsonRes(200, {
          code: 200,
          result: true,
          data: [{ logisticName: "CJ Packet Ordinary", logisticPrice: 4.71, logisticAging: "8-15" }],
        });
      }
      return jsonRes(404, {});
    });
    const cj = new CjDropshippingAdapter("", "", "token");
    const quote = await cj.quoteKoreaShipping("VID-1");
    expect(quote.availability).toBe("AVAILABLE");
    expect(quote.option?.priceUsd).toBe(4.71);
    expect(quote.option?.aging).toBe("8-15");
    expect(parseOfficialAgingMax(quote.option?.aging ?? null)).toBe(15);
  });

  it("LIVE_OBSERVE blocks CJ order create at adapter level", async () => {
    const cj = new CjDropshippingAdapter({ accessToken: "t", writeEnabled: false });
    const created = await cj.createOrder({ products: [{ vid: "x", quantity: 1 }] });
    expect(created.order).toBeNull();
    expect(created.error).toMatch(/LIVE_OBSERVE/);
  });
});

describe("CurrencyService", () => {
  it("none provider is FX_RATE_NOT_CONFIGURED", async () => {
    const fx = createCurrencyService({ provider: "none", manualUsdKrw: null });
    const r = await fx.resolveUsdKrw();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe("FX_RATE_NOT_CONFIGURED");
  });

  it("manual rate is MANUAL_RATE with source preserved", async () => {
    const fx = createCurrencyService({ provider: "manual", manualUsdKrw: 1350 });
    const r = await fx.resolveUsdKrw();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.quote.status).toBe("MANUAL_RATE");
      expect(r.quote.rate).toBe(1350);
      expect(r.quote.source).toBe("SETTINGS_MANUAL_RATE");
      expect(r.quote.freshness).toBe("MANUAL");
      expect(r.quote.capturedAt).toBeTruthy();
    }
  });
});

describe("Risk first filter", () => {
  it("blocks food category", () => {
    expect(assessRisk({ title: "Snack food gift box" }).decision).toBe("BLOCK");
  });

  it("unknown certification is REVIEW_REQUIRED not PASS", () => {
    const r = assessRisk({ title: "USB lamp unknown certification" });
    expect(r.decision).toBe("REVIEW_REQUIRED");
  });

  it("brand risk is REVIEW_REQUIRED", () => {
    const r = assessRisk({ title: "Storage bin", brandVisible: true, possibleBrand: "Acme" });
    expect(r.decision).toBe("REVIEW_REQUIRED");
  });
});

describe("Product Scout LIVE_OBSERVE", () => {
  it("does not invent market KRW prices and upserts duplicates with price history", async () => {
    const r = repo();
    const supplier = new FakeSupplier();
    supplier.products = [sampleProduct({ priceUsd: 8.2 })];
    const first = await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    expect(first.saved).toBe(1);
    expect(first.created).toBe(1);
    supplier.products = [sampleProduct({ priceUsd: 8.4 })];
    const second = await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    expect(second.created).toBe(0);
    expect(second.updated).toBe(1);
    expect(r.countProducts()).toBe(1);
    const product = r.listProducts()[0];
    expect(product?.marketObservedPriceKrw).toBeNull();
    expect(product?.sellingPriceKind).toBe("TARGET_MARGIN_PRICE");
    expect(product?.targetMarginPriceKrw).not.toBeNull();
    expect(product?.sourceFacts.evidence).toBeTruthy();
    expect(r.listPriceHistory(product!.id).map((h) => h.price)).toEqual([8.2, 8.4]);
    expect(product?.id).toBe(stableProductId("cjdropshipping", "PID-STORAGE-1", "VID-1"));
  });

  it("sold out is not a candidate", async () => {
    const r = repo();
    const supplier = new FakeSupplier();
    supplier.stockNum = 0;
    supplier.products = [sampleProduct()];
    const result = await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    expect(result.stats.recommended).toBe(0);
    expect(r.listProducts()[0]?.status).toBe("SOLD_OUT");
  });

  it("missing SKU / identity is skipped", async () => {
    const r = repo();
    const supplier = new FakeSupplier();
    supplier.products = [sampleProduct({ supplierProductId: "", title: "" })];
    const result = await scoutProducts({ supplier, repo: r, pauseMs: 0, settings: r.getSafetySettings() });
    expect(result.skipped).toBe(1);
    expect(r.countProducts()).toBe(0);
  });

  it("Korea shipping unavailable fails hard filter", () => {
    const hard = passesHardFilters({
      identifiable: true,
      stock: 10,
      supplierPrice: 8,
      shippingCost: null,
      shippingAvailability: "UNAVAILABLE",
      riskDecision: "PASS",
    });
    expect(hard.ok).toBe(false);
  });
});

describe("Dashboard scout gate", () => {
  it("scout API requires CJ READY", async () => {
    const db = openSqlite(":memory:");
    migrate(db);
    const repository = new Repository(db);
    repository.saveSafetySettings(DEFAULT_SAFETY_SETTINGS);
    const providers = new ProviderRegistry([
      new OpenAiAdapter("", "x"),
      new GeminiAdapter("", "x"),
      new ClaudeAdapter("", "x"),
    ]);
    const app = createApp({
      repo: repository,
      providers,
      manager: new ManagerAi(providers),
      vision: new VisionEngine(providers),
      cj: new CjDropshippingAdapter("", "", ""),
      coupang: new CoupangAdapter("", "", ""),
      naver: new NaverCommerceAdapter("", ""),
    });
    const res = await app.request("/api/products/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("공급처 연결 필요");
  });
});
