import type { MarketplaceAdapter } from "../../adapters/marketplaces/types.ts";
import type { SupplierAdapter } from "../../adapters/suppliers/types.ts";
import type { Repository, ProductRecord } from "../../db/repository.ts";
import { evaluateSafetyGate } from "../safety/safety-gate.ts";
import { analyzeProfit } from "../profit/profit-truth.ts";
import { assessRisk } from "../risk/risk-engine.ts";
import type { ProfitAnalysis, SafetySettings } from "../../shared/types.ts";
import { nowIso } from "../../shared/ids.ts";

export async function prepareAndList(opts: {
  product: ProductRecord;
  marketplace: MarketplaceAdapter;
  supplier: SupplierAdapter | null;
  repo: Repository;
  settings: SafetySettings;
  humanApproved: boolean;
  dailySpent: number;
  monthlySpent: number;
}): Promise<{ status: string; listingId: string | null; error: string | null; blocked?: boolean }> {
  const profit = opts.product.profit as ProfitAnalysis | null;
  const risk = assessRisk({
    title: opts.product.title,
    category: opts.product.category,
    keywords: [opts.product.title],
  });
  if (risk.decision === "BLOCK") {
    opts.repo.insertAudit({
      actor: "LISTING_ENGINE",
      action: "LISTING_BLOCKED",
      entityType: "product",
      entityId: opts.product.id,
      summary: `상품 ${opts.product.id} 리스팅 차단 — Risk BLOCK`,
    });
    return { status: "BLOCKED", listingId: null, error: "Risk Engine BLOCK", blocked: true };
  }

  if (opts.supplier && opts.product.supplierProductId) {
    const live = await opts.supplier.getProduct(opts.product.supplierProductId);
    if (live.status !== "READY" || !live.product) {
      return { status: live.status, listingId: null, error: live.error ?? "판매 전 원가/재고 재조회 실패" };
    }
    if (live.product.priceUsd === null) {
      return { status: "UNAVAILABLE", listingId: null, error: "공급가 재조회 결과 없음" };
    }
  }

  const gate = evaluateSafetyGate(opts.settings, {
    action: "MARKETPLACE_LISTING",
    amountKRW: opts.product.recommendedPriceKrw ?? 0,
    dailySpentKRW: opts.dailySpent,
    monthlySpentKRW: opts.monthlySpent,
    netMarginRate: profit?.netMarginRate ?? null,
    confidence: profit?.confidence ?? opts.product.confidence,
    supplierPriceIncreaseRate: 0,
    category: opts.product.category,
    supplierId: opts.product.supplier,
    riskDecision: risk.decision,
    humanApproved: opts.humanApproved,
  });
  if (!gate.allowed) {
    opts.repo.insertAudit({
      actor: "SAFETY_GATE",
      action: "LISTING_BLOCKED",
      entityType: "product",
      entityId: opts.product.id,
      summary: `판매등록 차단: ${gate.reasons.join(" / ")}`,
      detail: gate,
    });
    return { status: gate.decision, listingId: null, error: gate.reasons.join(" / "), blocked: true };
  }

  const payload = {
    title: opts.product.title,
    salePrice: opts.product.recommendedPriceKrw,
    content: opts.product.content,
    sourceProductId: opts.product.id,
    generatedAt: nowIso(),
  };

  const listed = await opts.marketplace.createListing(payload);
  const dbId = opts.repo.insertListing({
    productId: opts.product.id,
    marketplace: opts.marketplace.id,
    listingId: listed.listingId,
    status: listed.status === "READY" ? "SUBMITTED" : listed.status,
    payload,
    lastError: listed.error,
  });
  opts.repo.insertAudit({
    actor: "LISTING_ENGINE",
    action: listed.status === "READY" ? "LISTING_CREATED" : "LISTING_FAILED",
    entityType: "listing",
    entityId: dbId,
    summary:
      listed.status === "READY"
        ? `상품 ${opts.product.id} → ${opts.marketplace.label} 등록 ID ${listed.listingId}`
        : `${opts.marketplace.label} 등록 실패: ${listed.error}`,
    detail: { payload, result: listed },
  });
  return { status: listed.status, listingId: listed.listingId, error: listed.error };
}

export function recheckProfit(product: ProductRecord, sellingPrice: number): ProfitAnalysis {
  const prev = (product.profit ?? {}) as Partial<ProfitAnalysis>;
  return analyzeProfit({
    sellingPrice,
    productCost: product.supplierPriceKrw,
    internationalShipping: product.shippingKrw,
    domesticShipping: prev.domesticShipping ?? null,
    customsDuty: prev.customsDuty ?? null,
    vat: prev.vat ?? null,
    marketplaceFee: prev.marketplaceFee ?? null,
    paymentFee: prev.paymentFee ?? null,
    expectedAdCost: prev.expectedAdCost ?? null,
    promotionCost: prev.promotionCost ?? null,
    expectedReturnLoss: prev.expectedReturnLoss ?? null,
    fxBuffer: prev.fxBuffer ?? null,
    otherCost: prev.otherCost ?? null,
  });
}
