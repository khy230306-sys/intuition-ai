import type { SupplierAdapter } from "../../adapters/suppliers/types.ts";
import type { Repository } from "../../db/repository.ts";
import { analyzeProfit, feeFromRate } from "../profit/profit-truth.ts";
import { assessRisk } from "../risk/risk-engine.ts";
import { decideProduct } from "../decision/decision-engine.ts";
import { fetchUsdKrw } from "../../adapters/fx/frankfurter.ts";
import { usdToKrw } from "../../shared/money.ts";
import { id, nowIso } from "../../shared/ids.ts";
import type { DataFreshness, ProductStatus } from "../../shared/types.ts";

export async function scoutProducts(opts: {
  supplier: SupplierAdapter;
  repo: Repository;
  keyword?: string;
  marketplaceFeeRate: number | null;
}): Promise<{ status: string; found: number; saved: number; error: string | null }> {
  const status = await opts.supplier.getStatus();
  if (status !== "READY") {
    return { status, found: 0, saved: 0, error: `${opts.supplier.label} — ${status}` };
  }
  const search = await opts.supplier.searchProducts({
    keyword: opts.keyword,
    page: 1,
    pageSize: 20,
  });
  if (search.status !== "READY") {
    return { status: search.status, found: 0, saved: 0, error: search.error };
  }

  const fx = await fetchUsdKrw();
  const fxRate = fx.ok ? fx.quote.rate : null;
  const fxFreshness: DataFreshness = fx.ok ? "LIVE" : "UNKNOWN";
  let saved = 0;

  for (const item of search.products) {
    if (!item.supplierProductId) continue;
    const existingId = `prd_${opts.supplier.id}_${item.supplierProductId}`;
    const productCostKrw =
      item.priceUsd !== null && fxRate !== null ? usdToKrw(item.priceUsd, fxRate) : null;
    const shippingKrw = null;
    const sellingPrice =
      productCostKrw !== null ? Math.round(productCostKrw / 0.65) : null;
    const marketplaceFee = sellingPrice !== null ? feeFromRate(sellingPrice, opts.marketplaceFeeRate) : null;
    const fxBuffer =
      productCostKrw !== null ? Math.round(productCostKrw * 0.03) : null;

    const profit = analyzeProfit({
      sellingPrice,
      productCost: productCostKrw,
      internationalShipping: shippingKrw,
      domesticShipping: null,
      customsDuty: null,
      vat: sellingPrice !== null ? Math.round(sellingPrice * 10 / 110) : null,
      marketplaceFee,
      paymentFee: sellingPrice !== null ? Math.round(sellingPrice * 0.033) : null,
      expectedAdCost: null,
      promotionCost: 0,
      expectedReturnLoss: null,
      fxBuffer,
      otherCost: 0,
      inputFreshness: {
        productCost: productCostKrw !== null ? "LIVE" : "INSUFFICIENT_DATA",
        sellingPrice: sellingPrice !== null ? "ESTIMATE" : "INSUFFICIENT_DATA",
        vat: sellingPrice !== null ? "ESTIMATE" : "INSUFFICIENT_DATA",
        paymentFee: sellingPrice !== null ? "ESTIMATE" : "INSUFFICIENT_DATA",
        marketplaceFee: marketplaceFee !== null ? "ESTIMATE" : "INSUFFICIENT_DATA",
        fxBuffer: fxBuffer !== null ? "ESTIMATE" : "INSUFFICIENT_DATA",
        internationalShipping: "INSUFFICIENT_DATA",
        promotionCost: "LIVE",
        otherCost: "LIVE",
      },
    });

    const risk = assessRisk({
      title: item.title,
      category: item.category,
      keywords: [item.title],
    });

    const decision = decideProduct({
      profit,
      risk,
      competitionScore: null,
      supplyStability: null,
      deliveryDays: null,
      expectedReturnRate: null,
      dataConfidence: profit.confidence,
    });

    const statusOut: ProductStatus = decision.status === "TEST_SELL" ? "TEST_SELL" : decision.status;
    opts.repo.saveProduct({
      id: existingId || id("prd"),
      supplier: opts.supplier.id,
      supplierProductId: item.supplierProductId,
      title: item.title,
      status: statusOut,
      category: item.category,
      imageUrl: item.imageUrl,
      supplierPriceKrw: productCostKrw,
      supplierPriceUsd: item.priceUsd,
      shippingKrw,
      recommendedPriceKrw: sellingPrice,
      stock: null,
      warehouse: item.warehouse,
      deliveryMin: null,
      deliveryMax: null,
      profit,
      risk,
      decision,
      market: {
        productId: existingId,
        channel: "UNKNOWN",
        observedPrices: [],
        medianPrice: null,
        minPrice: null,
        maxPrice: null,
        competitorCount: null,
        demandSignals: [],
        confidence: 0,
        capturedAt: nowIso(),
        source: "NONE",
        freshness: "UNKNOWN",
      },
      content: null,
      sourceFacts: {
        supplier: opts.supplier.id,
        supplierProductId: item.supplierProductId,
        title: item.title,
        priceUsd: item.priceUsd,
        capturedAt: item.capturedAt,
        fxRate,
        fxSource: fx.ok ? fx.quote.source : null,
        fxFreshness,
      },
      confidence: profit.confidence,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    opts.repo.insertTrace(existingId, decision.status, decision.reasons, decision.warnings, "PRODUCT_SCOUT");
    saved += 1;
  }

  return { status: "READY", found: search.products.length, saved, error: null };
}
