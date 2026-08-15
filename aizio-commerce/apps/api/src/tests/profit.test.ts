import { describe, expect, it } from "vitest";
import { analyzeProfit } from "../engines/profit/profit-truth.ts";

describe("Profit Truth Engine", () => {
  it("calculates a healthy margin", () => {
    const r = analyzeProfit({
      sellingPrice: 34900,
      productCost: 12900,
      internationalShipping: 4200,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 3173,
      marketplaceFee: 3490,
      paymentFee: 1047,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 0,
      fxBuffer: 387,
      otherCost: 0,
    });
    expect(r.totalCost).toBe(12900 + 4200 + 3173 + 3490 + 1047 + 387);
    expect(r.expectedNetProfit).toBe(r.sellingPrice - r.totalCost);
    expect(r.netMarginRate).toBeCloseTo(r.expectedNetProfit / r.sellingPrice, 4);
    expect(r.roi).toBeCloseTo(r.expectedNetProfit / r.totalCost, 4);
    expect(r.missingInputs).toEqual([]);
    expect(r.confidence).toBe(1);
  });

  it("calculates a loss", () => {
    const r = analyzeProfit({
      sellingPrice: 10000,
      productCost: 8000,
      internationalShipping: 4000,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 0,
      marketplaceFee: 1000,
      paymentFee: 300,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 0,
      fxBuffer: 0,
      otherCost: 0,
    });
    expect(r.expectedNetProfit).toBeLessThan(0);
    expect(r.netMarginRate).toBeLessThan(0);
  });

  it("includes marketplace and payment fees", () => {
    const r = analyzeProfit({
      sellingPrice: 20000,
      productCost: 5000,
      internationalShipping: 0,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 0,
      marketplaceFee: 2000,
      paymentFee: 500,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 0,
      fxBuffer: 0,
      otherCost: 0,
    });
    expect(r.marketplaceFee).toBe(2000);
    expect(r.paymentFee).toBe(500);
    expect(r.totalCost).toBe(7500);
  });

  it("includes expected return loss", () => {
    const r = analyzeProfit({
      sellingPrice: 20000,
      productCost: 5000,
      internationalShipping: 0,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 2500,
      fxBuffer: 0,
      otherCost: 0,
    });
    expect(r.expectedReturnLoss).toBe(2500);
    expect(r.totalCost).toBe(7500);
  });

  it("includes fx buffer", () => {
    const r = analyzeProfit({
      sellingPrice: 20000,
      productCost: 5000,
      internationalShipping: 0,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 0,
      fxBuffer: 800,
      otherCost: 0,
    });
    expect(r.fxBuffer).toBe(800);
    expect(r.totalCost).toBe(5800);
  });

  it("surfaces missing inputs instead of inventing them", () => {
    const r = analyzeProfit({
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
    });
    expect(r.missingInputs).toContain("광고비 실제 데이터 없음");
    expect(r.missingInputs).toContain("플랫폼 카테고리 수수료 미확인");
    expect(r.internationalShipping).toBe(0);
    expect(r.confidence).toBeLessThan(0.3);
    expect(r.inputFreshness.expectedAdCost).toBe("INSUFFICIENT_DATA");
  });

  it("classifies LIVE supplier + LIVE shipping + MANUAL FX as ESTIMATED_PROFIT not verified", () => {
    const r = analyzeProfit({
      sellingPrice: 20000,
      productCost: 8000,
      internationalShipping: 3000,
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
        marketplaceFee: "UNKNOWN",
        expectedAdCost: "UNKNOWN",
        expectedReturnLoss: "INSUFFICIENT_DATA",
      },
    });
    expect(r.stage).toBe("ESTIMATED_PROFIT");
    expect(r.sellingPriceKind).toBe("TARGET_MARGIN_PRICE");
    expect(r.inputFreshness.marketplaceFee).toBe("UNKNOWN");
  });

  it("missing FX stays PRELIMINARY_MARGIN", () => {
    const r = analyzeProfit({
      sellingPrice: null,
      productCost: 8000,
      internationalShipping: 3000,
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
      sellingPriceKind: "NONE",
      fxStatus: "FX_RATE_NOT_CONFIGURED",
      inputFreshness: { productCost: "LIVE", internationalShipping: "LIVE" },
    });
    expect(r.stage).toBe("PRELIMINARY_MARGIN");
  });

  it("negative margin is still not ACTUAL_PROFIT", () => {
    const r = analyzeProfit({
      sellingPrice: 10000,
      productCost: 8000,
      internationalShipping: 4000,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 0,
      marketplaceFee: 1000,
      paymentFee: 0,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 0,
      fxBuffer: 0,
      otherCost: 0,
      sellingPriceKind: "TARGET_MARGIN_PRICE",
      fxStatus: "MANUAL_RATE",
      inputFreshness: {
        productCost: "LIVE",
        internationalShipping: "LIVE",
        marketplaceFee: "UNKNOWN",
      },
    });
    expect(r.expectedNetProfit).toBeLessThan(0);
    expect(r.stage).not.toBe("ACTUAL_PROFIT");
    expect(r.stage).not.toBe("VERIFIED_EXPECTED_PROFIT");
  });

  it("high shipping cost is visible in the cost stack", () => {
    const r = analyzeProfit({
      sellingPrice: 20000,
      productCost: 5000,
      internationalShipping: 16000,
      domesticShipping: 0,
      customsDuty: 0,
      vat: 0,
      marketplaceFee: null,
      paymentFee: 0,
      expectedAdCost: 0,
      promotionCost: 0,
      expectedReturnLoss: 0,
      fxBuffer: 0,
      otherCost: 0,
      sellingPriceKind: "TARGET_MARGIN_PRICE",
      fxStatus: "LIVE",
      inputFreshness: { productCost: "LIVE", internationalShipping: "LIVE", marketplaceFee: "UNKNOWN" },
    });
    expect(r.internationalShipping).toBe(16000);
    expect(r.expectedNetProfit).toBeLessThan(0);
  });
});
