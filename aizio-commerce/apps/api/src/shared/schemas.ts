import { z } from "zod";
import { DEFAULT_SAFETY_SETTINGS } from "./types.ts";

export const profitInputSchema = z.object({
  sellingPrice: z.number().nullable(),
  productCost: z.number().nullable(),
  internationalShipping: z.number().nullable(),
  domesticShipping: z.number().nullable(),
  customsDuty: z.number().nullable(),
  vat: z.number().nullable(),
  marketplaceFee: z.number().nullable(),
  paymentFee: z.number().nullable(),
  expectedAdCost: z.number().nullable(),
  promotionCost: z.number().nullable(),
  expectedReturnLoss: z.number().nullable(),
  fxBuffer: z.number().nullable(),
  otherCost: z.number().nullable(),
});

export const fxSettingsSchema = z.object({
  provider: z.enum(["none", "manual", "frankfurter"]).default("none"),
  manualUsdKrw: z.number().positive().nullable().default(null),
});

export const scoutFilterSchema = z.object({
  limit: z.number().int().min(1).max(50).default(30),
  keyword: z.string().default("storage organizer"),
  maxSupplierPrice: z.number().positive().nullable().default(null),
  maxShippingCost: z.number().positive().nullable().default(null),
  minPreliminaryMargin: z.number().default(0.15),
  maximumDeliveryDays: z.number().int().positive().nullable().default(21),
  allowedCategories: z.array(z.string()).default([]),
  blockedCategories: z.array(z.string()).default([]),
});

export const safetySettingsSchema = z.object({
  maxPerOrderKRW: z.number().nonnegative(),
  maxDailyKRW: z.number().nonnegative(),
  maxMonthlyKRW: z.number().nonnegative(),
  minMarginRate: z.number().min(0).max(1),
  minConfidence: z.number().min(0).max(1),
  maxSupplierPriceIncreaseRate: z.number().min(0).max(1),
  blockedCategories: z.array(z.string()),
  blockedSuppliers: z.array(z.string()),
  blockedCountries: z.array(z.string()),
  manualApprovalThresholdKRW: z.number().nonnegative(),
  operatingMode: z.enum(["LIVE_OBSERVE", "LIVE_TRADE"]).default("LIVE_OBSERVE"),
  targetMarginRate: z.number().min(0).max(0.95).default(0.35),
  fx: fxSettingsSchema.default({ provider: "none", manualUsdKrw: null }),
  scout: scoutFilterSchema.default({
    limit: 30,
    keyword: "storage organizer",
    maxSupplierPrice: null,
    maxShippingCost: null,
    minPreliminaryMargin: 0.15,
    maximumDeliveryDays: 21,
    allowedCategories: [],
    blockedCategories: [],
  }),
});

export function parseSafetySettings(raw: unknown) {
  const base = DEFAULT_SAFETY_SETTINGS;
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const merged = {
    ...base,
    ...obj,
    fx: { ...base.fx, ...(typeof obj.fx === "object" && obj.fx ? obj.fx : {}) },
    scout: { ...base.scout, ...(typeof obj.scout === "object" && obj.scout ? obj.scout : {}) },
  };
  const parsed = safetySettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : base;
}

export const commandSchema = z.object({
  text: z.string().min(1).max(500),
});

export const approveProductSchema = z.object({
  productId: z.string().min(1),
  sellingPrice: z.number().positive().optional(),
  marketplace: z.enum(["coupang", "naver"]).optional(),
  autoList: z.boolean().optional(),
});
