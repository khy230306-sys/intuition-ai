import type { DbClient, SqlRow } from "./client.ts";
import type {
  JobStatus,
  JobType,
  ProductStatus,
  SafetySettings,
} from "../shared/types.ts";
import { DEFAULT_SAFETY_SETTINGS } from "../shared/types.ts";
import { parseSafetySettings } from "../shared/schemas.ts";
import { id, nowIso } from "../shared/ids.ts";

function str(row: SqlRow | undefined, key: string): string {
  const v = row?.[key];
  return v === null || v === undefined ? "" : String(v);
}
function num(row: SqlRow | undefined, key: string): number | null {
  const v = row?.[key];
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function json<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface ProductRecord {
  id: string;
  supplier: string;
  supplierProductId: string | null;
  title: string;
  status: ProductStatus;
  category: string | null;
  imageUrl: string | null;
  supplierPriceKrw: number | null;
  supplierPriceUsd: number | null;
  shippingKrw: number | null;
  recommendedPriceKrw: number | null;
  stock: number | null;
  warehouse: string | null;
  deliveryMin: number | null;
  deliveryMax: number | null;
  profit: unknown;
  risk: unknown;
  decision: unknown;
  market: unknown;
  content: unknown;
  sourceFacts: Record<string, unknown>;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export class Repository {
  constructor(private readonly db: DbClient) {}

  getSetting(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? str(row, "value") : null;
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings(key, value, updated_at) VALUES(?,?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      )
      .run(key, value, nowIso());
  }

  getSafetySettings(): SafetySettings {
    const raw = this.getSetting("safety");
    if (!raw) {
      this.setSetting("safety", JSON.stringify(DEFAULT_SAFETY_SETTINGS));
      return DEFAULT_SAFETY_SETTINGS;
    }
    return parseSafetySettings(JSON.parse(raw));
  }

  saveSafetySettings(settings: SafetySettings): void {
    this.setSetting("safety", JSON.stringify(settings));
  }

  upsertIntegration(row: {
    id: string;
    kind: string;
    name: string;
    status: string;
    lastSuccessAt: string | null;
    lastError: string | null;
    capabilities: unknown;
    docsUrl: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO integrations(id, kind, name, status, last_success_at, last_error, capabilities, docs_url)
         VALUES(?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           status=excluded.status,
           last_success_at=excluded.last_success_at,
           last_error=excluded.last_error,
           capabilities=excluded.capabilities`,
      )
      .run(
        row.id,
        row.kind,
        row.name,
        row.status,
        row.lastSuccessAt,
        row.lastError,
        JSON.stringify(row.capabilities),
        row.docsUrl,
      );
  }

  listIntegrations() {
    return this.db.prepare("SELECT * FROM integrations ORDER BY kind, name").all().map((row) => ({
      id: str(row, "id"),
      kind: str(row, "kind"),
      name: str(row, "name"),
      status: str(row, "status"),
      lastSuccessAt: row.last_success_at ? str(row, "last_success_at") : null,
      lastError: row.last_error ? str(row, "last_error") : null,
      capabilities: json(str(row, "capabilities"), {}),
      docsUrl: str(row, "docs_url"),
    }));
  }

  saveProduct(p: ProductRecord): void {
    this.db
      .prepare(
        `INSERT INTO products(
          id, supplier, supplier_product_id, title, status, category, image_url,
          supplier_price_krw, supplier_price_usd, shipping_krw, recommended_price_krw,
          stock, warehouse, delivery_min, delivery_max,
          profit_json, risk_json, decision_json, market_json, content_json, source_facts_json,
          confidence, created_at, updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, status=excluded.status, category=excluded.category,
          image_url=excluded.image_url, supplier_price_krw=excluded.supplier_price_krw,
          supplier_price_usd=excluded.supplier_price_usd, shipping_krw=excluded.shipping_krw,
          recommended_price_krw=excluded.recommended_price_krw, stock=excluded.stock,
          warehouse=excluded.warehouse, delivery_min=excluded.delivery_min,
          delivery_max=excluded.delivery_max, profit_json=excluded.profit_json,
          risk_json=excluded.risk_json, decision_json=excluded.decision_json,
          market_json=excluded.market_json, content_json=excluded.content_json,
          source_facts_json=excluded.source_facts_json, confidence=excluded.confidence,
          updated_at=excluded.updated_at`,
      )
      .run(
        p.id,
        p.supplier,
        p.supplierProductId,
        p.title,
        p.status,
        p.category,
        p.imageUrl,
        p.supplierPriceKrw,
        p.supplierPriceUsd,
        p.shippingKrw,
        p.recommendedPriceKrw,
        p.stock,
        p.warehouse,
        p.deliveryMin,
        p.deliveryMax,
        JSON.stringify(p.profit),
        JSON.stringify(p.risk),
        JSON.stringify(p.decision),
        JSON.stringify(p.market),
        JSON.stringify(p.content),
        JSON.stringify(p.sourceFacts),
        p.confidence,
        p.createdAt,
        p.updatedAt,
      );
  }

  mapProduct(row: SqlRow): ProductRecord {
    return {
      id: str(row, "id"),
      supplier: str(row, "supplier"),
      supplierProductId: row.supplier_product_id ? str(row, "supplier_product_id") : null,
      title: str(row, "title"),
      status: str(row, "status") as ProductStatus,
      category: row.category ? str(row, "category") : null,
      imageUrl: row.image_url ? str(row, "image_url") : null,
      supplierPriceKrw: num(row, "supplier_price_krw"),
      supplierPriceUsd: num(row, "supplier_price_usd"),
      shippingKrw: num(row, "shipping_krw"),
      recommendedPriceKrw: num(row, "recommended_price_krw"),
      stock: num(row, "stock"),
      warehouse: row.warehouse ? str(row, "warehouse") : null,
      deliveryMin: num(row, "delivery_min"),
      deliveryMax: num(row, "delivery_max"),
      profit: json(str(row, "profit_json"), null),
      risk: json(str(row, "risk_json"), null),
      decision: json(str(row, "decision_json"), null),
      market: json(str(row, "market_json"), null),
      content: json(str(row, "content_json"), null),
      sourceFacts: json(str(row, "source_facts_json"), {}),
      confidence: num(row, "confidence"),
      createdAt: str(row, "created_at"),
      updatedAt: str(row, "updated_at"),
    };
  }

  getProduct(idValue: string): ProductRecord | null {
    const row = this.db.prepare("SELECT * FROM products WHERE id = ?").get(idValue);
    return row ? this.mapProduct(row) : null;
  }

  listProducts(opts?: { status?: string; minMargin?: number; limit?: number }): ProductRecord[] {
    const limit = opts?.limit ?? 100;
    let rows: SqlRow[];
    if (opts?.status) {
      rows = this.db
        .prepare("SELECT * FROM products WHERE status = ? ORDER BY updated_at DESC LIMIT ?")
        .all(opts.status, limit);
    } else {
      rows = this.db.prepare("SELECT * FROM products ORDER BY updated_at DESC LIMIT ?").all(limit);
    }
    return rows.map((r) => this.mapProduct(r));
  }

  countProducts(where?: string, params: Array<string | number> = []): number {
    const sql = where
      ? `SELECT COUNT(*) AS c FROM products WHERE ${where}`
      : "SELECT COUNT(*) AS c FROM products";
    const row = this.db.prepare(sql).get(...params);
    return Number(row?.c ?? 0);
  }

  countOrdersToday(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS c FROM orders WHERE created_at >= date('now')")
      .get();
    return Number(row?.c ?? 0);
  }

  insertAudit(entry: {
    actor: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    detail?: unknown;
  }): void {
    this.db
      .prepare(
        `INSERT INTO audit_logs(id, at, actor, action, entity_type, entity_id, summary, detail_json)
         VALUES(?,?,?,?,?,?,?,?)`,
      )
      .run(
        id("aud"),
        nowIso(),
        entry.actor,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.summary,
        JSON.stringify(entry.detail ?? {}),
      );
  }

  listAudit(limit = 100) {
    return this.db
      .prepare("SELECT * FROM audit_logs ORDER BY at DESC LIMIT ?")
      .all(limit)
      .map((row) => ({
        id: str(row, "id"),
        at: str(row, "at"),
        actor: str(row, "actor"),
        action: str(row, "action"),
        entityType: str(row, "entity_type"),
        entityId: row.entity_id ? str(row, "entity_id") : null,
        summary: str(row, "summary"),
        detail: json(str(row, "detail_json"), {}),
      }));
  }

  insertTrace(productId: string | null, decision: string, reasons: string[], warnings: string[], actor: string) {
    this.db
      .prepare(
        `INSERT INTO decision_traces(id, product_id, decision, reasons_json, warnings_json, actor, created_at)
         VALUES(?,?,?,?,?,?,?)`,
      )
      .run(id("trc"), productId, decision, JSON.stringify(reasons), JSON.stringify(warnings), actor, nowIso());
  }

  enqueueJob(type: JobType, payload: unknown, runAfter?: string): string {
    const jobId = id("job");
    this.db
      .prepare(
        `INSERT INTO jobs(id, type, status, payload_json, attempts, run_after, created_at, updated_at)
         VALUES(?,?,?,?,?,?,?,?)`,
      )
      .run(jobId, type, "QUEUED", JSON.stringify(payload), 0, runAfter ?? nowIso(), nowIso(), nowIso());
    return jobId;
  }

  listJobs(limit = 50) {
    return this.db
      .prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?")
      .all(limit)
      .map((row) => ({
        id: str(row, "id"),
        type: str(row, "type"),
        status: str(row, "status") as JobStatus,
        payload: json(str(row, "payload_json"), {}),
        result: json(str(row, "result_json"), null),
        error: row.error ? str(row, "error") : null,
        attempts: Number(row.attempts ?? 0),
        createdAt: str(row, "created_at"),
        updatedAt: str(row, "updated_at"),
      }));
  }

  claimNextJob(): SqlRow | undefined {
    const row = this.db
      .prepare(
        `SELECT * FROM jobs
         WHERE status IN ('QUEUED','RETRYING') AND (run_after IS NULL OR run_after <= ?)
         ORDER BY created_at ASC LIMIT 1`,
      )
      .get(nowIso());
    if (!row) return undefined;
    this.db
      .prepare("UPDATE jobs SET status='RUNNING', updated_at=? WHERE id=?")
      .run(nowIso(), str(row, "id"));
    return row;
  }

  finishJob(jobId: string, status: JobStatus, result?: unknown, error?: string, runAfter?: string): void {
    this.db
      .prepare(
        `UPDATE jobs SET status=?, result_json=?, error=?, run_after=?, updated_at=?,
         attempts = attempts + CASE WHEN ? IN ('FAILED','RETRYING','SUCCESS','BLOCKED') THEN 1 ELSE 0 END
         WHERE id=?`,
      )
      .run(status, result ? JSON.stringify(result) : null, error ?? null, runAfter ?? null, nowIso(), status, jobId);
  }

  spendBetween(fromIso: string, toIso: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(SUM(amount_krw),0) AS s FROM spend_ledger WHERE at >= ? AND at < ?")
      .get(fromIso, toIso);
    return Number(row?.s ?? 0);
  }

  addSpend(kind: string, amount: number, meta: unknown = {}): void {
    this.db
      .prepare("INSERT INTO spend_ledger(id, kind, amount_krw, at, meta_json) VALUES(?,?,?,?,?)")
      .run(id("spd"), kind, amount, nowIso(), JSON.stringify(meta));
  }

  insertOrder(order: {
    id: string;
    marketplace: string;
    marketplaceOrderId: string;
    productId: string | null;
    variantId: string | null;
    quantity: number;
    saleAmount: number;
    shipping: { ciphertext: string; iv: string; tag: string };
    orderStatus: string;
    fulfillmentStatus: string;
    supplierOrderId?: string | null;
    createdAt: string;
  }): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO orders(
          id, marketplace, marketplace_order_id, product_id, variant_id, quantity, sale_amount,
          shipping_ciphertext, shipping_iv, shipping_tag, order_status, fulfillment_status,
          supplier_order_id, created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        order.id,
        order.marketplace,
        order.marketplaceOrderId,
        order.productId,
        order.variantId,
        order.quantity,
        order.saleAmount,
        order.shipping.ciphertext,
        order.shipping.iv,
        order.shipping.tag,
        order.orderStatus,
        order.fulfillmentStatus,
        order.supplierOrderId ?? null,
        order.createdAt,
      );
  }

  listOrders(limit = 100) {
    return this.db
      .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?")
      .all(limit)
      .map((row) => ({
        id: str(row, "id"),
        marketplace: str(row, "marketplace"),
        marketplaceOrderId: str(row, "marketplace_order_id"),
        productId: row.product_id ? str(row, "product_id") : null,
        variantId: row.variant_id ? str(row, "variant_id") : null,
        quantity: Number(row.quantity),
        saleAmount: Number(row.sale_amount),
        orderStatus: str(row, "order_status"),
        fulfillmentStatus: str(row, "fulfillment_status"),
        supplierOrderId: row.supplier_order_id ? str(row, "supplier_order_id") : null,
        createdAt: str(row, "created_at"),
        shippingEncrypted: true,
      }));
  }

  getOrder(idValue: string) {
    const row = this.db.prepare("SELECT * FROM orders WHERE id = ?").get(idValue);
    if (!row) return null;
    return {
      id: str(row, "id"),
      marketplace: str(row, "marketplace"),
      marketplaceOrderId: str(row, "marketplace_order_id"),
      productId: row.product_id ? str(row, "product_id") : null,
      variantId: row.variant_id ? str(row, "variant_id") : null,
      quantity: Number(row.quantity),
      saleAmount: Number(row.sale_amount),
      orderStatus: str(row, "order_status"),
      fulfillmentStatus: str(row, "fulfillment_status"),
      supplierOrderId: row.supplier_order_id ? str(row, "supplier_order_id") : null,
      createdAt: str(row, "created_at"),
      shipping: {
        ciphertext: str(row, "shipping_ciphertext"),
        iv: str(row, "shipping_iv"),
        tag: str(row, "shipping_tag"),
        keyVersion: "v1",
      },
    };
  }

  saveSettlement(s: {
    orderId: string;
    expectedNetProfit: number | null;
    actualProductCost: number | null;
    actualShipping: number | null;
    actualFee: number | null;
    actualAds: number | null;
    actualRefund: number | null;
    actualReturnLoss: number | null;
    actualSettlement: number | null;
    actualNetProfit: number | null;
  }): void {
    const err =
      s.expectedNetProfit !== null && s.actualNetProfit !== null
        ? s.actualNetProfit - s.expectedNetProfit
        : null;
    this.db
      .prepare(
        `INSERT INTO settlements(
          id, order_id, expected_net_profit, actual_product_cost, actual_shipping, actual_fee,
          actual_ads, actual_refund, actual_return_loss, actual_settlement, actual_net_profit,
          profit_prediction_error, created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id("stl"),
        s.orderId,
        s.expectedNetProfit,
        s.actualProductCost,
        s.actualShipping,
        s.actualFee,
        s.actualAds,
        s.actualRefund,
        s.actualReturnLoss,
        s.actualSettlement,
        s.actualNetProfit,
        err,
        nowIso(),
      );
  }

  profitTotals() {
    const expected = this.db
      .prepare(
        `SELECT COALESCE(SUM(json_extract(profit_json,'$.expectedNetProfit')),0) AS s
         FROM products WHERE json_extract(profit_json,'$.expectedNetProfit') IS NOT NULL
           AND status IN ('TEST_SELL','APPROVED','LISTING_READY','LIVE')`,
      )
      .get();
    const actual = this.db
      .prepare("SELECT COALESCE(SUM(actual_net_profit),0) AS s FROM settlements WHERE actual_net_profit IS NOT NULL")
      .get();
    return {
      expectedNetProfit: Number(expected?.s ?? 0),
      actualNetProfit: Number(actual?.s ?? 0),
    };
  }

  insertListing(row: {
    productId: string;
    marketplace: string;
    listingId: string | null;
    status: string;
    payload: unknown;
    lastError: string | null;
  }): string {
    const listingId = id("lst");
    this.db
      .prepare(
        `INSERT INTO listings(id, product_id, marketplace, listing_id, status, payload_json, last_error, created_at, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        listingId,
        row.productId,
        row.marketplace,
        row.listingId,
        row.status,
        JSON.stringify(row.payload),
        row.lastError,
        nowIso(),
        nowIso(),
      );
    return listingId;
  }

  insertReturn(row: {
    orderId: string;
    marketplace: string;
    reason: string | null;
    status: string;
    classification: string | null;
    humanReviewRequired: boolean;
  }): string {
    const rid = id("ret");
    this.db
      .prepare(
        `INSERT INTO returns(id, order_id, marketplace, reason, status, classification, human_review_required, created_at)
         VALUES(?,?,?,?,?,?,?,?)`,
      )
      .run(
        rid,
        row.orderId,
        row.marketplace,
        row.reason,
        row.status,
        row.classification,
        row.humanReviewRequired ? 1 : 0,
        nowIso(),
      );
    return rid;
  }

  insertCsDraft(row: {
    orderId: string | null;
    marketplace: string | null;
    inquiryId: string | null;
    draft: string;
    status: string;
    riskLevel: string;
  }): string {
    const cid = id("cs");
    this.db
      .prepare(
        `INSERT INTO cs_drafts(id, order_id, marketplace, inquiry_id, draft, status, risk_level, created_at)
         VALUES(?,?,?,?,?,?,?,?)`,
      )
      .run(cid, row.orderId, row.marketplace, row.inquiryId, row.draft, row.status, row.riskLevel, nowIso());
    return cid;
  }

  listCsDrafts(limit = 50) {
    return this.db
      .prepare("SELECT * FROM cs_drafts ORDER BY created_at DESC LIMIT ?")
      .all(limit)
      .map((row) => ({
        id: str(row, "id"),
        orderId: row.order_id ? str(row, "order_id") : null,
        draft: str(row, "draft"),
        status: str(row, "status"),
        riskLevel: str(row, "risk_level"),
        createdAt: str(row, "created_at"),
      }));
  }

  saveLearning(row: Record<string, unknown>): void {
    this.db
      .prepare(
        `INSERT INTO learning_metrics(
          id, product_id, impressions, clicks, ctr, conversion, orders, cancellations, returns,
          complaints, ad_spend, revenue, actual_net_profit, stockouts, delivery_days, rating,
          review_sentiment, ai_recommendation, actual_outcome, captured_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id("lrn"),
        String(row.productId ?? ""),
        (row.impressions as number | null) ?? null,
        (row.clicks as number | null) ?? null,
        (row.ctr as number | null) ?? null,
        (row.conversion as number | null) ?? null,
        (row.orders as number | null) ?? null,
        (row.cancellations as number | null) ?? null,
        (row.returns as number | null) ?? null,
        (row.complaints as number | null) ?? null,
        (row.adSpend as number | null) ?? null,
        (row.revenue as number | null) ?? null,
        (row.actualNetProfit as number | null) ?? null,
        (row.stockouts as number | null) ?? null,
        (row.deliveryDays as number | null) ?? null,
        (row.rating as number | null) ?? null,
        (row.reviewSentiment as string | null) ?? null,
        (row.aiRecommendation as string | null) ?? null,
        (row.actualOutcome as string | null) ?? null,
        nowIso(),
      );
  }
}
