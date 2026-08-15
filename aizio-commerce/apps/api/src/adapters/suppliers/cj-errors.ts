export const CJ_SAFE_ERROR_CODES = [
  "CREDENTIAL_REQUIRED",
  "AUTH_FAILED",
  "INVALID_API_KEY",
  "RATE_LIMITED",
  "CJ_UNAVAILABLE",
  "PRODUCT_API_FAILED",
  "INVENTORY_API_FAILED",
  "SHIPPING_API_FAILED",
] as const;

export type CjSafeErrorCode = (typeof CJ_SAFE_ERROR_CODES)[number];

export function redactCredentialText(text: string, secrets: Array<string | null | undefined>): string {
  let out = text;
  for (const secret of secrets) {
    const value = (secret ?? "").trim();
    if (value.length < 4) continue;
    out = out.split(value).join("[REDACTED]");
  }
  return out;
}

export function looksLikeInvalidApiKey(message: string | null | undefined): boolean {
  if (!message) return false;
  return /invalid.{0,32}api.?key|api.?key.{0,32}invalid|apikey is error|illegal api.?key/i.test(
    message,
  );
}

export function authErrorCode(opts: {
  status: string;
  httpStatus?: number;
  timedOut?: boolean;
  message?: string | null;
}): CjSafeErrorCode {
  if (opts.timedOut) return "CJ_UNAVAILABLE";
  if (opts.status === "RATE_LIMITED" || opts.httpStatus === 429) return "RATE_LIMITED";
  if (opts.status === "NOT_CONFIGURED") return "CREDENTIAL_REQUIRED";
  if (opts.status === "UNAVAILABLE" || (opts.httpStatus !== undefined && opts.httpStatus >= 500)) {
    return "CJ_UNAVAILABLE";
  }
  if (looksLikeInvalidApiKey(opts.message)) return "INVALID_API_KEY";
  if (opts.status === "AUTH_FAILED" || opts.httpStatus === 401 || opts.httpStatus === 403) return "AUTH_FAILED";
  if (opts.status === "TOKEN_EXPIRED") return "AUTH_FAILED";
  return "AUTH_FAILED";
}

export function probeErrorCode(name: string, status: string): CjSafeErrorCode | null {
  if (status === "READY" || status === "TOKEN_EXPIRING") return null;
  if (name === "authentication") {
    if (status === "RATE_LIMITED") return "RATE_LIMITED";
    if (status === "NOT_CONFIGURED" || status === "PENDING_SETUP") return "CREDENTIAL_REQUIRED";
    if (status === "UNAVAILABLE" || status === "DEGRADED") return "CJ_UNAVAILABLE";
    return status === "AUTH_FAILED" ? "AUTH_FAILED" : "AUTH_FAILED";
  }
  if (name === "productSearch") return "PRODUCT_API_FAILED";
  if (name === "inventory") return "INVENTORY_API_FAILED";
  if (name === "shipping") return "SHIPPING_API_FAILED";
  return "CJ_UNAVAILABLE";
}

export function connectionTestErrorCode(
  probes: Array<{ name: string; status: string; error: string | null }>,
  overallStatus: string,
): CjSafeErrorCode | null {
  if (overallStatus === "READY" || overallStatus === "TOKEN_EXPIRING") return null;
  if (overallStatus === "NOT_CONFIGURED" || overallStatus === "PENDING_SETUP") return "CREDENTIAL_REQUIRED";
  const auth = probes.find((p) => p.name === "authentication");
  if (auth && auth.status !== "READY") {
    return probeErrorCode("authentication", auth.status) ?? authErrorCode({ status: overallStatus, message: auth.error });
  }
  const product = probes.find((p) => p.name === "productSearch");
  if (product && product.status !== "READY") return "PRODUCT_API_FAILED";
  const inventory = probes.find((p) => p.name === "inventory");
  if (inventory && inventory.status !== "READY") return "INVENTORY_API_FAILED";
  const shipping = probes.find((p) => p.name === "shipping");
  if (shipping && shipping.status !== "READY") return "SHIPPING_API_FAILED";
  if (overallStatus === "RATE_LIMITED") return "RATE_LIMITED";
  if (overallStatus === "AUTH_FAILED") return "AUTH_FAILED";
  return "CJ_UNAVAILABLE";
}

export function supplierConnectionLabel(status: string): "NOT CONNECTED" | "CONNECTED / READ ONLY" {
  return status === "READY" || status === "TOKEN_EXPIRING" ? "CONNECTED / READ ONLY" : "NOT CONNECTED";
}

export function credentialConfiguredLabel(configured: boolean): "CONFIGURED" | "MISSING" {
  return configured ? "CONFIGURED" : "MISSING";
}
