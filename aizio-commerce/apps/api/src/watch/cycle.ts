import type { Repository } from "../db/repository.ts";
import { id, nowIso } from "../shared/ids.ts";
import type { HealthState, IncidentSeverity, WatchReport } from "./types.ts";

export { safeRecoveryAction } from "./recovery.ts";

export interface WatchInput {
  memRss: number;
  heapUsed: number;
  uptimeSec: number;
  now?: Date;
}

function worse(a: HealthState, b: HealthState): HealthState {
  const rank: Record<HealthState, number> = { HEALTHY: 0, DEGRADED: 1, UNHEALTHY: 2, CRITICAL: 3 };
  return rank[a] >= rank[b] ? a : b;
}

export function runWatchCycle(repo: Repository, input: WatchInput = processMetrics()): WatchReport {
  const findings: string[] = [];
  let overall: HealthState = "HEALTHY";
  const actions: string[] = [];

  const integrations = repo.listIntegrations();
  const apiTotal = Math.max(integrations.length, 1);
  const apiHealthy = integrations.filter((i) => i.status === "READY" || i.status === "PENDING_SETUP" || i.status === "NOT_CONFIGURED").length;
  const authFails = repo.countApiEvents({ sinceMinutes: 10, status: 401 });
  const rateLimited = repo.countApiEvents({ sinceMinutes: 10, status: 429 });
  const timeouts = repo.countApiEvents({ sinceMinutes: 10, error: "timeout" });
  if (rateLimited >= 5) {
    overall = worse(overall, "DEGRADED");
    findings.push(`API 429 burst ${rateLimited}/10m`);
    openIncident(repo, "MEDIUM", "api", "API 429 burst", findings.at(-1)!, ["api"], ["provider fallback / backoff"]);
  }
  if (authFails >= 1) {
    overall = worse(overall, "DEGRADED");
    findings.push(`API 401 ${authFails}/10m`);
    openIncident(repo, "HIGH", "api", "API 401", findings.at(-1)!, ["api"], ["token refresh 필요, WRITE 중지"]);
  }
  if (timeouts >= 3) {
    overall = worse(overall, "DEGRADED");
    findings.push(`timeout burst ${timeouts}/10m`);
    openIncident(repo, "MEDIUM", "api", "API timeout burst", findings.at(-1)!, ["api"], ["circuit OPEN 후보"]);
  }

  const cj401 = repo.countApiEvents({ sinceMinutes: 10, status: 401, provider: "cjdropshipping" });
  const cj429 = repo.countApiEvents({ sinceMinutes: 10, status: 429, provider: "cjdropshipping" });
  const cjTimeout = repo.countApiEvents({ sinceMinutes: 10, error: "timeout", provider: "cjdropshipping" });
  const cjMalformed = repo.countApiEvents({ sinceMinutes: 10, error: "malformed_json", provider: "cjdropshipping" });
  const cjCircuit = repo.latestApiCircuit("cjdropshipping");
  if (cj401) {
    overall = worse(overall, "DEGRADED");
    findings.push(`CJ 401 ${cj401}/10m`);
  }
  if (cjTimeout) {
    overall = worse(overall, "DEGRADED");
    findings.push(`CJ timeout ${cjTimeout}/10m`);
  }
  if (cjMalformed) {
    overall = worse(overall, "DEGRADED");
    findings.push(`CJ malformed response ${cjMalformed}/10m`);
  }
  if (cj429 >= 5 || cjCircuit === "OPEN") {
    overall = worse(overall, "DEGRADED");
    findings.push("CJ API DEGRADED");
    openIncident(
      repo,
      "HIGH",
      "cjdropshipping",
      "CJ API DEGRADED",
      "Circuit breaker OPEN — SCOUT_PRODUCTS 일시중지, 기존 Snapshot 유지",
      ["cjdropshipping", "SCOUT_PRODUCTS"],
      ["circuit OPEN", "pause SCOUT_PRODUCTS"],
    );
  }

  const staleSnapshots = repo.countProducts(
    "captured_at IS NOT NULL AND captured_at < datetime('now','-2 days')",
  );
  if (staleSnapshots > 0) {
    overall = worse(overall, "DEGRADED");
    findings.push(`stale snapshot ${staleSnapshots}`);
    openIncident(
      repo,
      "MEDIUM",
      "data",
      "stale snapshot",
      `${staleSnapshots}개 상품 capturedAt이 48시간 이상`,
      ["products"],
      ["기존 Snapshot 유지", "재스카우트 전 Watch 확인"],
    );
  }

  const jobs = repo.listJobs(80);
  const jobsRunning = jobs.filter((j) => j.status === "RUNNING").length;
  const jobsFailed = jobs.filter((j) => j.status === "FAILED").length;
  const queued = jobs.filter((j) => j.status === "QUEUED" || j.status === "RETRYING").length;
  const stuck = jobs.filter((j) => {
    if (j.status !== "RUNNING") return false;
    return Date.now() - Date.parse(j.updatedAt) > 10 * 60_000;
  });
  const dupes = duplicateJobs(jobs);
  if (stuck.length) {
    overall = worse(overall, "DEGRADED");
    findings.push(`stuck job ${stuck.length}`);
    openIncident(repo, "MEDIUM", "jobs", "Stuck job", findings.at(-1)!, stuck.map((j) => j.id), ["job isolate"]);
  }
  if (dupes.length) {
    overall = worse(overall, "DEGRADED");
    findings.push(`duplicate job ${dupes.length}`);
    openIncident(repo, "LOW", "jobs", "Duplicate job", findings.at(-1)!, dupes, ["dedupe"]);
  }
  if (queued >= 20) {
    overall = worse(overall, "DEGRADED");
    findings.push(`queue backlog ${queued}`);
    openIncident(repo, "MEDIUM", "jobs", "Queue backlog", findings.at(-1)!, ["queue"], ["job isolate / worker restart"]);
  }
  const scoutFail = jobs.filter((j) => j.type === "SCOUT_PRODUCTS" && j.status === "FAILED");
  if (scoutFail.length >= 12) {
    overall = worse(overall, "DEGRADED");
    findings.push(`SCOUT_PRODUCTS FAILED ${scoutFail.length}`);
  }

  const integrity = repo.findIntegrityIssues();
  if (integrity.length) {
    overall = worse(overall, integrity.some((i) => i.severity === "CRITICAL") ? "UNHEALTHY" : "DEGRADED");
    findings.push(...integrity.map((i) => i.title));
    for (const issue of integrity) {
      openIncident(repo, issue.severity, "integrity", issue.title, issue.detail, issue.entities, issue.actions);
    }
  }

  const business = repo.findBusinessLogicIssues();
  if (business.length) {
    overall = worse(overall, "UNHEALTHY");
    findings.push(...business.map((i) => i.title));
    for (const issue of business) {
      const sev: IncidentSeverity = issue.severity;
      openIncident(repo, sev, "business", issue.title, issue.detail, issue.entities, issue.actions);
      if (sev === "CRITICAL" || sev === "HIGH") {
        repo.setGlobalSafetyLock(true, issue.title);
        actions.push("GLOBAL_SAFETY_LOCK");
      }
    }
  }

  const cost = repo.findCostAnomalies();
  if (cost.length) {
    overall = worse(overall, "DEGRADED");
    findings.push(...cost.map((c) => c.title));
    for (const c of cost) {
      openIncident(repo, c.severity, "cost", c.title, c.detail, [], ["BUDGET_REVIEW_REQUIRED"]);
    }
  }

  if (input.heapUsed > 1.5 * 1024 * 1024 * 1024) {
    overall = worse(overall, "DEGRADED");
    findings.push("heap pressure");
  }

  const lock = repo.getGlobalSafetyLock();
  if (overall === "CRITICAL" && !lock) {
    repo.setGlobalSafetyLock(true, "watch.CRITICAL");
    actions.push("GLOBAL_SAFETY_LOCK");
  }

  const open = repo.listIncidents({ openOnly: true });
  const report: WatchReport = {
    overall,
    apiHealthy,
    apiTotal,
    jobsRunning,
    jobsFailed,
    queue: queued >= 20 ? "Backlog" : stuck.length ? "Stuck" : "Normal",
    data: integrity.length ? "Corrupt" : "Fresh",
    incidentsCritical: open.filter((i) => i.severity === "CRITICAL").length,
    incidentsLow: open.filter((i) => i.severity === "LOW" || i.severity === "INFO").length,
    safetyLock: repo.getGlobalSafetyLock(),
    findings,
  };
  repo.saveWatchSnapshot(report);
  void actions;
  void input.uptimeSec;
  void input.memRss;
  return report;
}

