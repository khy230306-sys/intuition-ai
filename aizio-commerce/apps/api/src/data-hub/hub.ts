import { createHash } from "node:crypto";
import type { Repository } from "../db/repository.ts";
import { defaultRateLimiter } from "./rate-limit.ts";
import { nowIso } from "../shared/ids.ts";

export interface SnapshotInput {
  source: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  ttlMs?: number;
}

export function payloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function freshnessOf(capturedAt: string, ttlMs = 30 * 60_000, now = Date.now()): "FRESH" | "AGING" | "STALE" | "UNKNOWN" {
  const t = Date.parse(capturedAt);
  if (!Number.isFinite(t)) return "UNKNOWN";
  const age = now - t;
  if (age < ttlMs * 0.4) return "FRESH";
  if (age < ttlMs) return "AGING";
  return "STALE";
}

/**
 * Shared fact layer so departments do not stampede external APIs.
 */
export class DataHub {
  constructor(
    private readonly repo: Repository,
    private readonly limiter = defaultRateLimiter,
  ) {}

  remember(input: SnapshotInput): string {
    const hash = payloadHash(input.payload);
    const capturedAt = nowIso();
    const expiresAt = input.ttlMs ? new Date(Date.now() + input.ttlMs).toISOString() : null;
    return this.repo.saveSnapshot({
      source: input.source,
      entityType: input.entityType,
      entityId: input.entityId,
      payloadHash: hash,
      payload: input.payload,
      capturedAt,
      expiresAt,
      freshness: freshnessOf(capturedAt, input.ttlMs ?? 30 * 60_000),
    });
  }

  latest(source: string, entityType: string, entityId: string) {
    return this.repo.latestSnapshot(source, entityType, entityId);
  }

  canCall(provider: string) {
    return this.limiter.canCall(provider);
  }

  recordCall(provider: string, ok: boolean) {
    const circuit = this.limiter.record(provider, ok);
    this.repo.recordApiEvent({
      provider,
      ok,
      status: ok ? 200 : 0,
      error: ok ? null : "call_failed",
      circuit,
    });
    return circuit;
  }
}
