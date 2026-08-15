import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type SqlValue = string | number | bigint | null | Uint8Array;
export type SqlRow = Record<string, SqlValue>;

export interface Statement {
  run(...params: SqlValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: SqlValue[]): SqlRow | undefined;
  all(...params: SqlValue[]): SqlRow[];
}

export interface DbClient {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}

class NodeSqliteClient implements DbClient {
  constructor(private readonly db: DatabaseSync) {}

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): Statement {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params) => stmt.run(...params),
      get: (...params) => stmt.get(...params) as SqlRow | undefined,
      all: (...params) => stmt.all(...params) as SqlRow[],
    };
  }

  close(): void {
    this.db.close();
  }
}

export function openSqlite(path: string): DbClient {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return new NodeSqliteClient(db);
}

export function migrate(db: DbClient): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS secrets (
      key TEXT PRIMARY KEY,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      tag TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      last_success_at TEXT,
      last_error TEXT,
      capabilities TEXT NOT NULL,
      docs_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      supplier TEXT NOT NULL,
      supplier_product_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      category TEXT,
      image_url TEXT,
      supplier_price_krw INTEGER,
      supplier_price_usd REAL,
      shipping_krw INTEGER,
      recommended_price_krw INTEGER,
      stock INTEGER,
      warehouse TEXT,
      delivery_min INTEGER,
      delivery_max INTEGER,
      profit_json TEXT,
      risk_json TEXT,
      decision_json TEXT,
      market_json TEXT,
      content_json TEXT,
      source_facts_json TEXT NOT NULL DEFAULT '{}',
      confidence REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      listing_id TEXT,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      marketplace TEXT NOT NULL,
      marketplace_order_id TEXT NOT NULL,
      product_id TEXT,
      variant_id TEXT,
      quantity INTEGER NOT NULL,
      sale_amount INTEGER NOT NULL,
      shipping_ciphertext TEXT NOT NULL,
      shipping_iv TEXT NOT NULL,
      shipping_tag TEXT NOT NULL,
      order_status TEXT NOT NULL,
      fulfillment_status TEXT NOT NULL,
      supplier_order_id TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(marketplace, marketplace_order_id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      expected_net_profit INTEGER,
      actual_product_cost INTEGER,
      actual_shipping INTEGER,
      actual_fee INTEGER,
      actual_ads INTEGER,
      actual_refund INTEGER,
      actual_return_loss INTEGER,
      actual_settlement INTEGER,
      actual_net_profit INTEGER,
      profit_prediction_error INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,
      classification TEXT,
      human_review_required INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cs_drafts (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      marketplace TEXT,
      inquiry_id TEXT,
      draft TEXT NOT NULL,
      status TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      result_json TEXT,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      run_after TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      summary TEXT NOT NULL,
      detail_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decision_traces (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      decision TEXT NOT NULL,
      reasons_json TEXT NOT NULL,
      warnings_json TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_metrics (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      impressions INTEGER,
      clicks INTEGER,
      ctr REAL,
      conversion REAL,
      orders INTEGER,
      cancellations INTEGER,
      returns INTEGER,
      complaints INTEGER,
      ad_spend INTEGER,
      revenue INTEGER,
      actual_net_profit INTEGER,
      stockouts INTEGER,
      delivery_days INTEGER,
      rating REAL,
      review_sentiment TEXT,
      ai_recommendation TEXT,
      actual_outcome TEXT,
      captured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spend_ledger (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      amount_krw INTEGER NOT NULL,
      at TEXT NOT NULL,
      meta_json TEXT NOT NULL
    );
  `);
}
