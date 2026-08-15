import type { AppServices } from "../app-context.ts";
import { id, nowIso } from "../shared/ids.ts";
import { DataHub } from "../data-hub/hub.ts";
import { classifyOwnerCommand } from "./classify.ts";
import { selectDepartments } from "./router.ts";
import { runDepartment, synthesizeStrategy } from "./departments.ts";
import { runDebateProtocol } from "./debate.ts";
import { runInternalAudit } from "./audit.ts";
import { evaluateExecutionGates } from "../execution/gates.ts";
import type { DepartmentId, MissionRecord } from "./types.ts";
import { DEPARTMENT_LABEL } from "./types.ts";
import { remember } from "./memory.ts";
import { orgLog } from "./log.ts";

export async function startOwnerMission(services: AppServices, text: string): Promise<MissionRecord> {
  const classified = classifyOwnerCommand(text);
  const departments = selectDepartments(classified);
  const missionId = id("msn");
  const correlationId = id("cor");
  const createdAt = nowIso();
  const mission: MissionRecord = {
    id: missionId,
    ownerCommand: text,
    level: classified.level,
    executionScope: classified.executionScope,
    objective: classified.objective,
    departments,
    status: "PLANNING",
    progress: 5,
    correlationId,
    resultJson: { classified },
    error: null,
    createdAt,
    completedAt: null,
  };
  services.repo.saveMission(mission);
  remember(services.repo, "global", "command", missionId, classified.intent);
  orgLog({ msg: "mission.planned", missionId, correlationId });
  services.repo.insertAudit({
    actor: "COMMANDER",
    action: "COMMAND_CLASSIFIED",
    entityType: "mission",
    entityId: missionId,
    summary: `${classified.level}/${classified.executionScope} → ${departments.map((d) => DEPARTMENT_LABEL[d]).join(", ")}`,
    detail: classified,
  });
  services.repo.enqueueJob("PLAN_MISSION", { missionId, correlationId });
  return mission;
}

