import { afterEach, describe, expect, it, vi } from "vitest";
import { CjDropshippingAdapter } from "../adapters/suppliers/cjdropshipping.ts";
import {
  classifyInventory,
  classifyShipping,
  flattenListV2,
  gradeConnection,
  parseFreightOptions,
  parseStockRows,
  scoutCapsReady,
} from "../adapters/suppliers/cj-catalog.ts";
import { BLOCKED_BY_LIVE_OBSERVE, detectLiveObserveWrite, liveObserveWriteBlock } from "../engines/safety/live-observe.ts";
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
import { runWatchCycle } from "../watch/cycle.ts";
import type { AppServices } from "../app-context.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function routeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)),
  );
}

function repo() {
  const db = openSqlite(":memory:");
  migrate(db);
  const r = new Repository(db);
  r.saveSafetySettings({
    ...DEFAULT_SAFETY_SETTINGS,
    fx: { provider: "manual", manualUsdKrw: 1300 },
    scout: { ...DEFAULT_SAFETY_SETTINGS.scout, limit: 30, keyword: "storage organizer" },
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

const officialListV2 = {
  code: 200,
  result: true,
  data: {
    content: [
      {
        productList: [
          { id: "P1000001", nameEn: "Storage Bin", sku: "SKU-BIN", sellPrice: 8.2, bigImage: "https://img/bin.jpg" },
          { id: "P1000002", nameEn: "Cable Clip", sku: "SKU-CLIP", sellPrice: 2.1 },
          { id: "P1000003", nameEn: "Desk Tray", sku: "SKU-TRAY", sellPrice: 5.4 },
        ],
      },
    ],
  },
};

function mockOfficialCj(opts?: {
  stock?: unknown;
  stockCode?: number;
  freight?: unknown;
  freightCode?: number;
  variants?: unknown;
  stockMalformed?: boolean;
  freightMalformed?: boolean;
  capture?: { freightBody?: Record<string, unknown> };
}) {
  routeFetch((url, init) => {
    if (url.includes("getAccessToken")) {
      return jsonRes(200, {
        code: 200,
        result: true,
        data: {
          accessToken: "issued-secret-token-value",
          refreshToken: "refresh-secret-value",
          accessTokenExpiryDate: "2099-01-01T00:00:00Z",
        },
      });
    }
    if (url.includes("listV2")) return jsonRes(200, officialListV2);
    if (url.includes("queryByVid")) {
      if (opts?.stockMalformed) return new Response("not-json", { status: 200 });
      const code = opts?.stockCode ?? 200;
      return jsonRes(200, {
        code,
        result: code === 200,
        message: code === 200 ? "success" : "vid invalid",
        data: opts?.stock ?? [
          { vid: "V1000001", areaEn: "CN", countryCode: "CN", totalInventoryNum: 12, cjInventoryNum: 12 },
        ],
      });
    }
    if (url.includes("variant/query")) {
      return jsonRes(200, {
        code: 200,
        result: true,
        data: opts?.variants ?? [{ vid: "V1000001", variantSku: "SKU-BIN-WH", variantWeight: 320 }],
      });
    }
    if (url.includes("/product/query")) {
      return jsonRes(200, {
        code: 200,
        result: true,
        data: { id: "P1000001", nameEn: "Storage Bin", variants: [{ vid: "V1000001" }] },
      });
    }
    if (url.includes("freightCalculate")) {
      if (opts?.capture && init?.body) {
        opts.capture.freightBody = JSON.parse(String(init.body)) as Record<string, unknown>;
      }
      if (opts?.freightMalformed) return new Response("<html>oops</html>", { status: 200 });
      const code = opts?.freightCode ?? 200;
      return jsonRes(200, {
        code,
        result: code === 200,
        message: code === 200 ? "success" : "freight failed",
        data: opts?.freight ?? [{ logisticName: "CJ Packet Ordinary", logisticPrice: 4.71, logisticAging: "8-15" }],
      });
    }
    return jsonRes(200, { code: 200, result: true, data: [] });
  });
}

describe("V1.2.2 official catalog parsing", () => {
  it("flattens official listV2 content[].productList[] using id/nameEn", () => {
    const products = flattenListV2(officialListV2.data);
    expect(products).toHaveLength(3);
    expect(products[0]?.pid).toBe("P1000001");
    expect(products[0]?.title).toBe("Storage Bin");
    expect(products[0]?.vid).toBeNull();
    expect(products[0]?.sku).toBe("SKU-BIN");
    expect(products.map((p) => p.vid)).toEqual([null, null, null]);
    expect(products.every((p) => p.pid !== p.vid)).toBe(true);
  });

  it("still accepts legacy data.list pid/vid mocks", () => {
    const products = flattenListV2({ list: [{ pid: "P1", productNameEn: "Bin", vid: "V1", sellPrice: 8 }] });
    expect(products[0]?.pid).toBe("P1");
    expect(products[0]?.vid).toBe("V1");
  });
});

describe("V1.2.2 inventory classification", () => {
  it("valid VID with warehouse stock is READY", () => {
    const raw = [{ vid: "V1", areaEn: "CN", countryCode: "CN", totalInventoryNum: 9 }];
    expect(classifyInventory(raw, true)).toBe("READY");
    expect(parseStockRows(raw)[0]?.totalInventoryNum).toBe(9);
  });

  it("sold out is OUT_OF_STOCK not API_FAILED", () => {
    expect(classifyInventory([{ totalInventoryNum: 0 }], true)).toBe("OUT_OF_STOCK");
  });

  it("empty stock payload is UNKNOWN not API_FAILED", () => {
    expect(classifyInventory([], true)).toBe("UNKNOWN");
    expect(classifyInventory(null, true)).toBe("UNKNOWN");
  });

  it("malformed rows without totals are UNKNOWN", () => {
    expect(classifyInventory([{ areaEn: "CN" }], true)).toBe("UNKNOWN");
  });

  it("API failure is API_FAILED", () => {
    expect(classifyInventory([{ totalInventoryNum: 9 }], false)).toBe("API_FAILED");
  });
});

describe("V1.2.2 shipping classification", () => {
  it("KR success parses official logistic fields", () => {
    const options = parseFreightOptions([
      { logisticName: "CJ Packet Ordinary", logisticPrice: 4.71, logisticAging: "8-15" },
    ]);
    expect(options).toHaveLength(1);
    expect(options[0]?.name).toBe("CJ Packet Ordinary");
    expect(options[0]?.priceUsd).toBe(4.71);
    expect(options[0]?.aging).toBe("8-15");
    expect(options[0]?.currency).toBe("USD");
    expect(classifyShipping([{ logisticName: "CJ Packet Ordinary", logisticPrice: 4.71 }], true)).toBe("READY");
  });

  it("KR unavailable empty data is UNAVAILABLE not API_FAILED", () => {
    expect(classifyShipping([], true)).toBe("UNAVAILABLE");
  });

  it("multiple shipping methods are preserved", () => {
    const options = parseFreightOptions([
      { logisticName: "CJ Packet Ordinary", logisticPrice: 4.71, logisticAging: "8-15" },
      { logisticName: "YunExpress", logisticPrice: 6.2, logisticAging: "5-10", id: "LP-9" },
    ]);
    expect(options.map((o) => o.name)).toEqual(["CJ Packet Ordinary", "YunExpress"]);
    expect(options[1]?.logisticsProductId).toBe("LP-9");
    expect(options[0]?.logisticsProductId).toBeNull();
  });

  it("API failure is API_FAILED", () => {
    expect(classifyShipping([{ logisticName: "CJ Packet Ordinary", logisticPrice: 4.71 }], false)).toBe("API_FAILED");
  });
});

describe("V1.2.2 connection grade", () => {
  it("products only is PARTIALLY_READY", () => {
    expect(
      gradeConnection({ configured: true, authReady: true, productsReady: true, inventoryReady: false, shippingReady: false }),
    ).toBe("PARTIALLY_READY");
  });

  it("inventory fail is PARTIALLY_READY", () => {
    expect(
      gradeConnection({ configured: true, authReady: true, productsReady: true, inventoryReady: false, shippingReady: true }),
    ).toBe("PARTIALLY_READY");
  });

  it("shipping fail is PARTIALLY_READY", () => {
    expect(
      gradeConnection({ configured: true, authReady: true, productsReady: true, inventoryReady: true, shippingReady: false }),
    ).toBe("PARTIALLY_READY");
  });

  it("all four READY is READY", () => {
    expect(
      gradeConnection({ configured: true, authReady: true, productsReady: true, inventoryReady: true, shippingReady: true }),
    ).toBe("READY");
  });

  it("scout requires all four READY", () => {
    expect(scoutCapsReady({ productSearch: "READY", inventory: "READY", shipping: "READY" }, "READY")).toBe(true);
    expect(scoutCapsReady({ productSearch: "READY", inventory: "UNAVAILABLE", shipping: "READY" }, "READY")).toBe(false);
    expect(scoutCapsReady({ productSearch: "READY", inventory: "READY", shipping: "READY" }, "PARTIALLY_READY")).toBe(false);
  });
});

describe("V1.2.2 live adapter probes", () => {
  it("official nested listV2 without vid still finds variant then inventory and KR freight", async () => {
    const capture: { freightBody?: Record<string, unknown> } = {};
    mockOfficialCj({ capture });
    const cj = new CjDropshippingAdapter({ apiKey: "official-api-key-value-xxxx", limiter: null });
    const report = await cj.runConnectionTest({ pauseMs: 0 });
    expect(report.status).toBe("READY");
    expect(report.capabilities.productSearch).toBe("READY");
    expect(report.capabilities.inventory).toBe("READY");
    expect(report.capabilities.shipping).toBe("READY");
    const inventory = report.probes.find((p) => p.name === "inventory");
    const shipping = report.probes.find((p) => p.name === "shipping");
    expect(inventory?.status).toBe("READY");
    expect(inventory?.inventoryClass).toBe("READY");
    expect(inventory?.endpoint).toBe("/product/stock/queryByVid");
    expect(inventory?.requestFields).toEqual(["vid"]);
    expect(shipping?.status).toBe("READY");
    expect(shipping?.endpoint).toBe("/logistic/freightCalculate");
    expect(inventory?.productId).not.toBe(inventory?.variantId);
    expect(capture.freightBody).toMatchObject({
      startCountryCode: "CN",
      endCountryCode: "KR",
      products: [{ quantity: 1, vid: "V1000001" }],
    });
    expect(capture.freightBody).not.toHaveProperty("weight");
    expect(JSON.stringify(report)).not.toContain("official-api-key-value-xxxx");
    expect(JSON.stringify(report)).not.toContain("issued-secret-token-value");
  });

  it("valid VID stock empty is UNKNOWN inventory class but inventory API READY", async () => {
    mockOfficialCj({ stock: [] });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.probes.find((p) => p.name === "inventory")?.inventoryClass).toBe("UNKNOWN");
    expect(report.capabilities.inventory).toBe("READY");
    expect(report.status).toBe("READY");
  });

  it("sold out is OUT_OF_STOCK and inventory API READY", async () => {
    mockOfficialCj({ stock: [{ vid: "V1000001", countryCode: "CN", totalInventoryNum: 0 }] });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.probes.find((p) => p.name === "inventory")?.inventoryClass).toBe("OUT_OF_STOCK");
    expect(report.capabilities.inventory).toBe("READY");
    expect(report.status).toBe("READY");
  });

  it("invalid VID is inventory API failed / PARTIALLY_READY", async () => {
    mockOfficialCj({ stockCode: 1600200, stock: null });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.capabilities.inventory).toBe("UNAVAILABLE");
    expect(report.probes.find((p) => p.name === "inventory")?.inventoryClass).toBe("API_FAILED");
    expect(report.probes.find((p) => p.name === "inventory")?.error).toBe("INVENTORY_API_FAILED");
    expect(report.status).toBe("PARTIALLY_READY");
  });

  it("malformed inventory response is API_FAILED / PARTIALLY_READY", async () => {
    mockOfficialCj({ stockMalformed: true });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.capabilities.inventory).toBe("UNAVAILABLE");
    expect(report.status).toBe("PARTIALLY_READY");
  });

  it("inventory HTTP/CJ failure is PARTIALLY_READY", async () => {
    mockOfficialCj({ stockCode: 500 });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.status).toBe("PARTIALLY_READY");
    expect(report.error).toBe("INVENTORY_API_FAILED");
  });

  it("KR unavailable empty freight keeps shipping API READY", async () => {
    mockOfficialCj({ freight: [] });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.probes.find((p) => p.name === "shipping")?.shippingClass).toBe("UNAVAILABLE");
    expect(report.capabilities.shipping).toBe("READY");
    expect(report.status).toBe("READY");
  });

  it("multiple shipping methods are parsed without inventing ids", async () => {
    mockOfficialCj({
      freight: [
        { logisticName: "CJ Packet Ordinary", logisticPrice: 4.71, logisticAging: "8-15" },
        { logisticName: "YunExpress", logisticPrice: 6.2, logisticAging: "5-10" },
      ],
    });
    const cj = new CjDropshippingAdapter({ apiKey: "k", limiter: null });
    const quote = await cj.quoteKoreaShipping("V1000001");
    expect(quote.availability).toBe("AVAILABLE");
    expect(quote.option?.name).toBe("CJ Packet Ordinary");
    expect(quote.option?.priceUsd).toBe(4.71);
    expect(quote.option?.logisticsProductId ?? null).toBeNull();
  });

  it("missing weight is allowed on simple freightCalculate", async () => {
    const capture: { freightBody?: Record<string, unknown> } = {};
    mockOfficialCj({ capture });
    await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(capture.freightBody).toEqual({
      startCountryCode: "CN",
      endCountryCode: "KR",
      products: [{ quantity: 1, vid: "V1000001" }],
    });
  });

  it("malformed shipping response is PARTIALLY_READY", async () => {
    mockOfficialCj({ freightMalformed: true });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.capabilities.shipping).toBe("UNAVAILABLE");
    expect(report.status).toBe("PARTIALLY_READY");
    expect(report.error).toBe("SHIPPING_API_FAILED");
  });

  it("shipping API failure is PARTIALLY_READY", async () => {
    mockOfficialCj({ freightCode: 1600300, freight: null });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.capabilities.productSearch).toBe("READY");
    expect(report.capabilities.inventory).toBe("READY");
    expect(report.capabilities.shipping).toBe("UNAVAILABLE");
    expect(report.status).toBe("PARTIALLY_READY");
  });

  it("products only without vid is PARTIALLY_READY", async () => {
    mockOfficialCj({ variants: [] });
    routeFetch((url) => {
      if (url.includes("getAccessToken")) {
        return jsonRes(200, {
          code: 200,
          result: true,
          data: { accessToken: "tok", accessTokenExpiryDate: "2099-01-01T00:00:00Z" },
        });
      }
      if (url.includes("listV2")) return jsonRes(200, officialListV2);
      if (url.includes("variant/query") || url.includes("/product/query")) {
        return jsonRes(200, { code: 200, result: true, data: [] });
      }
      return jsonRes(200, { code: 200, result: true, data: [] });
    });
    const report = await new CjDropshippingAdapter({ apiKey: "k", limiter: null }).runConnectionTest({ pauseMs: 0 });
    expect(report.capabilities.productSearch).toBe("READY");
    expect(report.capabilities.inventory).toBe("UNAVAILABLE");
    expect(report.capabilities.shipping).toBe("UNAVAILABLE");
    expect(report.status).toBe("PARTIALLY_READY");
  });
});

