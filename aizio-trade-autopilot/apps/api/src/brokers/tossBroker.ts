/**
 * TossBrokerAdapter — implemented against official Toss Open API v1.2.14
 * Source of truth: https://openapi.tossinvest.com/openapi-docs/latest/openapi.json
 * Docs: https://developers.tossinvest.com/llms.txt
 *
 * Confirmed:
 * - Auth: OAuth2 Client Credentials POST /oauth2/token (no refresh token; re-issue)
 * - Base: https://openapi.tossinvest.com
 * - Account header: X-Tossinvest-Account: {accountSeq}
 * - REST only — WebSocket/Streaming NOT provided (TODO_PROVIDER_IMPLEMENTATION if added later)
 * - clientOrderId is idempotency key (10 min TTL)
 *
 * Rate limits (client × group TPS) per official overview — enforced client-side.
 */

import { env, tossConfigured, redactSecrets } from '../config/env.js';
import type {
  BrokerAdapter,
  BrokerAccount,
  BrokerBuyingPower,
  BrokerExecution,
  BrokerOrder,
  BrokerPosition,
  BrokerQuote,
  PlaceOrderRequest,
} from './types.js';

type TokenCache = { accessToken: string; expiresAt: number };

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
};

class RateLimiter {
  private buckets = new Map<string, { tokens: number; updatedAt: number; limit: number }>();

  async take(group: string) {
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
      const waitMs = Math.ceil(((1 - b.tokens) / limit) * 1000);
      await new Promise((r) => setTimeout(r, waitMs));
      return this.take(group);
    }
    b.tokens -= 1;
  }
}

export class TossBrokerAdapter implements BrokerAdapter {
  readonly name = 'toss';
  private token: TokenCache | null = null;
  private connected = false;
  private limiter = new RateLimiter();
  private lastError: string | null = null;

