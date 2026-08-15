import type { DepartmentId } from "./types.ts";
import { assertToolAllowed, type AgentTool } from "./permissions.ts";

export interface AgentRun {
  id: string;
  department: DepartmentId;
  role: string;
  provider: string | null;
  tools: AgentTool[];
  status: "COMPLETED" | "DENIED" | "SKIPPED";
  resultRef: string | null;
}

/**
 * Dynamic agent spawn. No standing processes. No write tools.
 */
export function runAgent(opts: {
  department: DepartmentId;
  role: string;
  requestedTool: AgentTool;
  providerReady: boolean;
}): AgentRun {
  if (!assertToolAllowed(opts.department, opts.requestedTool)) {
    return {
      id: `agt_${opts.department}_${opts.role}`,
      department: opts.department,
      role: opts.role,
      provider: null,
      tools: [opts.requestedTool],
      status: "DENIED",
      resultRef: null,
    };
  }
  if (["ORDER", "LISTING", "PAYMENT", "REFUND"].includes(opts.requestedTool)) {
    return {
      id: `agt_${opts.department}_${opts.role}`,
      department: opts.department,
      role: opts.role,
      provider: null,
      tools: [opts.requestedTool],
      status: "DENIED",
      resultRef: null,
    };
  }
  return {
    id: `agt_${opts.department}_${opts.role}`,
    department: opts.department,
    role: opts.role,
    provider: opts.providerReady ? "registry" : "CODE",
    tools: [opts.requestedTool],
    status: "COMPLETED",
    resultRef: `${opts.department}:${opts.role}`,
  };
}
