import { describe, expect, it } from "vitest";
import { evaluateSafetyGate } from "../engines/safety/safety-gate.ts";
import { DEFAULT_SAFETY_SETTINGS } from "../shared/types.ts";

const base = {
  action: "SUPPLIER_ORDER" as const,
  amountKRW: 40_000,
  dailySpentKRW: 0,
  monthlySpentKRW: 0,
  netMarginRate: 0.3,
  confidence: 0.9,
  supplierPriceIncreaseRate: 0,
  humanApproved: true,
};

describe("Safety Gate", () => {
  it("blocks below minimum margin", () => {
    const r = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, { ...base, netMarginRate: 0.1 });
    expect(r.allowed).toBe(false);
    expect(r.decision).toBe("BLOCK");
    expect(r.ruleHits).toContain("margin.min");
  });

  it("blocks amount over per-order limit", () => {
    const r = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, { ...base, amountKRW: 150_000 });
    expect(r.decision).toBe("BLOCK");
    expect(r.ruleHits).toContain("limit.perOrder");
  });

  it("blocks daily spend overflow", () => {
    const r = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, {
      ...base,
      dailySpentKRW: 480_000,
      amountKRW: 40_000,
    });
    expect(r.ruleHits).toContain("limit.daily");
    expect(r.decision).toBe("BLOCK");
  });

  it("blocks Risk BLOCK and cannot be overridden by humanApproved", () => {
    const r = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, {
      ...base,
      riskDecision: "BLOCK",
      humanApproved: true,
    });
    expect(r.allowed).toBe(false);
    expect(r.decision).toBe("BLOCK");
    expect(r.ruleHits).toContain("risk.BLOCK");
  });

  it("blocks supplier price spike over 5%", () => {
    const r = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, {
      ...base,
      supplierPriceIncreaseRate: 0.072,
    });
    expect(r.decision).toBe("BLOCK");
    expect(r.ruleHits).toContain("supplier.priceSpike");
  });

  it("allows a safe order", () => {
    const r = evaluateSafetyGate(DEFAULT_SAFETY_SETTINGS, base);
    expect(r.allowed).toBe(true);
    expect(r.decision).toBe("ALLOW");
  });
});
