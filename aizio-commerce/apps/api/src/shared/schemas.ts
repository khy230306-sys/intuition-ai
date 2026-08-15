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
});

export function parseSafetySettings(raw: unknown) {
  const parsed = safetySettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_SAFETY_SETTINGS;
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
