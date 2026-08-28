import { describe, expect, it } from "vitest";
import { encryptText, decryptText } from "../crypto/pii.ts";
import { routeCommand } from "../engines/command/command-router.ts";
import { classifyCs } from "../engines/cs/cs-engine.ts";
import { settle } from "../engines/settlement/settlement-engine.ts";
import { openSqlite, migrate } from "../db/client.ts";
import { Repository } from "../db/repository.ts";
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

describe("PII encryption", () => {
  it("does not store round-trip plaintext equality without decrypt", () => {
    const enc = encryptText("서울시 강남구 테헤란로 1");
    expect(enc.ciphertext).not.toContain("강남");
    expect(decryptText(enc)).toBe("서울시 강남구 테헤란로 1");
  });
});

describe("Command router", () => {
  it("routes Korean operating commands", () => {
    expect(routeCommand("오늘 팔만한 상품 찾아줘").intent).toBe("scout");
    expect(routeCommand("순마진 25% 이상만 보여줘").slots.minMargin).toBe("0.25");
    expect(routeCommand("적자 상품 전부 일시중지해").mutating).toBe(true);
    expect(routeCommand("오늘 주문 상태 알려줘").intent).toBe("orders_today");
  });
});

describe("CS / settlement", () => {
  it("never auto-sends legal disputes", () => {
    expect(classifyCs("legal_dispute").autoSendAllowed).toBe(false);
    expect(classifyCs("shipping_status").mode).toBe("DRAFT_THEN_SEND");
  });

  it("keeps expected vs actual profit separate", () => {
    const r = settle({
      expectedNetProfit: 10000,
      actualProductCost: 5000,
      actualShipping: 2000,
      actualFee: 1000,
      actualAds: 500,
      actualRefund: 0,
      actualReturnLoss: 0,
      actualSettlement: 9000,
    });
    expect(r.actualNetProfit).toBe(500);
    expect(r.profitPredictionError).toBe(-9500);
  });
});

describe("API integration", () => {
  it("dashboard does not invent live sales numbers", async () => {
    const db = openSqlite(":memory:");
    migrate(db);
    const repo = new Repository(db);
    repo.saveSafetySettings(DEFAULT_SAFETY_SETTINGS);
    const providers = new ProviderRegistry([
      new OpenAiAdapter("", "x"),
      new GeminiAdapter("", "x"),
      new ClaudeAdapter("", "x"),
    ]);
    const app = createApp({
      repo,
      providers,
      manager: new ManagerAi(providers),
      vision: new VisionEngine(providers),
      cj: new CjDropshippingAdapter("", "", ""),
      coupang: new CoupangAdapter("", "", ""),
      naver: new NaverCommerceAdapter("", ""),
    });
    const res = await app.request("/api/dashboard");
    const body = (await res.json()) as { ordersToday: number; actualNetProfit: number; live: number };
    expect(body.ordersToday).toBe(0);
    expect(body.actualNetProfit).toBe(0);
    expect(body.live).toBe(0);
    const rec = await app.request("/api/products");
    const products = (await rec.json()) as { products: unknown[] };
    expect(products.products).toEqual([]);
  });
});