export async function executeMissionPlan(services: AppServices, missionId: string): Promise<MissionRecord> {
  const mission = services.repo.getMission(missionId);
  if (!mission) throw new Error("mission not found");
  const settings = services.repo.getSafetySettings();
  if (mission.status === "RECOVERING") {
    services.repo.updateMission(missionId, { status: "RUNNING" });
  } else {
    services.repo.updateMission(missionId, { status: "RUNNING", progress: 15 });
  }

  const writeAttempted =
    mission.executionScope === "WRITE_ACTION" || mission.executionScope === "FINANCIAL_ACTION";
  if (writeAttempted) {
    const gate = evaluateExecutionGates(settings, {
      action: mission.executionScope === "FINANCIAL_ACTION" ? "CUSTOMER_REFUND" : "MARKETPLACE_LISTING",
      executionScope: mission.executionScope,
      amountKRW: 0,
      dailySpentKRW: 0,
      monthlySpentKRW: 0,
      dailyAiUsd: services.repo.aiSpendSinceHours(24),
      missionAiUsd: 0,
      maxAiPerMissionUsd: settings.aiBudget.maxPerMissionUsd,
      dailyAiBudgetUsd: settings.aiBudget.dailyUsd,
      netMarginRate: null,
      confidence: 1,
      freshness: "UNKNOWN",
      riskDecision: "PASS",
      auditDecision: null,
      humanApproved: false,
    });
    if (!gate.allowed) {
      const done = {
        ...mission,
        status: "BLOCKED" as const,
        progress: 100,
        error: gate.reasons.join(" / "),
        completedAt: nowIso(),
        resultJson: { ...mission.resultJson, execution: gate },
      };
      services.repo.updateMission(missionId, done);
      return services.repo.getMission(missionId)!;
    }
  }

  const hub = new DataHub(services.repo);
  const tasks = mission.departments.filter((d) => d !== "strategy" && d !== "audit");
  const workers = tasks.map(async (department) => {
    const taskId = services.repo.saveDepartmentTask({
      id: id("tsk"),
      missionId,
      department,
      objective: mission.objective,
      inputRefs: [],
      status: "RUNNING",
      result: null,
      error: null,
      startedAt: nowIso(),
      completedAt: null,
    });
    try {
      const result = await runDepartment(services, department, mission.objective, hub);
      services.repo.finishDepartmentTask(taskId, "SUCCESS", result);
      return { department, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "department failed";
      services.repo.finishDepartmentTask(taskId, "FAILED", null, message);
      const required = (mission.resultJson.classified as { requiredDepartments?: DepartmentId[] } | undefined)
        ?.requiredDepartments;
      if (required?.includes(department)) {
        throw err;
      }
      return {
        department,
        result: {
          summary: `${department} 실패 — Mission은 계속합니다.`,
          findings: [message],
          recommendations: [],
          risks: ["부서 실패"],
          evidenceRefs: [`dept:${department}:FAILED`],
          confidence: 0,
          dataFreshness: "UNKNOWN",
        },
      };
    }
  });

  let deptResults: Array<{ department: DepartmentId; result: Awaited<ReturnType<typeof runDepartment>> }>;
  try {
    deptResults = await Promise.all(workers);
  } catch (err) {
    services.repo.updateMission(missionId, {
      status: "FAILED",
      error: err instanceof Error ? err.message : "required department failed",
      completedAt: nowIso(),
      progress: 100,
    });
    return services.repo.getMission(missionId)!;
  }

  services.repo.updateMission(missionId, { status: "REVIEWING", progress: 55 });
  const debate = runDebateProtocol(deptResults);
  services.repo.saveDebate(missionId, debate);

  const proposals = synthesizeStrategy({ objective: mission.objective, results: deptResults });
  const strategyTask = services.repo.saveDepartmentTask({
    id: id("tsk"),
    missionId,
    department: "strategy",
    objective: "전략 종합",
    inputRefs: deptResults.map((d) => d.department),
    status: "SUCCESS",
    result: {
      summary: `${proposals.length}개 전략안`,
      findings: proposals.map((p) => p.title),
      recommendations: proposals.flatMap((p) => p.validationPlan.slice(0, 1)),
      risks: proposals.flatMap((p) => p.risks.slice(0, 1)),
      evidenceRefs: ["strategy:synthesis"],
      confidence: Math.max(...proposals.map((p) => p.confidence), 0),
      dataFreshness: "ESTIMATE",
    },
    error: null,
    startedAt: nowIso(),
    completedAt: nowIso(),
  });
  void strategyTask;

  services.repo.updateMission(missionId, { status: "AUDITING", progress: 80 });
  const audit = runInternalAudit({
    results: deptResults,
    proposals,
    freshness: deptResults.map((d) => d.result.dataFreshness),
    inventedNumberHints: [],
    riskBypassAttempt: false,
    missingCostFields: deptResults.some((d) => d.department === "finance" && d.result.summary.includes("INSUFFICIENT"))
      ? ["marketplaceFee", "expectedAdCost", "expectedReturnLoss"]
      : [],
    executionReady: writeAttempted,
  });
  services.repo.saveMissionAudit(missionId, audit);
  for (const p of proposals) {
    services.repo.insertStrategyOutcome({
      missionId,
      proposalTitle: p.title,
      expected: {
        expectedUpside: p.expectedUpside,
        expectedCosts: p.expectedCosts,
        confidence: p.confidence,
        validationPlan: p.validationPlan,
      },
    });
  }
  remember(services.repo, "strategy", "proposal", missionId, JSON.stringify(proposals.map((p) => p.title)));
  orgLog({ msg: "mission.finalized", missionId, correlationId: mission.correlationId });

  const status = audit.decision === "BLOCK" ? "BLOCKED" : "COMPLETED";
  services.repo.updateMission(missionId, {
    status,
    progress: 100,
    completedAt: nowIso(),
    resultJson: {
      ...mission.resultJson,
      debate,
      proposals,
      audit,
      departments: Object.fromEntries(deptResults.map((d) => [d.department, d.result])),
    },
  });
  services.repo.insertMemory("global", "strategy", mission.objective, JSON.stringify(proposals.map((p) => p.title)));
  orgLog({ msg: "mission.stored", missionId });
  return services.repo.getMission(missionId)!;
}

export function resumeMissions(services: AppServices): number {
  const open = services.repo.listMissions({ resumable: true });
  let n = 0;
  for (const m of open) {
    services.repo.updateMission(m.id, { status: "RECOVERING" });
    services.repo.enqueueJob("PLAN_MISSION", { missionId: m.id, resume: true, correlationId: m.correlationId });
    n += 1;
  }
  return n;
}
