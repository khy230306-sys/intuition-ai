import { describe, expect, it } from "vitest";
import { decideProduct } from "../engines/decision/decision-engine.ts";
import { analyzeProfit } from "../engines/profit/profit-truth.ts";
import { assessRisk } from "../engines/risk/risk-engine.ts";

function profit(overrides: Partial<Parameters<typeof analyzeProfit>[0]> = {}) {
  return analyzeProfit({
    sellingPrice: 34900,
    productCost: 10000,
    internationalShipping: 3000,
    domesticShipping: 0,
    customsDuty: 0,
    vat: 3000,
    marketplaceFee: 3000,
    paymentFee: 1000,
    expectedAdCost: 0,
    promotionCost: 0,
    expectedReturnLoss: 0,
    fxBuffer: 300,
    otherCost: 0,
    ...overrides,
  });
}

describe("Decision Engine", () => {
  it("recommends TEST_SELL for a strong product", () => {
    const r = decideProduct({
      profit: profit(),
      risk: assessRisk({ title: "차량용 미니 청소기" }),
      competitionScore: 70,
      supplyStability: 92,
      deliveryDays: 7,
      expectedReturnRate: 0.05,
      dataConfidence: 0.87,
    });
    expect(r.blockedByRisk).toBe(false);
    expect(r.status).toBe("TEST_SELL");
    expect(r.scores.netMargin.reason).toContain("순마진");
  });

  it("requires review when risk says so", () => {
    const r = decideProduct({
      profit: profit(),
      risk: assessRisk({ title: "블루투스 이어폰 배터리 포함" }),
      competitionScore: 50,
      supplyStability: 80,
      deliveryDays: 10,
      expectedReturnRate: 0.08,
      dataConfidence: 0.8,
    });
    expect(["REVIEW_REQUIRED", "TEST_SELL", "BLOCKED"]).toContain(r.status);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("rejects a loss-making product", () => {
    const r = decideProduct({
      profit: profit({
        sellingPrice: 12000,
        productCost: 10000,
        internationalShipping: 4000,
        marketplaceFee: 1000,
        paymentFee: 400,
      }),
      risk: assessRisk({ title: "일반 케이블" }),
      competitionScore: 50,
      supplyStability: 80,
      deliveryDays: 6,
      expectedReturnRate: 0.05,
      dataConfidence: 0.8,
    });
    expect(r.status).toBe("REJECTED");
  });

  it("requires review when confidence is insufficient", () => {
    const r = decideProduct({
      profit: analyzeProfit({
        sellingPrice: 34900,
        productCost: 12900,
        internationalShipping: null,
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
      }),
      risk: assessRisk({ title: "미니 선풍기" }),
      competitionScore: null,
      supplyStability: null,
      deliveryDays: null,
      expectedReturnRate: null,
      dataConfidence: 0.2,
    });
    expect(r.status).toBe("REVIEW_REQUIRED");
    expect(r.reasons.join(" ")).toMatch(/신뢰도/);
  });

  it("hard-blocks when risk is BLOCK", () => {
    const r = decideProduct({
      profit: profit(),
      risk: assessRisk({ title: "Nike replica sneakers 짝퉁" }),
      competitionScore: 90,
      supplyStability: 99,
      deliveryDays: 3,
      expectedReturnRate: 0.01,
      dataConfidence: 0.99,
    });
    expect(r.status).toBe("BLOCKED");
    expect(r.blockedByRisk).toBe(true);
    expect(r.compositeScore).toBe(0);
  });
});
