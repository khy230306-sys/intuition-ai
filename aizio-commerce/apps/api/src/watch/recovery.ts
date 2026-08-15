const SAFE = new Set([
  "api_reconnect",
  "token_refresh",
  "job_retry",
  "worker_restart",
  "provider_fallback",
  "cache_refresh",
]);

const FORBIDDEN = new Set([
  "patch_payment_logic",
  "patch_risk_gate",
  "patch_profit_engine",
  "auto_deploy",
  "schema_migrate",
  "hotfix_refund",
]);

/**
 * Recovery Controller — only safe operational recovery.
 * Never auto-patches Risk/Profit/payment code or deploys.
 */
export function safeRecoveryAction(kind: string): { allowed: boolean; reason: string } {
  if (FORBIDDEN.has(kind)) {
    return { allowed: false, reason: "복구 컨트롤러가 결제/Risk/Profit 코드 변경과 자동 배포를 금지합니다." };
  }
  if (SAFE.has(kind)) return { allowed: true, reason: "safe recovery" };
  return { allowed: false, reason: "복구 컨트롤러가 결제/Risk/Profit 코드 변경과 자동 배포를 금지합니다." };
}
