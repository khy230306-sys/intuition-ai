export const COMMAND_LEVELS = ["STRATEGIC", "TACTICAL", "OPERATIONAL", "URGENT"] as const;
export type CommandLevel = (typeof COMMAND_LEVELS)[number];

export const EXECUTION_SCOPES = [
  "RESEARCH_ONLY",
  "READ_ONLY",
  "PREPARE_ACTION",
  "WRITE_ACTION",
  "FINANCIAL_ACTION",
] as const;
export type ExecutionScope = (typeof EXECUTION_SCOPES)[number];

export const DEPARTMENT_IDS = [
  "strategy",
  "market",
  "product",
  "supply",
  "sales",
  "marketing",
  "cs",
  "finance",
  "risk",
  "data_ai",
  "audit",
  "watch",
] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export const DEPARTMENT_LABEL: Record<DepartmentId, string> = {
  strategy: "전략기획본부",
  market: "시장정보본부",
  product: "상품본부",
  supply: "공급망본부",
  sales: "판매운영본부",
  marketing: "마케팅본부",
  cs: "고객운영본부",
  finance: "재무본부",
  risk: "리스크·컴플라이언스본부",
  data_ai: "데이터·AI본부",
  audit: "내부감사실",
  watch: "SYSTEM WATCH / SRE 본부",
};

export const MISSION_STATUS = [
  "PLANNING",
  "RUNNING",
  "REVIEWING",
  "AUDITING",
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "RECOVERING",
] as const;
export type MissionStatus = (typeof MISSION_STATUS)[number];

export const TASK_STATUS = ["QUEUED", "RUNNING", "WAITING", "SUCCESS", "FAILED", "BLOCKED"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const AUDIT_DECISIONS = ["PASS", "PASS_WITH_WARNINGS", "REVIEW_REQUIRED", "BLOCK"] as const;
export type AuditDecision = (typeof AUDIT_DECISIONS)[number];

export const DEPARTMENT_HEALTH = ["READY", "BUSY", "DEGRADED", "BLOCKED", "UNAVAILABLE"] as const;
export type DepartmentHealth = (typeof DEPARTMENT_HEALTH)[number];

export interface ClassifiedCommand {
  text: string;
  level: CommandLevel;
  executionScope: ExecutionScope;
  objective: string;
  departments: DepartmentId[];
  requiredDepartments: DepartmentId[];
  intent: string;
}

export interface DepartmentResult {
  summary: string;
  findings: string[];
  recommendations: string[];
  risks: string[];
  evidenceRefs: string[];
  confidence: number;
  dataFreshness: string;
}

export interface StrategyProposal {
  title: string;
  hypothesis: string;
  expectedUpside: string[];
  requiredResources: string[];
  expectedCosts: string[];
  risks: string[];
  validationPlan: string[];
  confidence: number;
  evidenceRefs: string[];
}

export interface MissionRecord {
  id: string;
  ownerCommand: string;
  level: CommandLevel;
  executionScope: ExecutionScope;
  objective: string;
  departments: DepartmentId[];
  status: MissionStatus;
  progress: number;
  correlationId: string;
  resultJson: Record<string, unknown>;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DepartmentTaskRecord {
  id: string;
  missionId: string;
  department: DepartmentId;
  objective: string;
  inputRefs: string[];
  status: TaskStatus;
  result: DepartmentResult | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export const MAX_DEBATE_ROUNDS = 2;
export const MAX_REANALYSIS_ROUNDS = 1;
export const MAX_DEBATE_ROUNDS_CAP = 3;
export const MAX_REANALYSIS_CAP = 2;