describe("V1.2.2 scout and watch", () => {
  it("PARTIALLY_READY blocks scout HTTP", async () => {
    mockOfficialCj({ stockCode: 1600200, stock: null });
    const r = repo();
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "", limiter: null }), r));
    await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "official-api-key-value-xxxx" }),
    });
    const dash = (await (await app.request("/api/dashboard")).json()) as {
      cjStatus: string;
      scout: { cjReady: boolean };
      supplier: { connection: string; mode: string };
    };
    expect(dash.cjStatus).toBe("PARTIALLY_READY");
    expect(dash.scout.cjReady).toBe(false);
    expect(dash.supplier.connection).toBe("PARTIALLY READY");
    const scout = await app.request("/api/products/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(scout.status).toBe(409);
  });

  it("all four READY enables scout HTTP", async () => {
    mockOfficialCj();
    const r = repo();
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "", limiter: null }), r));
    const connect = await app.request("/api/integrations/cjdropshipping/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "official-api-key-value-xxxx" }),
    });
    const body = (await connect.json()) as { status: string; connection: string };
    expect(body.status).toBe("READY");
    expect(body.connection).toBe("CONNECTED");
    const scout = await app.request("/api/products/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(scout.status).toBe(200);
    expect(((await scout.json()) as { status: string }).status).toBe("QUEUED");
  });

  it("Watch records inventory and shipping incidents without GLOBAL SAFETY LOCK", () => {
    const r = repo();
    r.upsertIntegration({
      id: "cjdropshipping",
      kind: "supplier",
      name: "CJdropshipping",
      status: "PARTIALLY_READY",
      lastSuccessAt: new Date().toISOString(),
      lastError: "INVENTORY_API_FAILED",
      capabilities: { productSearch: "READY", inventory: "UNAVAILABLE", shipping: "UNAVAILABLE" },
      docsUrl: "https://developers.cjdropshipping.cn/en/api/api2/api/product.html",
    });
    const report = runWatchCycle(r);
    expect(report.findings).toContain("CJ_INVENTORY_API_FAILED");
    expect(report.findings).toContain("CJ_SHIPPING_API_FAILED");
    expect(report.overall).toBe("DEGRADED");
    expect(report.safetyLock).toBe(false);
    expect(r.getGlobalSafetyLock()).toBe(false);
    const titles = r.listIncidents().map((i) => i.title);
    expect(titles).toContain("CJ_INVENTORY_API_FAILED");
    expect(titles).toContain("CJ_SHIPPING_API_FAILED");
  });

  it("LIVE_OBSERVE still blocks external WRITE", async () => {
    const app = createApp(appServices(new CjDropshippingAdapter({ apiKey: "" })));
    for (const text of ["CJ에 발주해줘", "결제 실행해", "쿠팡 리스팅 등록해", "환불 처리해"]) {
      const res = await app.request("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      expect(res.status).toBe(409);
      expect(((await res.json()) as { code: string }).code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    }
    expect(detectLiveObserveWrite("CREATE_ORDER")).toBe("CREATE_ORDER");
    expect(detectLiveObserveWrite("PAY_ORDER")).toBe("PAY_ORDER");
    expect(detectLiveObserveWrite("CREATE_LISTING")).toBe("CREATE_LISTING");
    expect(detectLiveObserveWrite("UPDATE_LISTING")).toBe("UPDATE_LISTING");
    expect(detectLiveObserveWrite("환불 처리해")).toBe("REFUND");
    expect(detectLiveObserveWrite("반품 처리해")).toBe("RETURN_WRITE");
    expect(detectLiveObserveWrite("분쟁 접수해")).toBe("DISPUTE_WRITE");
    for (const action of [
      "CREATE_ORDER",
      "PAY_ORDER",
      "CREATE_LISTING",
      "UPDATE_LISTING",
      "REFUND",
      "RETURN_WRITE",
      "DISPUTE_WRITE",
    ] as const) {
      expect(liveObserveWriteBlock(action).code).toBe(BLOCKED_BY_LIVE_OBSERVE);
    }
  });
});
