import type { Repository, ProductRecord } from "../../db/repository.ts";
import type { SupplierAdapter } from "../../adapters/suppliers/types.ts";
import type { MarketplaceAdapter } from "../../adapters/marketplaces/types.ts";
import { evaluateSafetyGate } from "../safety/safety-gate.ts";
import { analyzeProfit } from "../profit/profit-truth.ts";
import { usdToKrw } from "../../shared/money.ts";
import type { ProfitAnalysis, SafetySettings } from "../../shared/types.ts";

export async function fulfillOrder(opts: {
  repo: Repository;
  orderId: string;
  product: ProductRecord | null;
  supplier: SupplierAdapter;
  marketplace: MarketplaceAdapter;
  settings: SafetySettings;
  fxRate: number | null;
  dailySpent: number;
  monthlySpent: number;
  humanApproved: boolean;
}): Promise<{ status: string; error: string | null; code?: string }> {
  const order = opts.repo.getOrder(opts.orderId);
  if (!order) return { status: "FAILED", error: "주문을 찾을 수 없습니다." };
  if (!opts.product?.supplierProductId) {
    return { status: "BLOCKED", error: "연결된 공급 상품이 없습니다." };
  }

  const live = await opts.supplier.getProduct(opts.product.supplierProductId);
  if (live.status !== "READY" || !live.product) {
    return { status: live.status, error: live.error ?? "공급 상품 재조회 실패" };
  }
  if (live.product.priceUsd === null || opts.fxRate === null) {
    return { status: "UNAVAILABLE", error: "원가 또는 환율 재조회 실패" };
  }
  const newCost = usdToKrw(live.product.priceUsd, opts.fxRate);
  const oldCost = opts.product.supplierPriceKrw;
  const increase = oldCost && oldCost > 0 ? (newCost - oldCost) / oldCost : 0;

  const profit = analyzeProfit({
    sellingPrice: order.saleAmount,
    productCost: newCost,
    internationalShipping: opts.product.shippingKrw,
    domesticShipping: (opts.product.profit as ProfitAnalysis | null)?.domesticShipping ?? null,
    customsDuty: (opts.product.profit as ProfitAnalysis | null)?.customsDuty ?? null,
    vat: (opts.product.profit as ProfitAnalysis | null)?.vat ?? null,
    marketplaceFee: (opts.product.profit as ProfitAnalysis | null)?.marketplaceFee ?? null,
    paymentFee: (opts.product.profit as ProfitAnalysis | null)?.paymentFee ?? null,
    expectedAdCost: (opts.product.profit as ProfitAnalysis | null)?.expectedAdCost ?? null,
    promotionCost: (opts.product.profit as ProfitAnalysis | null)?.promotionCost ?? 0,
    expectedReturnLoss: (opts.product.profit as ProfitAnalysis | null)?.expectedReturnLoss ?? null,
    fxBuffer: (opts.product.profit as ProfitAnalysis | null)?.fxBuffer ?? null,
    otherCost: (opts.product.profit as ProfitAnalysis | null)?.otherCost ?? 0,
  });

  const gate = evaluateSafetyGate(opts.settings, {
    action: "SUPPLIER_ORDER",
    amountKRW: newCost * order.quantity,
    dailySpentKRW: opts.dailySpent,
    monthlySpentKRW: opts.monthlySpent,
    netMarginRate: profit.netMarginRate,
    confidence: profit.confidence,
    supplierPriceIncreaseRate: increase,
    category: opts.product.category,
    supplierId: opts.product.supplier,
    humanApproved: opts.humanApproved,
  });

  if (!gate.allowed) {
    opts.repo.insertAudit({
      actor: "FULFILLMENT_ENGINE",
      action: "AUTO_FULFILLMENT_BLOCKED",
      entityType: "order",
      entityId: order.id,
      summary: `Order ${order.id} Auto fulfillment blocked. Reason: ${gate.reasons.join(" / ")}`,
      detail: { gate, oldCost, newCost, increase },
    });
    return { status: gate.decision, error: gate.reasons.join(" / "), code: gate.code };
  }

  const created = await opts.supplier.createOrder({
    orderNumber: order.marketplaceOrderId,
    products: [{ vid: live.product.variantId, quantity: order.quantity }],
  });
  if (created.status !== "READY") {
    return { status: created.status, error: created.error };
  }
  opts.repo.addSpend("supplier_order", newCost * order.quantity, { orderId: order.id });
  opts.repo.insertAudit({
    actor: "FULFILLMENT_ENGINE",
    action: "SUPPLIER_ORDER_CREATED",
    entityType: "order",
    entityId: order.id,
    summary: `공급처 발주 요청 완료 (주문 ${order.id})`,
  });
  return { status: "READY", error: null };
}