export function processMetrics(): WatchInput {
  const mem = process.memoryUsage();
  return { memRss: mem.rss, heapUsed: mem.heapUsed, uptimeSec: process.uptime() };
}

function openIncident(
  repo: Repository,
  severity: IncidentSeverity,
  source: string,
  title: string,
  description: string,
  affected: string[],
  automaticActions: string[],
): void {
  const existing = repo.findOpenIncident(source, title);
  if (existing) return;
  repo.insertIncident({
    id: id("inc"),
    severity,
    source,
    title,
    description: explainIncident(title, description, automaticActions),
    affectedEntities: affected,
    detectedAt: nowIso(),
    status: "OPEN",
    automaticActions,
    requiresHuman: severity === "HIGH" || severity === "CRITICAL",
  });
}

function duplicateJobs(jobs: Array<{ type: string; status: string; payload: unknown }>): string[] {
  const seen = new Map<string, number>();
  const dup: string[] = [];
  for (const j of jobs) {
    if (!["QUEUED", "RUNNING", "RETRYING"].includes(j.status)) continue;
    const key = `${j.type}:${JSON.stringify(j.payload)}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) dup.push(key);
  }
  return dup;
}

export function explainIncident(title: string, description: string, actions: string[]): string {
  return [
    `문제: ${title}`,
    `영향: ${description}`,
    `자동 조치: ${actions.join(" / ") || "로그 기록"}`,
    "Watch AI는 코드를 수정하지 않습니다.",
  ].join("\n");
}
