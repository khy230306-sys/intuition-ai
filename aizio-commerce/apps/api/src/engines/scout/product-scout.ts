import type { SupplierAdapter, SupplierProduct } from "../../adapters/suppliers/types.ts";
import type { Repository, ProductRecord } from "../../db/repository.ts";
import { analyzeProfit } from "../profit/profit-truth.ts";
import { assessRisk } from "../risk/risk-engine.ts";
import { decideProduct } from "../decision/decision-engine.ts";
import { createCurrencyService, type CurrencyQuote } from "../../adapters/fx/currency-service.ts";
import {
  extractInventoryTotal,
  extractVariantId,
  parseOfficialAgingMax,
  type CjDropshippingAdapter,
} from "../../adapters/suppliers/cjdropshipping.ts";
import { roundKrw, usdToKrw } from "../../shared/money.ts";
import { nowIso } from "../../shared/ids.ts";
import type { DataFreshness, ProductStatus, SafetySettings, ShippingAvailability } from "../../shared/types.ts";

export interface ScoutResult {
  status: string;
  found: number;
  saved: number;
  created: number;
  updated: number;
  skipped: number;
  error: string | null;
  stats: {
    analyzed: number;
    koreaShippable: number;
    riskExcluded: number;
    profitCalculable: number;
    recommended: number;
  };
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stableProductId(supplier: string, productId: string, variantId: string | null): string {
  const pid = productId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const vid = (variantId ?? "na").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `prd_${supplier}_${pid}_${vid}`;
}

function optionalNum(raw: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!raw) return null;
  for (const key of keys) {
    const v = raw[key];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function optionalStr(raw: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!raw) return null;
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function passesHardFilters(input: {
  identifiable: boolean;
  stock: number | null;
  supplierPrice: number | null;
  shippingCost: number | null;
  shippingAvailability: ShippingAvailability | null;
  riskDecision: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.identifiable) reasons.push("상품 식별 불가");
  if (input.stock === null || input.stock <= 0) reasons.push("재고 없음");
  if (input.supplierPrice === null) reasons.push("공급가 없음");
  if (input.shippingCost === null) reasons.push("배송비 없음");
  if (input.shippingAvailability !== "AVAILABLE") reasons.push("한국 배송 불가 또는 미확인");
  if (input.riskDecision === "BLOCK") reasons.push("Risk BLOCK");
  return { ok: reasons.length === 0, reasons };
}

export function passesConfigurableFilters(input: {
  supplierPrice: number | null;
  shippingCost: number | null;
  preliminaryMargin: number | null;
  deliveryDays: number | null;
  category: string | null;
  settings: SafetySettings["scout"];
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const s = input.settings;
  if (s.maxSupplierPrice !== null && input.supplierPrice !== null && input.supplierPrice > s.maxSupplierPrice) {
    reasons.push("공급가 상한 초과");
  }
  if (s.maxShippingCost !== null && input.shippingCost !== null && input.shippingCost > s.maxShippingCost) {
    reasons.push("배송비 상한 초과");
  }
  if (
    s.minPreliminaryMargin !== null &&
    input.preliminaryMargin !== null &&
    input.preliminaryMargin < s.minPreliminaryMargin
  ) {
    reasons.push("예비 마진 하한 미달");
  }
  if (s.maximumDeliveryDays !== null && input.deliveryDays !== null && input.deliveryDays > s.maximumDeliveryDays) {
    reasons.push("배송일 상한 초과");
  }
  const cat = (input.category ?? "").toLowerCase();
  if (s.allowedCategories.length > 0 && !s.allowedCategories.some((c) => cat.includes(c.toLowerCase()))) {
    reasons.push("허용 카테고리 아님");
  }
  if (s.blockedCategories.some((c) => cat.includes(c.toLowerCase()))) {
    reasons.push("차단 카테고리");
  }
  return { ok: reasons.length === 0, reasons };
}

async function quoteKorea(supplier: SupplierAdapter, vid: string) {
  const cj = supplier as CjDropshippingAdapter;
  if (typeof cj.quoteKoreaShipping === "function") {
    return cj.quoteKoreaShipping(vid);
  }
  const capturedAt = new Date().toISOString();
  const freight = await supplier.getFreight({
    startCountryCode: "CN",
    endCountryCode: "KR",
    vid,
    quantity: 1,
  });
  if (freight.status !== "READY") {
    return { availability: "UNKNOWN" as const, option: null, capturedAt, source: "logistic/freightCalculate" };
  }
  const priced = freight.options.filter((o) => o.priceUsd !== null);
  const best = priced.sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))[0] ?? null;
  return {
    availability: (best ? "AVAILABLE" : "UNAVAILABLE") as ShippingAvailability,
    option: best,
    capturedAt,
    source: "logistic/freightCalculate",
  };
}

/**
 * LIVE_OBSERVE Product Scout. READ APIs only. Does not invent prices, names, or KRW market prices.
 */
export async function scoutProducts(opts: {
  supplier: SupplierAdapter;
  repo: Repository;
  keyword?: string;
  settings?: SafetySettings;
  pauseMs?: number;
}): Promise<ScoutResult> {
  const settings = opts.settings ?? opts.repo.getSafetySettings();
  const scout = settings.scout;
  const emptyStats = { analyzed: 0, koreaShippable: 0, riskExcluded: 0, profitCalculable: 0, recommended: 0 };
  const status = await opts.supplier.getStatus();
  if (status !== "READY") {
    const error = status === "PENDING_SETUP" || status === "NOT_CONFIGURED" ? "공급처 연결 필요" : `${opts.supplier.label} — ${status}`;
    opts.repo.saveScoutRun({
      supplier: opts.supplier.id,
      keyword: opts.keyword ?? scout.keyword,
      ...emptyStats,
      skipped: 0,
      error,
    });
    return { status, found: 0, saved: 0, created: 0, updated: 0, skipped: 0, error, stats: emptyStats };
  }

  const limit = Math.min(Math.max(scout.limit, 1), 50);
  const keyword = opts.keyword ?? scout.keyword;
  const search = await opts.supplier.searchProducts({ keyword, page: 1, pageSize: limit });
  if (search.status !== "READY") {
    opts.repo.saveScoutRun({
      supplier: opts.supplier.id,
      keyword,
      ...emptyStats,
      skipped: 0,
      error: search.error,
    });
    return {
      status: search.status,
      found: 0,
      saved: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      error: search.error,
      stats: emptyStats,
    };
  }

  const currency = createCurrencyService(settings.fx);
  const fx = await currency.resolveUsdKrw();
  const fxQuote: CurrencyQuote | null = fx.ok ? fx.quote : null;
  const fxStatus = fx.ok ? fx.quote.status : "FX_RATE_NOT_CONFIGURED";
  const pauseMs = opts.pauseMs ?? 1100;

  let saved = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let koreaShippable = 0;
  let riskExcluded = 0;
  let profitCalculable = 0;
  let recommended = 0;

  for (const item of search.products) {
    await sleep(pauseMs);
    const row = await ingestOne({
      item,
      supplier: opts.supplier,
      repo: opts.repo,
      settings,
      fxQuote,
      fxStatus,
      fxError: fx.ok ? null : fx.error,
      pauseMs,
    });
    if (row.skipped) {
      skipped += 1;
      continue;
    }
    saved += 1;
    if (row.created) created += 1;
    else updated += 1;
    if (row.koreaShippable) koreaShippable += 1;
    if (row.riskExcluded) riskExcluded += 1;
    if (row.profitCalculable) profitCalculable += 1;
    if (row.recommended) recommended += 1;
  }

  const stats = {
    analyzed: saved,
    koreaShippable,
    riskExcluded,
    profitCalculable,
    recommended,
  };
  opts.repo.saveScoutRun({
    supplier: opts.supplier.id,
    keyword,
    ...stats,
    skipped,
    error: null,
    result: { found: search.products.length, created, updated },
  });

  return {
    status: "READY",
    found: search.products.length,
    saved,
    created,
    updated,
    skipped,
    error: null,
    stats,
  };
}

async function ingestOne(opts: {
  item: SupplierProduct;
  supplier: SupplierAdapter;
  repo: Repository;
  settings: SafetySettings;
  fxQuote: CurrencyQuote | null;
  fxStatus: "LIVE" | "MANUAL_RATE" | "FX_RATE_NOT_CONFIGURED";
  fxError: string | null;
  pauseMs: number;
}): Promise<{
  skipped: boolean;
  created: boolean;
  koreaShippable: boolean;
  riskExcluded: boolean;
  profitCalculable: boolean;
  recommended: boolean;
}> {
  const item = opts.item;
  if (!item.supplierProductId || !item.title) {
    return { skipped: true, created: false, koreaShippable: false, riskExcluded: false, profitCalculable: false, recommended: false };
  }

  let variantId = item.variantId;
  let priceUsd = item.priceUsd;
  let sku = item.sku;
  const warehouse = item.warehouse;
  const raw = item.raw && typeof item.raw === "object" ? (item.raw as Record<string, unknown>) : {};

  if (!variantId) {
    const variants = await opts.supplier.getVariants(item.supplierProductId);
    variantId = extractVariantId(variants.variants);
    if (!priceUsd && variants.variants && typeof variants.variants === "object") {
      const first = Array.isArray(variants.variants)
        ? (variants.variants[0] as Record<string, unknown> | undefined)
        : undefined;
      if (first) {
        const vPrice = Number(first.variantSellPrice ?? first.sellPrice ?? first.price);
        if (Number.isFinite(vPrice)) priceUsd = vPrice;
        if (!sku && first.variantSku) sku = String(first.variantSku);
      }
    }
    await sleep(opts.pauseMs);
  }

  let stock: number | null = null;
  let stockCapturedAt: string | null = null;
  if (variantId) {
    const stockRes = await opts.supplier.getStock({ vid: variantId });
    stock = extractInventoryTotal(stockRes.stock);
    stockCapturedAt = new Date().toISOString();
    await sleep(opts.pauseMs);
  }

  let shippingAvailability: ShippingAvailability = variantId ? "UNKNOWN" : "UNKNOWN";
  let shippingUsd: number | null = null;
  let shippingMethod: string | null = null;
  let aging: string | null = null;
  let shippingCapturedAt: string | null = null;
  let shippingSource = "CJ LOGISTIC API /logistic/freightCalculate";
  if (variantId) {
    const quote = await quoteKorea(opts.supplier, variantId);
    shippingAvailability = quote.availability;
    shippingUsd = quote.option?.priceUsd ?? null;
    shippingMethod = quote.option?.name ?? null;
    aging = quote.option?.aging ?? null;
    shippingCapturedAt = quote.capturedAt;
    shippingSource = quote.source;
  }

  const deliveryMax = parseOfficialAgingMax(aging);
  const deliveryMin = aging ? Number(aging.match(/\d+/)?.[0] ?? NaN) : null;
  const deliveryMinSafe = Number.isFinite(deliveryMin) ? deliveryMin : null;

  const fxQuote = opts.fxQuote;
  const productCostKrw = priceUsd !== null && fxQuote ? usdToKrw(priceUsd, fxQuote.rate) : null;
  const shippingKrw = shippingUsd !== null && fxQuote ? usdToKrw(shippingUsd, fxQuote.rate) : null;
  const targetMarginRate = opts.settings.targetMarginRate;
  const landed = productCostKrw !== null && shippingKrw !== null ? productCostKrw + shippingKrw : null;
  const targetMarginPriceKrw =
    landed !== null && targetMarginRate > 0 && targetMarginRate < 1
      ? roundKrw(landed / (1 - targetMarginRate))
      : null;
  const marketObservedPriceKrw = null;
  const sellingPriceKind = targetMarginPriceKrw !== null ? "TARGET_MARGIN_PRICE" : "NONE";
  const preliminaryMargin =
    targetMarginPriceKrw && landed !== null && targetMarginPriceKrw > 0
      ? (targetMarginPriceKrw - landed) / targetMarginPriceKrw
      : null;

  const profit = analyzeProfit({
    sellingPrice: targetMarginPriceKrw,
    productCost: productCostKrw,
    internationalShipping: shippingKrw,
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
    sellingPriceKind,
    fxStatus: opts.fxStatus,
    inputFreshness: {
      productCost: productCostKrw !== null ? "LIVE" : "INSUFFICIENT_DATA",
      internationalShipping: shippingKrw !== null ? "LIVE" : "INSUFFICIENT_DATA",
      sellingPrice: targetMarginPriceKrw !== null ? "ESTIMATE" : "INSUFFICIENT_DATA",
      marketplaceFee: "UNKNOWN",
      expectedAdCost: "UNKNOWN",
      expectedReturnLoss: "INSUFFICIENT_DATA",
      fxBuffer: opts.fxStatus === "FX_RATE_NOT_CONFIGURED" ? "INSUFFICIENT_DATA" : "UNKNOWN",
    },
  });

  const risk = assessRisk({
    title: item.title,
    category: item.category,
    keywords: [item.title, item.category ?? ""],
  });

  const hard = passesHardFilters({
    identifiable: Boolean(item.supplierProductId && item.title),
    stock,
    supplierPrice: priceUsd,
    shippingCost: shippingUsd,
    shippingAvailability,
    riskDecision: risk.decision,
  });
  const configurable = passesConfigurableFilters({
    supplierPrice: priceUsd,
    shippingCost: shippingUsd,
    preliminaryMargin,
    deliveryDays: deliveryMax,
    category: item.category,
    settings: opts.settings.scout,
  });
  const recommended = hard.ok && configurable.ok;

  const decision = decideProduct({
    profit,
    risk,
    competitionScore: null,
    supplyStability: null,
    deliveryDays: deliveryMax,
    expectedReturnRate: null,
    dataConfidence: profit.confidence,
  });

  let statusOut: ProductStatus = decision.status;
  if (stock !== null && stock <= 0) statusOut = "SOLD_OUT";
  else if (risk.decision === "BLOCK") statusOut = "BLOCKED";
  else if (recommended && decision.status === "TEST_SELL") statusOut = "TEST_SELL";
  else if (recommended) statusOut = decision.status === "REJECTED" ? "REVIEW_REQUIRED" : decision.status;
  else if (!hard.ok) statusOut = "DISCOVERED";

  const capturedAt = item.capturedAt ?? nowIso();
  const weight = optionalNum(raw, ["productWeight", "packWeight", "weight"]);
  const sourceUrl = optionalStr(raw, ["productUrl", "sourceUrl"]);
  const productId = stableProductId(opts.supplier.id, item.supplierProductId, variantId);

  const sourceFacts: Record<string, unknown> = {
    supplier: opts.supplier.id,
    supplierProductId: item.supplierProductId,
    supplierVariantId: variantId,
    sku: sku ?? null,
    name: item.title,
    category: item.category,
    currency: "USD",
    supplierPrice: priceUsd,
    inventory: stock,
    warehouse,
    weight,
    dimensions:
      optionalNum(raw, ["productLength"]) !== null
        ? {
            length: optionalNum(raw, ["productLength", "length"]),
            width: optionalNum(raw, ["productWidth", "width"]),
            height: optionalNum(raw, ["productHeight", "height"]),
          }
        : null,
    sourceUrl,
    capturedAt,
    rawSourceReference: {
      api: "CJ PRODUCT API",
      endpoint: "/product/listV2",
      docs: "https://developers.cjdropshipping.com/en/api/api2/api/product.html",
    },
    evidence: {
      product: {
        api: "CJ PRODUCT API",
        capturedAt: item.capturedAt,
        supplierProductId: item.supplierProductId,
        variantId,
      },
      shipping: variantId
        ? {
            api: "CJ LOGISTIC API",
            endpoint: "/logistic/freightCalculate",
            capturedAt: shippingCapturedAt,
            route: "CN→KR",
            method: shippingMethod,
            source: shippingSource,
          }
        : null,
      inventory: variantId
        ? {
            api: "CJ INVENTORY API",
            endpoint: "/product/stock/queryByVid",
            capturedAt: stockCapturedAt,
          }
        : null,
      fx: fxQuote
        ? {
            source: fxQuote.source,
            rate: fxQuote.rate,
            capturedAt: fxQuote.capturedAt,
            freshness: fxQuote.freshness,
            status: fxQuote.status,
          }
        : { status: "FX_RATE_NOT_CONFIGURED", error: opts.fxError },
    },
    filter: { hard: hard.reasons, configurable: configurable.reasons, recommended },
    operatingMode: opts.settings.operatingMode,
  };

  const record: ProductRecord = {
    id: productId,
    supplier: opts.supplier.id,
    supplierProductId: item.supplierProductId,
    supplierVariantId: variantId,
    title: item.title,
    status: statusOut,
    category: item.category,
    imageUrl: item.imageUrl,
    supplierPriceKrw: productCostKrw,
    supplierPriceUsd: priceUsd,
    currency: "USD",
    shippingKrw,
    shippingUsd,
    shippingAvailability,
    shippingMethod,
    recommendedPriceKrw: targetMarginPriceKrw,
    targetMarginPriceKrw,
    marketObservedPriceKrw,
    sellingPriceKind,
    profitStage: profit.stage,
    stock,
    warehouse,
    deliveryMin: deliveryMinSafe,
    deliveryMax,
    weight,
    sourceUrl,
    capturedAt,
    scoutCandidate: recommended,
    profit,
    risk,
    decision,
    market: {
      productId,
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
      freshness: "UNKNOWN" as DataFreshness,
      kind: "MARKET_OBSERVED_PRICE",
      note: "쿠팡/네이버 LIVE 시장가격이 연결되지 않았습니다. 시장 관측가격은 없습니다.",
    },
    content: null,
    sourceFacts,
    confidence: profit.confidence,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const upsert = opts.repo.upsertScoutProduct(record);
  opts.repo.insertTrace(upsert.product.id, decision.status, decision.reasons, decision.warnings, "PRODUCT_SCOUT");

  return {
    skipped: false,
    created: upsert.created,
    koreaShippable: shippingAvailability === "AVAILABLE",
    riskExcluded: risk.decision === "BLOCK",
    profitCalculable: targetMarginPriceKrw !== null && productCostKrw !== null && shippingKrw !== null,
    recommended,
  };
}
