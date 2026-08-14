/**
 * TossConnectionManager — OAuth2 Client Credentials against official OpenAPI v1.2.14
 * Source: https://openapi.tossinvest.com/openapi-docs/latest/openapi.json
 * - POST /oauth2/token (no refresh token; re-issue on expiry; one active token per client)
 * - Account APIs require X-Tossinvest-Account
 * - REST only
 */
import type { BrokerHealth, TossConnectionState } from '@aizio/trade-shared';
import { env, tossCredentialsPresent, redactSecrets } from '../config/env.js';
import { emitEvent } from '../services/events.js';
import { prisma } from '../db/client.js';

export type RateLimitGroup =
  | 'AUTH'
  | 'ACCOUNT'
  | 'ASSET'
  | 'MARKET_DATA'
  | 'ORDER'
  | 'ORDER_HISTORY'
  | 'ORDER_INFO'
  | 'STOCK'
  | 'STOCK_ALL'
  | 'MARKET_INFO'
  | 'RANKING';

const RATE_LIMITS: Record<string, number> = {
  AUTH: 5,
  ACCOUNT: 1,
  ASSET: 5,
  MARKET_DATA: 15,
  ORDER: 10,
  ORDER_HISTORY: 5,
  ORDER_INFO: 6,
  STOCK: 5,
  STOCK_ALL: 1,
  MARKET_INFO: 3,
  RANKING: 5,
};

class RateLimiter {
  private buckets = new Map<string, { tokens: number; updatedAt: number; limit: number }>();
  lastRateLimitedAt: Date | null = null;

  async take(group: string): Promise<void> {
    const limit = RATE_LIMITS[group] ?? 5;
    const now = Date.now();
    let b = this.buckets.get(group);
    if (!b) {
      b = { tokens: limit, updatedAt: now, limit };
      this.buckets.set(group, b);
    }
    const elapsed = (now - b.updatedAt) / 1000;
    b.tokens = Math.min(limit, b.tokens + elapsed * limit);
    b.updatedAt = now;
    if (b.tokens < 1) {
      this.lastRateLimitedAt = new Date();
      const waitMs = Math.ceil(((1 - b.tokens) / limit) * 1000);
      await new Promise((r) => setTimeout(r, waitMs));
      return this.take(group);
    }
    b.tokens -= 1;
  }

  snapshot() {
    const out: Record<string, { remainingApprox: number; limit: number }> = {};
    for (const [k, b] of this.buckets) {
      out[k] = { remainingApprox: Math.floor(b.tokens), limit: b.limit };
    }
    return out;
  }
}

export class TossConnectionManager {
  private state: TossConnectionState = 'NOT_CONFIGURED';
  private token: { accessToken: string; expiresAt: number } | null = null;
  private lastError: string | null = null;
  private lastHealth: BrokerHealth | null = null;
  private clockSkewMs = 0;
  private accountSeq: string;
  readonly limiter = new RateLimiter();

  constructor(
    private readonly clientId = env.TOSS_CLIENT_ID,
    private readonly clientSecret = env.TOSS_CLIENT_SECRET,
    accountSeq = env.TOSS_ACCOUNT_SEQ,
    private readonly baseUrl = env.TOSS_API_BASE_URL,
  ) {
    this.accountSeq = accountSeq;
    const c = tossCredentialsPresent();
    if (!c.clientId || !c.clientSecret) this.state = 'NOT_CONFIGURED';
  }

  getState(): TossConnectionState {
    return this.state;
  }

