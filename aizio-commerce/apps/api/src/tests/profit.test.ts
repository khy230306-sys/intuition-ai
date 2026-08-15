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
});
