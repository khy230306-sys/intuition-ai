export const HEALTH_STATES = ["HEALTHY", "DEGRADED", "UNHEALTHY", "CRITICAL"] as const;
export type HealthState = (typeof HEALTH_STATES)[number];

export const INCIDENT_SEVERITY = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[number];

export const INCIDENT_STATUS = ["OPEN", "MITIGATING", "MONITORING", "RESOLVED"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

export interface IncidentRecord {
  id: string;
  severity: IncidentSeverity;
  source: string;
  title: string;
  description: string;
  affectedEntities: string[];
  detectedAt: string;
  status: IncidentStatus;
  automaticActions: string[];
  requiresHuman: boolean;
}

export interface WatchReport {
  overall: HealthState;
  apiHealthy: number;
  apiTotal: number;
  jobsRunning: number;
  jobsFailed: number;
  queue: "Normal" | "Backlog" | "Stuck";
  data: "Fresh" | "Stale" | "Corrupt";
  incidentsCritical: number;
  incidentsLow: number;
  safetyLock: boolean;
  findings: string[];
}