  getLastHealth(): BrokerHealth | null {
    return this.lastHealth;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getAccountSeq(): string {
    return this.accountSeq;
  }

  setAccountSeq(seq: string) {
    this.accountSeq = String(seq);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getClockSkewMs(): number {
    return this.clockSkewMs;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  hasAccountSeq(): boolean {
    return Boolean(this.accountSeq);
  }

  async authenticate(): Promise<void> {
    if (!this.isConfigured()) {
      this.state = 'NOT_CONFIGURED';
      throw new Error('TOSS_NOT_CONFIGURED');
    }
    this.state = 'AUTHENTICATING';
    try {
      await this.ensureToken(true);
      this.state = 'CONNECTED';
      this.lastError = null;
      await this.ensureAccountSeq().catch(() => undefined);
      await emitEvent('BROKER_CONNECTED', 'Toss authentication OK', 'info');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'auth-failed';
      this.lastError = msg;
      if (msg.includes('429')) this.state = 'RATE_LIMITED';
      else this.state = 'AUTH_FAILED';
      await emitEvent('BROKER_DISCONNECTED', `Toss auth failed (${classifyAuthError(msg)})`, 'error');
      throw e;
    }
  }

  /**
   * GET /api/v1/accounts does NOT need X-Tossinvest-Account — it returns accountSeq.
   * Persist discovered seq for subsequent account-scoped calls.
   */
  async ensureAccountSeq(): Promise<string> {
    if (this.accountSeq) return this.accountSeq;
    const data = await this.api<{
      result?: Array<{ accountNo: string; accountSeq: number; accountType: string }> | { accounts: Array<{ accountSeq: number }> };
    }>('GET', '/api/v1/accounts', 'ACCOUNT', false);
    const list = Array.isArray(data.result)
      ? data.result
      : (data.result as { accounts?: Array<{ accountSeq: number }> } | undefined)?.accounts ?? [];
    const first = list[0];
    if (!first || first.accountSeq == null) throw new Error('TOSS_NO_ACCOUNT');
    this.accountSeq = String(first.accountSeq);
    await prisma.configKv.upsert({
      where: { key: 'toss_account_seq' },
      create: { key: 'toss_account_seq', valueJson: JSON.stringify({ accountSeq: this.accountSeq, source: 'AUTO' }) },
      update: { valueJson: JSON.stringify({ accountSeq: this.accountSeq, source: 'AUTO' }) },
    });
    await emitEvent('ACCOUNT_SEQ_AUTO', `accountSeq auto-discovered (value not logged)`, 'info');
    return this.accountSeq;
  }

  async ensureToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }
    await this.limiter.take('AUTH');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const started = Date.now();
    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (res.status === 429) {
      this.state = 'RATE_LIMITED';
      const retry = Number(res.headers.get('Retry-After') ?? '1');
      await new Promise((r) => setTimeout(r, retry * 1000));
      return this.ensureToken(true);
    }
    if (!res.ok) {
      const text = await res.text();
      void redactSecrets(text);
      throw new Error(`TOSS_TOKEN_FAILED:${res.status}:${classifyAuthError(text)}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    // rough clock sync via response timing
    this.clockSkewMs = Date.now() - started;
    if (!force) await emitEvent('TOKEN_REFRESHED', 'Toss access token issued/reissued', 'info');
    this.state = 'CONNECTED';
    return this.token.accessToken;
  }

  async api<T>(
    method: string,
    path: string,
    group: RateLimitGroup,
    needsAccount: boolean,
    body?: unknown,
  ): Promise<T> {
    if (!this.isConfigured()) throw new Error('TOSS_NOT_CONFIGURED');
    try {
      await this.limiter.take(group);
      const token = await this.ensureToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      if (needsAccount) {
        if (!this.accountSeq) throw new Error('TOSS_ACCOUNT_SEQ_REQUIRED');
        headers['X-Tossinvest-Account'] = this.accountSeq;
      }
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (res.status === 429) {
        this.state = 'RATE_LIMITED';
        const retry = Number(res.headers.get('Retry-After') ?? '1');
        await new Promise((r) => setTimeout(r, retry * 1000));
        return this.api(method, path, group, needsAccount, body);
      }
      if (res.status === 401) {
        this.token = null;
        const token2 = await this.ensureToken(true);
        headers.Authorization = `Bearer ${token2}`;
        const retryRes = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          const t = await retryRes.text();
          this.state = 'AUTH_FAILED';
          throw new Error(`TOSS_API_${retryRes.status}:${t.slice(0, 200)}`);
        }
        this.state = 'CONNECTED';
        return (await retryRes.json()) as T;
      }
      if (!res.ok) {
        const t = await res.text();
        if (res.status >= 500) this.state = 'DEGRADED';
        throw new Error(`TOSS_API_${res.status}:${t.slice(0, 300)}`);
      }
      if (this.state === 'RATE_LIMITED' || this.state === 'DEGRADED') this.state = 'CONNECTED';
      return (await res.json()) as T;
    } catch (e) {
      if (this.state === 'CONNECTED') this.state = 'DEGRADED';
      throw e;
    }
  }

  async verifyAccountReadOnly(): Promise<BrokerHealth> {
    const health: BrokerHealth = {
      authentication: false,
      account: false,
      buyingPower: false,
      positions: false,
      openOrders: false,
      executions: false,
      checkedAt: new Date().toISOString(),
      connectionState: this.state,
    };
    try {
      await this.authenticate();
      health.authentication = true;
    } catch {
      health.connectionState = this.state;
      this.lastHealth = health;
      await this.persistHealth(health);
      return health;
    }

    try {
      await this.ensureAccountSeq();
      health.account = true;
    } catch {
      /* leave false */
    }
    try {
      await this.ensureAccountSeq();
      await this.api('GET', '/api/v1/buying-power?currency=KRW', 'ORDER_INFO', true);
      health.buyingPower = true;
    } catch {
      /* */
    }
    try {
      await this.api('GET', '/api/v1/holdings', 'ASSET', true);
      health.positions = true;
    } catch {
      /* */
    }
    try {
      await this.api('GET', '/api/v1/orders?status=OPEN', 'ORDER_HISTORY', true);
      health.openOrders = true;
    } catch {
      /* */
    }
    try {
      await this.api('GET', '/api/v1/orders?status=CLOSED&limit=20', 'ORDER_HISTORY', true);
      health.executions = true;
    } catch {
      /* */
    }

    health.connectionState = this.state;
    this.lastHealth = health;
    await this.persistHealth(health);
    return health;
  }

  private async persistHealth(health: BrokerHealth) {
    await prisma.configKv.upsert({
      where: { key: 'broker_health' },
      create: { key: 'broker_health', valueJson: JSON.stringify(health) },
      update: { valueJson: JSON.stringify(health) },
    });
  }
}

export function classifyAuthError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('invalid_client')) return 'INVALID_CLIENT';
  if (s.includes('access_denied') || s.includes('ip address')) return 'IP_NOT_ALLOWED';
  if (s.includes('invalid_request')) return 'INVALID_REQUEST';
  if (s.includes('429') || s.includes('rate')) return 'RATE_LIMITED';
  if (s.includes('401')) return 'UNAUTHORIZED';
  if (s.includes('403')) return 'FORBIDDEN';
  return 'AUTH_ERROR';
}

let singleton: TossConnectionManager | null = null;

export function getTossConnection(): TossConnectionManager {
  if (!singleton) singleton = new TossConnectionManager();
  return singleton;
}

/** Test helper */
export function resetTossConnectionForTests(manager?: TossConnectionManager) {
  singleton = manager ?? null;
}
