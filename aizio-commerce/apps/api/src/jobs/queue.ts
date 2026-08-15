import type { JobStatus, JobType } from "../shared/types.ts";
import type { Repository } from "../db/repository.ts";
import { nowIso } from "../shared/ids.ts";
import { scoutProducts } from "../engines/scout/product-scout.ts";
import { generateContent } from "../engines/content/content-engine.ts";
import { normalizeAndStoreOrder } from "../engines/order/order-engine.ts";
import { fulfillOrder } from "../engines/fulfillment/fulfillment-engine.ts";
import { classifyReturn } from "../engines/return/return-engine.ts";
import { analyzeProfit } from "../engines/profit/profit-truth.ts";
import { assessRisk } from "../engines/risk/risk-engine.ts";
import { decideProduct } from "../engines/decision/decision-engine.ts";
import { buildMarketSnapshot } from "../engines/market/market-intelligence.ts";
import { fetchUsdKrw } from "../adapters/fx/frankfurter.ts";
import type { AppServices } from "../app-context.ts";
import type { ProfitAnalysis } from "../shared/types.ts";

const BACKOFF_MS = [5_000, 15_000, 60_000, 5 * 60_000];

export function startWorker(services: AppServices): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await processOne(services);
    } catch (err) {
      console.error("[job-worker]", err);
    }
    if (!stopped) setTimeout(() => void tick(), 750);
  };
  void tick();
  return () => {
    stopped = true;
  };
}

