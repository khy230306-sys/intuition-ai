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

    CREATE TABLE IF NOT EXISTS supplier_price_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      supplier TEXT NOT NULL,
      supplier_product_id TEXT,
      variant_id TEXT,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      captured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      supplier TEXT NOT NULL,
      supplier_product_id TEXT,
      variant_id TEXT,
      stock INTEGER NOT NULL,
      warehouse TEXT,
      captured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shipping_quote_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      supplier TEXT NOT NULL,
      variant_id TEXT,
      availability TEXT NOT NULL,
      method TEXT,
      cost REAL,
      currency TEXT,
      aging TEXT,
      warehouse TEXT,
      captured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scout_runs (
      id TEXT PRIMARY KEY,
      supplier TEXT NOT NULL,
      keyword TEXT,
      analyzed INTEGER NOT NULL DEFAULT 0,
      korea_shippable INTEGER NOT NULL DEFAULT 0,
      risk_excluded INTEGER NOT NULL DEFAULT 0,
      profit_calculable INTEGER NOT NULL DEFAULT 0,
      recommended INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      result_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn(db, "products", "supplier_variant_id", "TEXT");
  ensureColumn(db, "products", "currency", "TEXT");
  ensureColumn(db, "products", "shipping_availability", "TEXT");
  ensureColumn(db, "products", "shipping_method", "TEXT");
  ensureColumn(db, "products", "shipping_usd", "REAL");
  ensureColumn(db, "products", "target_margin_price_krw", "INTEGER");
  ensureColumn(db, "products", "market_observed_price_krw", "INTEGER");
  ensureColumn(db, "products", "profit_stage", "TEXT");
  ensureColumn(db, "products", "selling_price_kind", "TEXT");
  ensureColumn(db, "products", "scout_candidate", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "products", "weight", "REAL");
  ensureColumn(db, "products", "source_url", "TEXT");
  ensureColumn(db, "products", "captured_at", "TEXT");

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_supplier_identity
      ON products(supplier, ifnull(supplier_product_id,''), ifnull(supplier_variant_id,''));
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON supplier_price_history(product_id, captured_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id, captured_at);
    CREATE INDEX IF NOT EXISTS idx_shipping_history_product ON shipping_quote_history(product_id, captured_at);

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      owner_command TEXT NOT NULL,
      level TEXT NOT NULL,
      execution_scope TEXT NOT NULL,
      objective TEXT NOT NULL,
      departments_json TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      correlation_id TEXT NOT NULL,
      result_json TEXT NOT NULL DEFAULT '{}',
      error TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS department_tasks (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      department TEXT NOT NULL,
      objective TEXT NOT NULL,
      input_refs_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      result_json TEXT,
      error TEXT,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS debates (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mission_audits (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      kind TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_snapshots (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      expires_at TEXT,
      freshness TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      ok INTEGER NOT NULL,
      status INTEGER NOT NULL,
      error TEXT,
      circuit TEXT,
      at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT,
      task TEXT,
      tokens_in INTEGER,
      tokens_out INTEGER,
      estimated_usd REAL,
      mission_id TEXT,
      department TEXT,
      at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      affected_json TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      status TEXT NOT NULL,
      actions_json TEXT NOT NULL,
      requires_human INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS watch_snapshots (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS strategy_outcomes (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      proposal_title TEXT NOT NULL,
      expected_json TEXT NOT NULL,
      actual_json TEXT,
      captured_at TEXT NOT NULL
    );
  `);
}

function ensureColumn(db: DbClient, table: string, name: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((row) => String(row.name) === name)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
}
