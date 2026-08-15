import type { DataFreshness, ProfitAnalysis, ProfitInput } from "../../shared/types.ts";
import { roundKrw, safeDiv, toRate } from "../../shared/money.ts";
import { nowIso } from "../../shared/ids.ts";

const COST_FIELDS = [
  "productCost",
  "internationalShipping",
  "domesticShipping",
  "customsDuty",
  "vat",
  "marketplaceFee",
  "paymentFee",
  "expectedAdCost",
  "promotionCost",
  "expectedReturnLoss",
  "fxBuffer",
  "otherCost",
] as const;

type CostField = (typeof COST_FIELDS)[number];

const MISSING_LABEL = {
  sellingPrice: "판매가격 미확인",
  productCost: "상품 공급원가 미확인",
  internationalShipping: "국제배송비 미확인",
  domesticShipping: "국내배송비 미확인",
  customsDuty: "관세 미확인",
  vat: "부가세 미확인",
  marketplaceFee: "플랫폼 카테고리 수수료 미확인",
  paymentFee: "결제 수수료 미확인",
  expectedAdCost: "광고비 실제 데이터 없음",
  promotionCost: "쿠폰/프로모션 비용 미확인",
  expectedReturnLoss: "예상 반품손실 데이터 부족",
  fxBuffer: "환율 안전마진 미설정",
  otherCost: "기타 비용 미확인",
} as const;

function num(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return value;
}

function isMissing(value: number | null | undefined): boolean {
  return value === null || value === undefined || !Number.isFinite(value);
}

/**
 * Profit Truth Engine — deterministic cost stack.
 * LLM output is never used as a money source.
 */
export function analyzeProfit(input: ProfitInput): ProfitAnalysis {
  const missingInputs: string[] = [];
  const freshness: Record<string, DataFreshness> = {
    sellingPrice: input.inputFreshness?.sellingPrice ?? (isMissing(input.sellingPrice) ? "INSUFFICIENT_DATA" : "LIVE"),
  };

  if (isMissing(input.sellingPrice) || (input.sellingPrice ?? 0) <= 0) {
    missingInputs.push(MISSING_LABEL.sellingPrice);
    freshness.sellingPrice = "INSUFFICIENT_DATA";
  }

  for (const field of COST_FIELDS) {
    const value = input[field];
    const provided = input.inputFreshness?.[field];
    if (isMissing(value)) {
      missingInputs.push(MISSING_LABEL[field] ?? `${field} 미확인`);
      freshness[field] = provided ?? "INSUFFICIENT_DATA";
    } else {
      freshness[field] = provided ?? "LIVE";
    }
  }

  const sellingPrice = roundKrw(num(input.sellingPrice));
  const costs: Record<CostField, number> = {
    productCost: roundKrw(num(input.productCost)),
    internationalShipping: roundKrw(num(input.internationalShipping)),
    domesticShipping: roundKrw(num(input.domesticShipping)),
    customsDuty: roundKrw(num(input.customsDuty)),
    vat: roundKrw(num(input.vat)),
    marketplaceFee: roundKrw(num(input.marketplaceFee)),
    paymentFee: roundKrw(num(input.paymentFee)),
    expectedAdCost: roundKrw(num(input.expectedAdCost)),
    promotionCost: roundKrw(num(input.promotionCost)),
    expectedReturnLoss: roundKrw(num(input.expectedReturnLoss)),
    fxBuffer: roundKrw(num(input.fxBuffer)),
    otherCost: roundKrw(num(input.otherCost)),
  };

  const totalCost = roundKrw(COST_FIELDS.reduce((sum, field) => sum + costs[field], 0));
  const expectedNetProfit = roundKrw(sellingPrice - totalCost);
  const netMarginRate = toRate(safeDiv(expectedNetProfit, sellingPrice));
  const roi = toRate(safeDiv(expectedNetProfit, totalCost));

  const knownCostFields = COST_FIELDS.filter((f) => !isMissing(input[f])).length;
  const knownPrice = !isMissing(input.sellingPrice) && (input.sellingPrice ?? 0) > 0 ? 1 : 0;
  const confidence = toRate((knownCostFields + knownPrice) / (COST_FIELDS.length + 1));

  return {
    sellingPrice,
    ...costs,
    totalCost,
    expectedNetProfit,
    netMarginRate,
    roi,
    confidence,
    missingInputs,
    inputFreshness: freshness,
    currency: "KRW",
    calculatedAt: nowIso(input.now),
  };
}

export function feeFromRate(base: number, rate: number | null): number | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  return roundKrw(base * rate);
}