  constructor(
    private readonly clientId = env.TOSS_CLIENT_ID,
    private readonly clientSecret = env.TOSS_CLIENT_SECRET,
    private readonly accountSeq = env.TOSS_ACCOUNT_SEQ,
    private readonly baseUrl = env.TOSS_API_BASE_URL,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async connect(): Promise<void> {
    if (!this.isConfigured()) {
      this.connected = false;
      this.lastError = 'TOSS credentials NOT_CONFIGURED';
      throw new Error('TOSS_NOT_CONFIGURED');
    }
    await this.ensureToken();
    this.connected = true;
    this.lastError = null;
  }

  async health() {
    if (!this.isConfigured()) {
      return { ok: false, status: 'NOT_CONFIGURED', detail: 'Set TOSS_CLIENT_ID/TOSS_CLIENT_SECRET in .env' };
    }
    try {
      await this.ensureToken();
      return { ok: true, status: 'CONNECTED', detail: this.lastError ?? undefined };
    } catch (e) {
      return { ok: false, status: 'ERROR', detail: e instanceof Error ? e.message : 'token-failed' };
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.api<{ result: { accounts: Array<{ accountNo: string; accountSeq: number; accountType: string }> } }>(
      'GET',
      '/api/v1/accounts',
      'ACCOUNT',
      true,
    );
    const accounts = data.result?.accounts ?? (data as unknown as { accounts?: typeof data.result.accounts }).accounts ?? [];
    const acc = accounts[0];
    if (!acc) throw new Error('no-account');
    const bp = await this.getBuyingPower();
    return {
      accountNo: acc.accountNo,
      accountSeq: String(acc.accountSeq),
      accountType: acc.accountType,
      currency: bp.currency,
      cash: bp.cashBuyingPower,
    };
  }

  async getBuyingPower(): Promise<BrokerBuyingPower> {
    const data = await this.api<{ result: { currency: string; cashBuyingPower: string } }>(
      'GET',
      '/api/v1/buying-power?currency=KRW',
      'ORDER_INFO',
      true,
    );
    const r = data.result ?? (data as unknown as { currency: string; cashBuyingPower: string });
    return {
      currency: r.currency,
      cashBuyingPower: Number(r.cashBuyingPower),
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.api<{ result: { items: Array<Record<string, unknown>> } }>(
      'GET',
      '/api/v1/holdings',
      'ASSET',
      true,
    );
    const items = data.result?.items ?? [];
    return items.map((it) => ({
      symbol: String(it.symbol),
      name: String(it.name ?? it.symbol),
      quantity: Number(it.quantity),
      averagePurchasePrice: Number(it.averagePurchasePrice),
      lastPrice: Number(it.lastPrice),
      marketValue: Number((it.marketValue as { amount?: string } | undefined)?.amount ?? 0),
    }));
  }

  async getOpenOrders(): Promise<BrokerOrder[]> {
    const data = await this.api<{ result: { orders: Array<Record<string, unknown>> } }>(
      'GET',
      '/api/v1/orders?status=OPEN',
      'ORDER_HISTORY',
      true,
    );
    const orders = data.result?.orders ?? [];
    return orders.map((o) => this.mapOrder(o));
  }

  async getQuote(symbol: string): Promise<BrokerQuote> {
    const [priceRes, bookRes] = await Promise.all([
      this.api<{ result: { symbol: string; lastPrice: string; timestamp?: string; currency: string } }>(
        'GET',
        `/api/v1/prices?symbols=${encodeURIComponent(symbol)}`,
        'MARKET_DATA',
        false,
      ),
      this.api<{ result: { asks: Array<{ price: string }>; bids: Array<{ price: string }>; timestamp?: string } }>(
        'GET',
        `/api/v1/orderbook?symbol=${encodeURIComponent(symbol)}`,
        'MARKET_DATA',
        false,
      ),
    ]);
    // Response envelope may be { result: T } or T / array depending on endpoint — tolerate both.
    const priceBody = (priceRes as { result?: unknown }).result ?? priceRes;
    const prices = Array.isArray(priceBody) ? priceBody : (priceBody as { prices?: unknown[] }).prices ?? [priceBody];
    const p = prices[0] as { symbol: string; lastPrice: string; timestamp?: string };
    const book = ((bookRes as { result?: unknown }).result ?? bookRes) as {
      asks: Array<{ price: string }>;
      bids: Array<{ price: string }>;
      timestamp?: string;
    };
    const last = Number(p.lastPrice);
    const bid = Number(book.bids?.[0]?.price ?? last);
    const ask = Number(book.asks?.[0]?.price ?? last);
    const ts = new Date(p.timestamp ?? book.timestamp ?? Date.now());
    return {
      symbol,
      lastPrice: last,
      bid,
      ask,
      volume: 0,
      value: 0,
      changePct: 0,
      timestamp: ts,
      source: 'TOSS',
      freshnessMs: Date.now() - ts.getTime(),
    };
  }

  async placeOrder(order: PlaceOrderRequest): Promise<BrokerOrder> {
    const body: Record<string, unknown> = {
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: String(order.quantity),
      timeInForce: order.timeInForce ?? 'DAY',
    };
    if (order.orderType === 'LIMIT') body.price = String(order.price);
    const data = await this.api<{ result: { orderId: string; clientOrderId?: string | null } }>(
      'POST',
      '/api/v1/orders',
      'ORDER',
      true,
      body,
    );
    const r = data.result ?? (data as unknown as { orderId: string; clientOrderId?: string });
    return this.getOrder(r.orderId);
  }

  async cancelOrder(orderId: string): Promise<BrokerOrder> {
    await this.api('POST', `/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, 'ORDER', true, {});
    return this.getOrder(orderId);
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const data = await this.api<{ result: Record<string, unknown> }>(
      'GET',
      `/api/v1/orders/${encodeURIComponent(orderId)}`,
      'ORDER_HISTORY',
      true,
    );
    const o = data.result ?? (data as unknown as Record<string, unknown>);
    return this.mapOrder(o);
  }

  async getExecutions(): Promise<BrokerExecution[]> {
    // Official OpenAPI has order detail execution summary; dedicated executions list endpoint
    // is not separately documented beyond order history. Derive from CLOSED orders.
    const data = await this.api<{ result: { orders: Array<Record<string, unknown>> } }>(
      'GET',
      '/api/v1/orders?status=CLOSED&limit=50',
      'ORDER_HISTORY',
      true,
    );
    const orders = data.result?.orders ?? [];
    const out: BrokerExecution[] = [];
    for (const o of orders) {
      const ex = o.execution as Record<string, unknown> | undefined;
      if (!ex || Number(ex.filledQuantity) <= 0) continue;
      out.push({
        orderId: String(o.orderId),
        symbol: String(o.symbol),
        side: o.side as 'BUY' | 'SELL',
        quantity: Number(ex.filledQuantity),
        price: Number(ex.averageFilledPrice ?? 0),
        commission: Number(ex.commission ?? 0),
        tax: Number(ex.tax ?? 0),
        executedAt: new Date(String(ex.filledAt ?? o.orderedAt ?? Date.now())),
      });
    }
    return out;
  }

  async getMarketCalendar(market: 'KR' | 'US') {
    return this.api('GET', `/api/v1/market-calendar/${market}`, 'MARKET_INFO', false);
  }

  async listAllStocks() {
    return this.api('GET', '/api/v1/stocks/all', 'STOCK_ALL', false);
  }

  private mapOrder(o: Record<string, unknown>): BrokerOrder {
    const ex = (o.execution as Record<string, unknown>) || {};
    return {
      orderId: String(o.orderId),
      clientOrderId: (o.clientOrderId as string | null) ?? null,
      symbol: String(o.symbol),
      side: o.side as 'BUY' | 'SELL',
      orderType: o.orderType as 'LIMIT' | 'MARKET',
      quantity: Number(o.quantity),
      price: o.price != null ? Number(o.price) : null,
      status: String(o.status),
      filledQuantity: Number(ex.filledQuantity ?? 0),
      averageFilledPrice: ex.averageFilledPrice != null ? Number(ex.averageFilledPrice) : null,
      commission: ex.commission != null ? Number(ex.commission) : 0,
      tax: ex.tax != null ? Number(ex.tax) : 0,
      orderedAt: o.orderedAt ? new Date(String(o.orderedAt)) : undefined,
    };
  }

  private async ensureToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }
    await this.limiter.take('AUTH');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      this.lastError = `token HTTP ${res.status}`;
      throw new Error(`TOSS_TOKEN_FAILED:${res.status}:${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return this.token.accessToken;
  }

  private async api<T>(
    method: string,
    path: string,
    group: string,
    needsAccount: boolean,
    body?: unknown,
  ): Promise<T> {
    if (!this.isConfigured()) throw new Error('TOSS_NOT_CONFIGURED');
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
      const retry = Number(res.headers.get('Retry-After') ?? '1');
      await new Promise((r) => setTimeout(r, retry * 1000));
      return this.api(method, path, group, needsAccount, body);
    }
    if (res.status === 401) {
      this.token = null;
      const token2 = await this.ensureToken();
      headers.Authorization = `Bearer ${token2}`;
      const retryRes = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!retryRes.ok) {
        const t = await retryRes.text();
        throw new Error(`TOSS_API_${retryRes.status}:${t.slice(0, 300)}`);
      }
      return (await retryRes.json()) as T;
    }
    if (!res.ok) {
      const t = await res.text();
      // never log secrets
      void redactSecrets(t);
      throw new Error(`TOSS_API_${res.status}:${t.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }
}

export function createTossBroker(): TossBrokerAdapter {
  return new TossBrokerAdapter();
}

export { tossConfigured };
