import type { DepartmentId, ExecutionScope } from "./types.ts";

export type AgentTool =
  | "READ_MARKET"
  | "READ_PRODUCT"
  | "READ_SUPPLY"
  | "READ_ORDER"
  | "READ_SETTLEMENT"
  | "READ_RETURN"
  | "RUN_PROFIT_ENGINE"
  | "RUN_RISK_ENGINE"
  | "CREATE_CS_DRAFT"
  | "ORDER"
  | "LISTING"
  | "PAYMENT"
  | "REFUND";

const BASE_DENY: AgentTool[] = ["ORDER", "LISTING", "PAYMENT", "REFUND"];

const ALLOW: Record<DepartmentId, AgentTool[]> = {
  strategy: ["READ_MARKET", "READ_PRODUCT", "READ_SUPPLY", "READ_SETTLEMENT"],
  market: ["READ_MARKET", "READ_PRODUCT"],
  product: ["READ_PRODUCT", "READ_SUPPLY", "RUN_RISK_ENGINE"],
  supply: ["READ_SUPPLY", "READ_PRODUCT"],
  sales: ["READ_ORDER", "READ_PRODUCT"],
  marketing: ["READ_PRODUCT", "READ_MARKET"],
  cs: ["READ_ORDER", "READ_RETURN", "CREATE_CS_DRAFT"],
  finance: ["READ_SETTLEMENT", "RUN_PROFIT_ENGINE"],
  risk: ["RUN_RISK_ENGINE", "READ_PRODUCT"],
  data_ai: ["READ_PRODUCT", "READ_MARKET"],
  audit: ["READ_PRODUCT", "READ_SETTLEMENT", "RUN_RISK_ENGINE", "RUN_PROFIT_ENGINE"],
  watch: ["READ_ORDER", "READ_PRODUCT", "READ_SETTLEMENT"],
};

export function toolsFor(department: DepartmentId): { allow: AgentTool[]; deny: AgentTool[] } {
  return { allow: ALLOW[department], deny: BASE_DENY };
}

export function assertToolAllowed(department: DepartmentId, tool: AgentTool): boolean {
  if (BASE_DENY.includes(tool)) return false;
  return ALLOW[department].includes(tool);
}

export function scopeAllowsExternalWrite(scope: ExecutionScope): boolean {
  return scope === "WRITE_ACTION" || scope === "FINANCIAL_ACTION";
}
