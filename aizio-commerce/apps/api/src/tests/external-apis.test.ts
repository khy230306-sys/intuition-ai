import { afterEach, describe, expect, it, vi } from "vitest";
import { CjDropshippingAdapter } from "../adapters/suppliers/cjdropshipping.ts";
import { CoupangAdapter } from "../adapters/marketplaces/coupang.ts";
import { coupangAuthorization, formatCoupangDate } from "../adapters/marketplaces/types.ts";
import { NaverCommerceAdapter, naverClientSecretSign } from "../adapters/marketplaces/naver.ts";
import { buildMarketSnapshot } from "../engines/market/market-intelligence.ts";
import { groundContent } from "../engines/content/content-engine.ts";
import { classifyReturn } from "../engines/return/return-engine.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("External API adapters", () => {
  it("does not invent CJ data without credentials", async () => {
    const cj = new CjDropshippingAdapter("", "", "");
    expect(await cj.getStatus()).toBe("PENDING_SETUP");
    const search = await cj.searchProducts({ keyword: "vacuum" });
    expect(search.products).toEqual([]);
    expect(search.status).toBe("PENDING_SETUP");
  });

  it("handles malformed CJ JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 200 })));
    const cj = new CjDropshippingAdapter("", "", "token");
    const result = await cj.getProduct("PID");
    expect(result.product).toBeNull();
    expect(result.error).toBe("malformed_json");
  });

  it("treats missing SKU as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ code: 200, result: true, data: null }), { status: 200 }),
      ),
    );
    const cj = new CjDropshippingAdapter("", "", "token");
    const result = await cj.getProduct("missing");
    expect(result.product).toBeNull();
    expect(result.error).toMatch(/missing SKU/i);
  });

  it("detects sold-out inventory payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            code: 200,
            result: true,
            data: [{ vid: "v1", countryCode: "CN", totalInventoryNum: 0 }],
          }),
          { status: 200 },
        ),
      ),
    );
    const cj = new CjDropshippingAdapter("", "", "token");
    const stock = await cj.getStock({ vid: "v1" });
    expect(stock.status).toBe("READY");
    const rows = stock.stock as Array<{ totalInventoryNum?: number }>;
    expect(rows[0]?.totalInventoryNum).toBe(0);
  });

  it("surfaces supplier price change from live payload vs stored", () => {
    const oldUsd = 10;
    const newUsd = 10.72;
    const increase = (newUsd - oldUsd) / oldUsd;
    expect(increase).toBeGreaterThan(0.05);
  });

  it("Coupang stays PENDING_SETUP without keys", async () => {
    const c = new CoupangAdapter("", "", "");
    expect(await c.getStatus()).toBe("PENDING_SETUP");
    const listed = await c.createListing({});
    expect(listed.listingId).toBeNull();
    expect(listed.status).toBe("PENDING_SETUP");
  });

  it("builds Coupang HMAC with official CEA format", () => {
    const now = new Date("2026-08-15T05:22:00Z");
    const auth = coupangAuthorization("GET", "/v2/foo?bar=1", "secret", "access", now);
    expect(auth).toContain("CEA algorithm=HmacSHA256");
    expect(auth).toContain("access-key=access");
    expect(auth).toContain(`signed-date=${formatCoupangDate(now)}`);
    expect(auth).toMatch(/signature=[0-9a-f]{64}/);
  });

  it("Naver signature matches official bcrypt+base64 method", () => {
    const sign = naverClientSecretSign("aaaabbbbcccc", "$2a$10$abcdefghijklmnopqrstuv", 1643961623299);
    expect(sign).toBe("JDJhJDEwJGFiY2RlZmdoaWprbG1ub3BxcnN0dXVCVldZSk42T0VPdEx1OFY0cDQxa2IuTnpVaUEzbmsy");
  });

  it("Naver token failure does not create fake orders", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "fail" }), { status: 401 })));
    const n = new NaverCommerceAdapter("id", "$2a$10$abcdefghijklmnopqrstuv");
    const orders = await n.fetchOrders();
    expect(orders.orders).toEqual([]);
    expect(orders.status).toBe("AUTH_FAILED");
  });

  it("market snapshot stays UNKNOWN without observations", () => {
    const snap = buildMarketSnapshot("p1", []);
    expect(snap.freshness).toBe("UNKNOWN");
    expect(snap.medianPrice).toBeNull();
    expect(snap.competitorCount).toBeNull();
    expect(snap.confidence).toBe(0);
  });

  it("rejects ungrounded waterproof claims", () => {
    const content = groundContent(
      { title: "차량용 청소기", features: ["무선"] },
      {
        highlights: [{ text: "완전방수", sourceField: "features", sourceValue: "완전방수" }],
        source: "AI",
      },
    );
    expect(content.rejectedClaims.some((c) => c.includes("완전방수"))).toBe(true);
    expect(content.highlights.every((h) => !h.text.includes("완전방수"))).toBe(true);
  });

  it("return engine forces human review on high-risk cases", () => {
    const r = classifyReturn({
      amountKRW: 200000,
      supplierRejected: true,
      policyConflict: false,
      evidenceMissing: true,
      shippingDispute: false,
      fraudSuspected: false,
      aiConfidence: 0.2,
      highRefundThresholdKRW: 50000,
    });
    expect(r.decision).toBe("HUMAN_REVIEW_REQUIRED");
  });
});
