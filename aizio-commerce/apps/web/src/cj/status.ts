export function supplierConnectionLabel(status: string): "NOT CONNECTED" | "CONNECTED / READ ONLY" {
  return status === "READY" || status === "TOKEN_EXPIRING" ? "CONNECTED / READ ONLY" : "NOT CONNECTED";
}

export function credentialConfiguredLabel(configured: boolean): "CONFIGURED" | "MISSING" {
  return configured ? "CONFIGURED" : "MISSING";
}

export function scoutAllowed(opts: {
  cjReady: boolean;
  operatingMode?: string | null;
  watchOverall?: string | null;
  safetyLock?: boolean | null;
}): boolean {
  return (
    opts.cjReady &&
    (opts.operatingMode ?? "LIVE_OBSERVE") === "LIVE_OBSERVE" &&
    opts.watchOverall !== "CRITICAL" &&
    !opts.safetyLock
  );
}

export const CJ_PROBE_LABELS: Record<string, string> = {
  authentication: "Authentication",
  productSearch: "Products",
  inventory: "Inventory",
  shipping: "Shipping to KR",
};

export function probeDisplayName(name: string): string {
  return CJ_PROBE_LABELS[name] ?? name;
}

export function capabilityStatus(
  status: string,
  caps: Record<string, unknown> | undefined,
  key: string,
  lockedFallback = false,
): string {
  if (lockedFallback) return "LOCKED";
  const raw = caps?.[key];
  if (typeof raw === "string") return raw;
  if (status === "READY") return raw === false ? "UNAVAILABLE" : "READY";
  return "NOT_CONFIGURED";
}
