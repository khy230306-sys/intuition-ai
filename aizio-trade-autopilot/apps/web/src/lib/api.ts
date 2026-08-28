import type { AutopilotPublicState, RiskLevel, TradingMode } from '@aizio/trade-shared';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: () => json<AutopilotPublicState>('/api/status'),
  start: (body: { capital: number; riskLevel: RiskLevel; mode?: TradingMode }) =>
    json<{ ok: boolean }>('/api/autopilot/start', { method: 'POST', body: JSON.stringify(body) }),
  stop: (stopMode: 'STOP_NEW_ENTRIES' | 'CLOSE_AND_STOP') =>
    json<{ ok: boolean }>('/api/autopilot/stop', {
      method: 'POST',
      body: JSON.stringify({ stopMode }),
    }),
  emergency: () => json<{ ok: boolean }>('/api/autopilot/emergency-stop', { method: 'POST' }),
  journal: () => json<{ journal: unknown[] }>('/api/journal'),
  performance: () => json<Record<string, unknown>>('/api/performance'),
  liveDiagnostics: () =>
    json<{
      ready: boolean;
      locked: boolean;
      checks: Array<{ name: string; result: string; detail: string }>;
    }>('/api/diagnostics/live'),
  diagnosticsPanel: () =>
    json<{
      rows: Array<{ name: string; result: string; detail: string }>;
      guidance: { needed: boolean; message: string };
      allowLive: boolean;
      liveLocked: boolean;
      universe: Record<string, unknown>;
      research: Record<string, unknown>;
    }>('/api/diagnostics/panel'),
  shadowVerify: () =>
    json<{ stages: Array<{ name: string; result: string; detail: string }>; allCriticalPass?: boolean }>(
      '/api/diagnostics/shadow-verify',
      { method: 'POST' },
    ),
  config: () => json<Record<string, unknown>>('/api/config/public'),
};
