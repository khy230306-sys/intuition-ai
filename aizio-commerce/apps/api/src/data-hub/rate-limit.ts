export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProviderQuota {
  requestsPerSec: number;
  requestsPerMin: number;
  maxConcurrent: number;
  openAfterFailures: number;
  openMs: number;
}

const DEFAULT_QUOTA: ProviderQuota = {
  requestsPerSec: 1,
  requestsPerMin: 30,
  maxConcurrent: 2,
  openAfterFailures: 5,
  openMs: 30_000,
};

interface Bucket {
  sec: number[];
  min: number[];
  failures: number;
  successes: number;
  circuit: CircuitState;
  openedAt: number;
  quota: ProviderQuota;
}

export class RateLimitManager {
  private buckets = new Map<string, Bucket>();

  constructor(private readonly quotas: Record<string, Partial<ProviderQuota>> = {}) {}

  private bucket(provider: string): Bucket {
    const existing = this.buckets.get(provider);
    if (existing) return existing;
    const quota = { ...DEFAULT_QUOTA, ...(this.quotas[provider] ?? {}) };
    const created: Bucket = {
      sec: [],
      min: [],
      failures: 0,
      successes: 0,
      circuit: "CLOSED",
      openedAt: 0,
      quota,
    };
    this.buckets.set(provider, created);
    return created;
  }

  snapshot(provider: string): { circuit: CircuitState; failures: number; successes: number } {
    const b = this.bucket(provider);
    return { circuit: b.circuit, failures: b.failures, successes: b.successes };
  }

  canCall(provider: string, now = Date.now()): { ok: boolean; circuit: CircuitState; retryAfterMs: number } {
    const b = this.bucket(provider);
    this.tickCircuit(b, now);
    if (b.circuit === "OPEN") {
      return { ok: false, circuit: "OPEN", retryAfterMs: Math.max(0, b.quota.openMs - (now - b.openedAt)) };
    }
    b.sec = b.sec.filter((t) => now - t < 1000);
    b.min = b.min.filter((t) => now - t < 60_000);
    if (b.sec.length >= b.quota.requestsPerSec || b.min.length >= b.quota.requestsPerMin) {
      return { ok: false, circuit: b.circuit, retryAfterMs: 1000 };
    }
    return { ok: true, circuit: b.circuit, retryAfterMs: 0 };
  }

  record(provider: string, ok: boolean, now = Date.now()): CircuitState {
    const b = this.bucket(provider);
    b.sec.push(now);
    b.min.push(now);
    if (ok) {
      b.successes += 1;
      b.failures = 0;
      if (b.circuit === "HALF_OPEN") b.circuit = "CLOSED";
    } else {
      b.failures += 1;
      if (b.circuit === "HALF_OPEN" || b.failures >= b.quota.openAfterFailures) {
        b.circuit = "OPEN";
        b.openedAt = now;
      }
    }
    return b.circuit;
  }

  recordFailure(provider: string, now = Date.now()): CircuitState {
    return this.record(provider, false, now);
  }

  recordSuccess(provider: string, now = Date.now()): CircuitState {
    return this.record(provider, true, now);
  }

  forceHalfOpen(provider: string): CircuitState {
    const b = this.bucket(provider);
    b.circuit = "HALF_OPEN";
    return b.circuit;
  }

  private tickCircuit(b: Bucket, now: number): void {
    if (b.circuit === "OPEN" && now - b.openedAt >= b.quota.openMs) {
      b.circuit = "HALF_OPEN";
    }
  }
}

export const defaultRateLimiter = new RateLimitManager({
  cjdropshipping: { requestsPerSec: 1, requestsPerMin: 50, openAfterFailures: 5 },
  coupang: { requestsPerSec: 2, requestsPerMin: 40 },
  naver: { requestsPerSec: 2, requestsPerMin: 40 },
  frankfurter: { requestsPerSec: 2, requestsPerMin: 30 },
  openai: { requestsPerSec: 2, requestsPerMin: 60 },
  gemini: { requestsPerSec: 2, requestsPerMin: 60 },
  claude: { requestsPerSec: 2, requestsPerMin: 60 },
});