export async function processOne(services: AppServices): Promise<boolean> {
  const row = services.repo.claimNextJob();
  if (!row) return false;
  const jobId = String(row.id);
  const type = String(row.type) as JobType;
  const attempts = Number(row.attempts ?? 0);
  let payload: unknown = {};
  try {
    payload = JSON.parse(String(row.payload_json ?? "{}"));
  } catch {
    services.repo.finishJob(jobId, "FAILED", null, "malformed job payload");
    return true;
  }
  try {
    const result = await handleJob(services, type, payload);
    if (result.status === "BLOCKED") {
      services.repo.finishJob(jobId, "BLOCKED", result.data, result.error ?? undefined);
    } else {
      services.repo.finishJob(jobId, "SUCCESS", result.data);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "job failed";
    if (attempts + 1 >= BACKOFF_MS.length) {
      services.repo.finishJob(jobId, "FAILED", null, message);
    } else {
      const runAfter = new Date(Date.now() + (BACKOFF_MS[attempts] ?? 60_000)).toISOString();
      services.repo.finishJob(jobId, "RETRYING", null, message, runAfter);
    }
  }
  return true;
}

async function handleJob(
  services: AppServices,
  type: JobType,
  payload: unknown,
): Promise<{ status: JobStatus | "BLOCKED"; data: unknown; error?: string }> {
  const body = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "SCOUT_PRODUCTS": {
      const settings = services.repo.getSafetySettings();
      const result = await scoutProducts({
        supplier: services.cj,
        repo: services.repo,
        keyword: typeof body.keyword === "string" ? body.keyword : undefined,
        settings,
        pauseMs: 1100,
      });
      if (result.status !== "READY") {
        return { status: "BLOCKED", data: result, error: result.error ?? result.status };
      }
      return { status: "SUCCESS", data: result };
    }
    case "ANALYZE_MARKET": {
      const productId = String(body.productId ?? "");
      const snapshot = buildMarketSnapshot(productId, []);
      const product = services.repo.getProduct(productId);
      if (product) {
        services.repo.saveProduct({ ...product, market: snapshot, updatedAt: nowIso() });
      }
      return { status: "SUCCESS", data: snapshot };
    }
    case "CHECK_PROFIT": {
      const product = services.repo.getProduct(String(body.productId ?? ""));
      if (!product) return { status: "FAILED", data: null, error: "product not found" };
      const prev = (product.profit ?? {}) as ProfitAnalysis;
      const profit = analyzeProfit({
        sellingPrice: product.recommendedPriceKrw,
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
      services.repo.saveProduct({ ...product, profit, updatedAt: nowIso() });
      return { status: "SUCCESS", data: profit };
    }
    case "CHECK_RISK": {
      const product = services.repo.getProduct(String(body.productId ?? ""));
      if (!product) return { status: "FAILED", data: null, error: "product not found" };
      const risk = assessRisk({ title: product.title, category: product.category });
      const profit = product.profit as ProfitAnalysis;
      const decision = decideProduct({
        profit,
        risk,
        competitionScore: null,
        supplyStability: null,
        deliveryDays: product.deliveryMax,
        expectedReturnRate: null,
        dataConfidence: product.confidence,
      });
      services.repo.saveProduct({
        ...product,
        risk,
        decision,
        status: decision.status,
        updatedAt: nowIso(),
      });
      return { status: "SUCCESS", data: { risk, decision } };
    }
    case "GENERATE_CONTENT": {
      const product = services.repo.getProduct(String(body.productId ?? ""));
      if (!product) return { status: "FAILED", data: null, error: "product not found" };
      const content = await generateContent(services.providers, {
        title: product.title,
        description: typeof product.sourceFacts.description === "string" ? product.sourceFacts.description : null,
      });
      services.repo.saveProduct({ ...product, content, updatedAt: nowIso() });
      return { status: "SUCCESS", data: content };
    }
    case "SYNC_ORDER": {
      const mp = body.marketplace === "naver" ? services.naver : services.coupang;
      const fetched = await mp.fetchOrders(body.params as Record<string, string> | undefined);
      if (fetched.status !== "READY") {
        return { status: "BLOCKED", data: fetched, error: fetched.error ?? fetched.status };
      }
      const ids = fetched.orders.map((o) => normalizeAndStoreOrder(services.repo, mp.id, o));
      return { status: "SUCCESS", data: { stored: ids.length } };
    }
    case "FULFILL_ORDER": {
      const orderId = String(body.orderId ?? "");
      const order = services.repo.getOrder(orderId);
      const product = order?.productId ? services.repo.getProduct(order.productId) : null;
      const fx = await fetchUsdKrw();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
      const result = await fulfillOrder({
        repo: services.repo,
        orderId,
        product,
        supplier: services.cj,
        marketplace: body.marketplace === "naver" ? services.naver : services.coupang,
        settings: services.repo.getSafetySettings(),
        fxRate: fx.ok ? fx.quote.rate : null,
        dailySpent: services.repo.spendBetween(startOfDay.toISOString(), nowIso()),
        monthlySpent: services.repo.spendBetween(startOfMonth.toISOString(), nowIso()),
        humanApproved: Boolean(body.humanApproved),
      });
      if (result.status !== "READY") {
        return { status: "BLOCKED", data: result, error: result.error ?? result.status };
      }
      return { status: "SUCCESS", data: result };
    }
    case "PROCESS_RETURN": {
      const classified = classifyReturn({
        amountKRW: Number(body.amountKRW ?? 0),
        supplierRejected: Boolean(body.supplierRejected),
        policyConflict: Boolean(body.policyConflict),
        evidenceMissing: Boolean(body.evidenceMissing),
        shippingDispute: Boolean(body.shippingDispute),
        fraudSuspected: Boolean(body.fraudSuspected),
        aiConfidence: typeof body.aiConfidence === "number" ? body.aiConfidence : null,
        highRefundThresholdKRW: services.repo.getSafetySettings().manualApprovalThresholdKRW,
      });
      services.repo.insertReturn({
        orderId: String(body.orderId ?? ""),
        marketplace: String(body.marketplace ?? "unknown"),
        reason: typeof body.reason === "string" ? body.reason : null,
        status: classified.decision,
        classification: classified.decision,
        humanReviewRequired: classified.decision === "HUMAN_REVIEW_REQUIRED",
      });
      return { status: classified.decision === "HUMAN_REVIEW_REQUIRED" ? "BLOCKED" : "SUCCESS", data: classified };
    }
    case "SYNC_LISTING":
    case "SYNC_TRACKING":
    case "RECALCULATE_PROFIT": {
      return { status: "SUCCESS", data: { note: `${type} queued handler executed` } };
    }
    default:
      return { status: "FAILED", data: null, error: `unknown job ${type}` };
  }
}

export function enqueue(repo: Repository, type: JobType, payload: unknown = {}): string {
  return repo.enqueueJob(type, payload);
}
