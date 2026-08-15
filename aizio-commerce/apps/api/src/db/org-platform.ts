import type { DbClient, SqlRow } from "./client.ts";
import { id, nowIso } from "../shared/ids.ts";
import type {
  DepartmentId,
  DepartmentResult,
  DepartmentTaskRecord,
  MissionRecord,
  MissionStatus,
  TaskStatus,
} from "../organization/types.ts";
import type { IncidentRecord, IncidentSeverity, WatchReport } from "../watch/types.ts";

function str(row: SqlRow | undefined, key: string): string {
  const v = row?.[key];
  return v === null || v === undefined ? "" : String(v);
}
function json<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class OrgPlatform {
  constructor(private readonly db: DbClient) {}

  saveMission(m: MissionRecord): void {
    this.db
      .prepare(
        `INSERT INTO missions(id, owner_command, level, execution_scope, objective, departments_json, status, progress, correlation_id, result_json, error, created_at, completed_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           status=excluded.status, progress=excluded.progress, result_json=excluded.result_json,
           error=excluded.error, completed_at=excluded.completed_at`,
      )
      .run(
        m.id,
        m.ownerCommand,
        m.level,
        m.executionScope,
        m.objective,
        JSON.stringify(m.departments),
        m.status,
        m.progress,
        m.correlationId,
        JSON.stringify(m.resultJson),
        m.error,
        m.createdAt,
        m.completedAt,
      );
  }

  getMission(idValue: string): MissionRecord | null {
    const row = this.db.prepare("SELECT * FROM missions WHERE id=?").get(idValue);
    return row ? this.mapMission(row) : null;
  }

  updateMission(idValue: string, patch: Partial<MissionRecord>): void {
    const cur = this.getMission(idValue);
    if (!cur) return;
    this.saveMission({ ...cur, ...patch, id: idValue });
  }

  listMissions(opts?: { resumable?: boolean; limit?: number }): MissionRecord[] {
    const limit = opts?.limit ?? 40;
    const sql = opts?.resumable
      ? `SELECT * FROM missions WHERE status IN ('PLANNING','RUNNING','REVIEWING','AUDITING','RECOVERING') ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM missions ORDER BY created_at DESC LIMIT ?`;
    return this.db.prepare(sql).all(limit).map((r) => this.mapMission(r));
  }

  private mapMission(row: SqlRow): MissionRecord {
    return {
      id: str(row, "id"),
      ownerCommand: str(row, "owner_command"),
      level: str(row, "level") as MissionRecord["level"],
      executionScope: str(row, "execution_scope") as MissionRecord["executionScope"],
      objective: str(row, "objective"),
      departments: json(str(row, "departments_json"), []),
      status: str(row, "status") as MissionStatus,
      progress: Number(row.progress ?? 0),
      correlationId: str(row, "correlation_id"),
      resultJson: json(str(row, "result_json"), {}),
      error: row.error ? str(row, "error") : null,
      createdAt: str(row, "created_at"),
      completedAt: row.completed_at ? str(row, "completed_at") : null,
    };
  }

  saveDepartmentTask(t: DepartmentTaskRecord): string {
    this.db
      .prepare(
        `INSERT INTO department_tasks(id, mission_id, department, objective, input_refs_json, status, result_json, error, started_at, completed_at)
         VALUES(?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status, result_json=excluded.result_json, error=excluded.error, completed_at=excluded.completed_at`,
      )
      .run(
        t.id,
        t.missionId,
        t.department,
        t.objective,
        JSON.stringify(t.inputRefs),
        t.status,
        t.result ? JSON.stringify(t.result) : null,
        t.error,
        t.startedAt,
        t.completedAt,
      );
    return t.id;
  }

  finishDepartmentTask(taskId: string, status: TaskStatus, result: DepartmentResult | null, error?: string): void {
    this.db
      .prepare("UPDATE department_tasks SET status=?, result_json=?, error=?, completed_at=? WHERE id=?")
      .run(status, result ? JSON.stringify(result) : null, error ?? null, nowIso(), taskId);
  }

  listDepartmentTasks(missionId: string): DepartmentTaskRecord[] {
    return this.db
      .prepare("SELECT * FROM department_tasks WHERE mission_id=? ORDER BY started_at")
      .all(missionId)
      .map((row) => ({
        id: str(row, "id"),
        missionId: str(row, "mission_id"),
        department: str(row, "department") as DepartmentId,
        objective: str(row, "objective"),
        inputRefs: json(str(row, "input_refs_json"), []),
        status: str(row, "status") as TaskStatus,
        result: json(str(row, "result_json"), null),
        error: row.error ? str(row, "error") : null,
        startedAt: row.started_at ? str(row, "started_at") : null,
        completedAt: row.completed_at ? str(row, "completed_at") : null,
      }));
  }

  saveDebate(missionId: string, payload: unknown): void {
    this.db
      .prepare("INSERT INTO debates(id, mission_id, payload_json, created_at) VALUES(?,?,?,?)")
      .run(id("dbt"), missionId, JSON.stringify(payload), nowIso());
  }

  saveMissionAudit(missionId: string, report: { decision: string }): void {
    this.db
      .prepare("INSERT INTO mission_audits(id, mission_id, decision, payload_json, created_at) VALUES(?,?,?,?,?)")
      .run(id("mad"), missionId, report.decision, JSON.stringify(report), nowIso());
  }

  insertMemory(scope: string, kind: string, key: string, value: string): void {
    this.db
      .prepare("INSERT INTO memories(id, scope, kind, key, value, created_at) VALUES(?,?,?,?,?,?)")
      .run(id("mem"), scope, kind, key, value, nowIso());
  }

  saveSnapshot(row: {
    source: string;
    entityType: string;
    entityId: string;
    payloadHash: string;
    payload: unknown;
    capturedAt: string;
    expiresAt: string | null;
    freshness: string;
  }): string {
    const sid = id("snp");
    this.db
      .prepare(
        `INSERT INTO data_snapshots(id, source, entity_type, entity_id, payload_hash, payload_json, captured_at, expires_at, freshness)
         VALUES(?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        sid,
        row.source,
        row.entityType,
        row.entityId,
        row.payloadHash,
        JSON.stringify(row.payload),
        row.capturedAt,
        row.expiresAt,
        row.freshness,
      );
    return sid;
  }

  latestSnapshot(source: string, entityType: string, entityId: string) {
    const row = this.db
      .prepare(
        `SELECT * FROM data_snapshots WHERE source=? AND entity_type=? AND entity_id=? ORDER BY captured_at DESC LIMIT 1`,
      )
      .get(source, entityType, entityId);
    if (!row) return null;
    return {
      id: str(row, "id"),
      source: str(row, "source"),
      entityType: str(row, "entity_type"),
      entityId: str(row, "entity_id"),
      payloadHash: str(row, "payload_hash"),
      payload: json(str(row, "payload_json"), {}),
      capturedAt: str(row, "captured_at"),
      expiresAt: row.expires_at ? str(row, "expires_at") : null,
      freshness: str(row, "freshness"),
    };
  }

  recordApiEvent(row: { provider: string; ok: boolean; status: number; error: string | null; circuit: string }): void {
    this.db
      .prepare("INSERT INTO api_events(id, provider, ok, status, error, circuit, at) VALUES(?,?,?,?,?,?,?)")
      .run(id("ape"), row.provider, row.ok ? 1 : 0, row.status, row.error, row.circuit, nowIso());
  }

  countApiEvents(opts: { sinceMinutes: number; status?: number; error?: string; provider?: string }): number {
    const since = new Date(Date.now() - opts.sinceMinutes * 60_000).toISOString();
    const clauses = ["at>=?"];
    const params: Array<string | number> = [since];
    if (opts.provider) {
      clauses.push("provider=?");
      params.push(opts.provider);
    }
    if (opts.status !== undefined) {
      clauses.push("status=?");
      params.push(opts.status);
    }
    if (opts.error) {
      clauses.push("error=?");
      params.push(opts.error);
    }
    const row = this.db.prepare(`SELECT COUNT(*) AS c FROM api_events WHERE ${clauses.join(" AND ")}`).get(...params);
    return Number(row?.c ?? 0);
  }

  latestApiCircuit(provider: string): string | null {
    const row = this.db
      .prepare("SELECT circuit FROM api_events WHERE provider=? ORDER BY at DESC LIMIT 1")
      .get(provider);
    return row ? str(row, "circuit") : null;
  }

  aiSpendSinceHours(hours: number): number {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const row = this.db.prepare("SELECT COALESCE(SUM(estimated_usd),0) AS s FROM ai_usage WHERE at>=?").get(since);
    return Number(row?.s ?? 0);
  }

  insertAiUsage(row: {
    provider: string;
    model: string | null;
    task: string;
    tokensIn: number;
    tokensOut: number;
    estimatedUsd: number;
    missionId: string | null;
    department: string | null;
    at?: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO ai_usage(id, provider, model, task, tokens_in, tokens_out, estimated_usd, mission_id, department, at)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id("aiu"),
        row.provider,
        row.model,
        row.task,
        row.tokensIn,
        row.tokensOut,
        row.estimatedUsd,
        row.missionId,
        row.department,
        row.at ?? nowIso(),
      );
  }

  insertStrategyOutcome(row: {
    missionId: string;
    proposalTitle: string;
    expected: unknown;
    actual?: unknown;
  }): void {
    this.db
      .prepare(
        `INSERT INTO strategy_outcomes(id, mission_id, proposal_title, expected_json, actual_json, captured_at)
         VALUES(?,?,?,?,?,?)`,
      )
      .run(
        id("sot"),
        row.missionId,
        row.proposalTitle,
        JSON.stringify(row.expected),
        row.actual ? JSON.stringify(row.actual) : null,
        nowIso(),
      );
  }

  insertIncident(row: IncidentRecord): void {
    this.db
      .prepare(
        `INSERT INTO incidents(id, severity, source, title, description, affected_json, detected_at, status, actions_json, requires_human)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        row.id,
        row.severity,
        row.source,
        row.title,
        row.description,
        JSON.stringify(row.affectedEntities),
        row.detectedAt,
        row.status,
        JSON.stringify(row.automaticActions),
        row.requiresHuman ? 1 : 0,
      );
  }

  findOpenIncident(source: string, title: string): IncidentRecord | null {
    const row = this.db
      .prepare("SELECT * FROM incidents WHERE source=? AND title=? AND status!='RESOLVED' LIMIT 1")
      .get(source, title);
    return row ? this.mapIncident(row) : null;
  }

  listIncidents(opts?: { openOnly?: boolean }): IncidentRecord[] {
    const sql = opts?.openOnly
      ? "SELECT * FROM incidents WHERE status!='RESOLVED' ORDER BY detected_at DESC LIMIT 50"
      : "SELECT * FROM incidents ORDER BY detected_at DESC LIMIT 50";
    return this.db.prepare(sql).all().map((r) => this.mapIncident(r));
  }

  private mapIncident(row: SqlRow): IncidentRecord {
    return {
      id: str(row, "id"),
      severity: str(row, "severity") as IncidentSeverity,
      source: str(row, "source"),
      title: str(row, "title"),
      description: str(row, "description"),
      affectedEntities: json(str(row, "affected_json"), []),
      detectedAt: str(row, "detected_at"),
      status: str(row, "status") as IncidentRecord["status"],
      automaticActions: json(str(row, "actions_json"), []),
      requiresHuman: Number(row.requires_human ?? 0) === 1,
    };
  }

  saveWatchSnapshot(report: WatchReport): void {
    this.db
      .prepare("INSERT INTO watch_snapshots(id, payload_json, created_at) VALUES(?,?,?)")
      .run(id("wch"), JSON.stringify(report), nowIso());
  }

  latestWatchSnapshot(): WatchReport | null {
    const row = this.db.prepare("SELECT payload_json FROM watch_snapshots ORDER BY created_at DESC LIMIT 1").get();
    return row ? json(str(row, "payload_json"), null) : null;
  }

  findIntegrityIssues(): Array<{
    title: string;
    detail: string;
    entities: string[];
    severity: IncidentSeverity;
    actions: string[];
  }> {
    const issues: Array<{
      title: string;
      detail: string;
      entities: string[];
      severity: IncidentSeverity;
      actions: string[];
    }> = [];
    const badPrice = this.db
      .prepare("SELECT id FROM products WHERE supplier_price_krw <= 0 OR shipping_krw < 0 LIMIT 20")
      .all();
    if (badPrice.length) {
      issues.push({
        title: "비정상 공급가",
        detail: `${badPrice.length}개 상품 공급가가 0 이하이거나 배송비가 음수`,
        entities: badPrice.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["해당 상품 자동 가격변경 금지"],
      });
    }
    const dupOrders = this.db
      .prepare(
        `SELECT marketplace_order_id AS id FROM orders
         GROUP BY marketplace, marketplace_order_id HAVING COUNT(*) > 1 LIMIT 20`,
      )
      .all();
    if (dupOrders.length) {
      issues.push({
        title: "중복 마켓 주문",
        detail: `${dupOrders.length}개 marketplaceOrderId 중복`,
        entities: dupOrders.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["중복 발주 차단"],
      });
    }
    const dupSupplier = this.db
      .prepare(
        `SELECT supplier_order_id AS id FROM orders
         WHERE supplier_order_id IS NOT NULL AND supplier_order_id != ''
         GROUP BY supplier_order_id HAVING COUNT(*) > 1 LIMIT 20`,
      )
      .all();
    if (dupSupplier.length) {
      issues.push({
        title: "중복 마켓 주문",
        detail: `${dupSupplier.length}개 supplierOrderId가 두 주문에 연결됨`,
        entities: dupSupplier.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["중복 발주 차단"],
      });
    }
    const staleLive = this.db
      .prepare(
        `SELECT p.id FROM products p
         JOIN data_snapshots s ON s.entity_id = p.id
         WHERE p.status='LIVE' AND s.freshness='STALE' LIMIT 20`,
      )
      .all();
    if (staleLive.length) {
      issues.push({
        title: "STALE 공급원가로 LIVE",
        detail: `${staleLive.length}개 LIVE 상품이 STALE 스냅샷`,
        entities: staleLive.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["자동 가격변경/발주 REVIEW_REQUIRED"],
      });
    }
    const mismatch = this.db
      .prepare(
        `SELECT order_id AS id FROM settlements
         WHERE profit_prediction_error IS NOT NULL AND ABS(profit_prediction_error) >= 1 LIMIT 20`,
      )
      .all();
    if (mismatch.length) {
      issues.push({
        title: "정산 불일치",
        detail: `${mismatch.length}건 예상/실제 순이익 차이`,
        entities: mismatch.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["정산 재검토"],
      });
    }
    const badStock = this.db.prepare("SELECT id FROM products WHERE stock < 0 LIMIT 20").all();
    if (badStock.length) {
      issues.push({
        title: "음수 재고",
        detail: `${badStock.length}개`,
        entities: badStock.map((r) => str(r, "id")),
        severity: "MEDIUM",
        actions: ["재고 동기화 중단"],
      });
    }
    const zeroSell = this.db
      .prepare("SELECT id FROM products WHERE recommended_price_krw = 0 AND status IN ('LIVE','LISTING_READY')")
      .all();
    if (zeroSell.length) {
      issues.push({
        title: "판매가 0",
        detail: "LIVE 상품 판매가 0",
        entities: zeroSell.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["리스팅 일시중지 권고"],
      });
    }
    return issues;
  }

  findBusinessLogicIssues(): Array<{
    title: string;
    detail: string;
    entities: string[];
    severity: IncidentSeverity;
    actions: string[];
  }> {
    const issues: Array<{
      title: string;
      detail: string;
      entities: string[];
      severity: IncidentSeverity;
      actions: string[];
    }> = [];
    const blockedLive = this.db
      .prepare(
        `SELECT id FROM products WHERE status='LIVE' AND json_extract(risk_json,'$.decision')='BLOCK' LIMIT 20`,
      )
      .all();
    if (blockedLive.length) {
      issues.push({
        title: "Risk BLOCK 상품이 LIVE",
        detail: `${blockedLive.length}개`,
        entities: blockedLive.map((r) => str(r, "id")),
        severity: "CRITICAL",
        actions: ["GLOBAL_SAFETY_LOCK", "해당 상품 PAUSED"],
      });
    }
    const liveSoldOut = this.db.prepare("SELECT id FROM products WHERE status='LIVE' AND stock=0 LIMIT 20").all();
    if (liveSoldOut.length) {
      issues.push({
        title: "판매 중인데 공급 재고 0",
        detail: `${liveSoldOut.length}개`,
        entities: liveSoldOut.map((r) => str(r, "id")),
        severity: "HIGH",
        actions: ["자동발주 중지"],
      });
    }
    return issues;
  }

  findCostAnomalies(): Array<{ title: string; detail: string; severity: IncidentSeverity }> {
    const hour = this.aiSpendSinceHours(1);
    const day = this.aiSpendSinceHours(24);
    const out: Array<{ title: string; detail: string; severity: IncidentSeverity }> = [];
    if (hour > 5 && hour > day * 0.5) {
      out.push({ title: "AI 비용 급증", detail: `1시간 $${hour.toFixed(2)}`, severity: "HIGH" });
    }
    const spike = this.db
      .prepare(
        `SELECT p.id FROM products p
         JOIN supplier_price_history h ON h.product_id=p.id
         GROUP BY p.id HAVING MAX(h.price) > MIN(h.price) * 1.2 LIMIT 10`,
      )
      .all();
    if (spike.length) {
      out.push({ title: "공급가 급등", detail: `${spike.length}개 SKU`, severity: "MEDIUM" });
    }
    return out;
  }
}
