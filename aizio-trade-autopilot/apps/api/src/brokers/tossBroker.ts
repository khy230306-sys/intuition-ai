/**
 * TossBrokerAdapter — official OpenAPI v1.2.14 via TossConnectionManager
 * Dry-run/preview order endpoint: NOT provided by Toss → use LIVE_OBSERVE / SHADOW.
 * placeOrder blocked unless allowLiveOrders=true (ALLOW_LIVE + gate).
 */
import type { Quote } from '@aizio/trade-shared';
import { getTossConnection } from './tossConnection.js';
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

export class TossBrokerAdapter implements BrokerAdapter {
  readonly name = 'toss';
  /** Hard lock: never place live orders unless explicitly enabled by LIVE gate. */
  allowLiveOrders = false;

  constructor(private readonly conn = getTossConnection()) {}

  isConfigured(): boolean {
    return this.conn.isConfigured();
  }

  async connect(): Promise<void> {
    await this.conn.authenticate();
  }

  async health() {
    const state = this.conn.getState();
    if (state === 'NOT_CONFIGURED') {
      return { ok: false, status: 'NOT_CONFIGURED', detail: 'Set TOSS_* in .env' };
    }
    return {
      ok: state === 'CONNECTED',
      status: state,
      detail: this.conn.getLastError() ?? undefined,
    };
  }

  async getAccount(): Promise<BrokerAccount> {
    // accounts list does not require X-Tossinvest-Account
    const data = await this.conn.api<{
      result?:
        | Array<{ accountNo: string; accountSeq: number; accountType: string }>
        | { accounts: Array<{ accountNo: string; accountSeq: number; accountType: string }> };
    }>('GET', '/api/v1/accounts', 'ACCOUNT', false);
    const accounts = Array.isArray(data.result)
      ? data.result
      : (data.result as { accounts?: Array<{ accountNo: string; accountSeq: number; accountType: string }> } | undefined)
          ?.accounts ?? [];
    const acc = accounts[0];
    if (!acc) throw new Error('no-account');
    this.conn.setAccountSeq(String(acc.accountSeq));
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
    await this.conn.ensureAccountSeq();
    const data = await this.conn.api<{ result?: { currency: string; cashBuyingPower: string } }>(
      'GET',
      '/api/v1/buying-power?currency=KRW',
      'ORDER_INFO',
      true,
    );
    const r = data.result ?? (data as unknown as { currency: string; cashBuyingPower: string });
    return { currency: r.currency, cashBuyingPower: Number(r.cashBuyingPower) };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    await this.conn.ensureAccountSeq();
    const data = await this.conn.api<{ result?: { items: Array<Record<string, unknown>> } }>(
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
    await this.conn.ensureAccountSeq();
    const data = await this.conn.api<{ result?: { orders: Array<Record<string, unknown>> } }>(
      'GET',
      '/api/v1/orders?status=OPEN',
      'ORDER_HISTORY',
      true,
    );
    return (data.result?.orders ?? []).map((o) => this.mapOrder(o));
  }

  async getQuote(symbol: string): Promise<BrokerQuote> {
    // Prefer market-data provider (rankings-enriched volume/value/change)
    try {
      const { getTossMarketDataProvider } = await import('../marketdata/index.js');
      const q = await getTossMarketDataProvider().getQuote(symbol);
      return {
        symbol: q.symbol,
        lastPrice: q.price,
        bid: q.bid,
        ask: q.ask,
        volume: q.volume,
        value: q.tradingValue,
        changePct: q.changePct,
        timestamp: new Date(q.marketTimestamp),
        source: 'TOSS',
        freshnessMs: q.ageMs,
      };
    } catch {
      /* fall through to raw prices */
    }
    const priceRes = await this.conn.api<unknown>(
      'GET',
      `/api/v1/prices?symbols=${encodeURIComponent(symbol)}`,
      'MARKET_DATA',
      false,
    );
    const prices = unwrapList(priceRes, 'prices');
    const p = prices[0] ?? {};
    const last = Number(p.lastPrice);
    let bid = last;
    let ask = last;
    try {
      const bookRes = await this.conn.api<unknown>(
        'GET',
        `/api/v1/orderbook?symbol=${encodeURIComponent(symbol)}`,
        'MARKET_DATA',
        false,
      );
      const book = unwrapObj(bookRes);
      bid = Number((book.bids as Array<{ price: string }>)?.[0]?.price ?? last);
      ask = Number((book.asks as Array<{ price: string }>)?.[0]?.price ?? last);
    } catch {
      /* */
    }
    const ts = new Date(String(p.timestamp ?? Date.now()));
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
    if (!this.allowLiveOrders) {
      throw new Error('LIVE_ORDERS_LOCKED: ALLOW_LIVE gate required; use LIVE_OBSERVE/SHADOW');
    }
    await this.conn.ensureAccountSeq();
    const body: Record<string, unknown> = {
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: String(order.quantity),
      timeInForce: order.timeInForce ?? 'DAY',
    };
    if (order.orderType === 'LIMIT') body.price = String(order.price);
    const data = await this.conn.api<{ result?: { orderId: string } }>(
      'POST',
      '/api/v1/orders',
      'ORDER',
      true,
      body,
    );
    const orderId = data.result?.orderId ?? (data as unknown as { orderId: string }).orderId;
    return this.getOrder(orderId);
  }

  async cancelOrder(orderId: string): Promise<BrokerOrder> {
    if (!this.allowLiveOrders) throw new Error('LIVE_ORDERS_LOCKED');
    await this.conn.api('POST', `/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, 'ORDER', true, {});
    return this.getOrder(orderId);
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    await this.conn.ensureAccountSeq();
    const data = await this.conn.api<{ result?: Record<string, unknown> }>(
      'GET',
      `/api/v1/orders/${encodeURIComponent(orderId)}`,
      'ORDER_HISTORY',
      true,
    );
    return this.mapOrder(data.result ?? (data as unknown as Record<string, unknown>));
  }

  async getExecutions(): Promise<BrokerExecution[]> {
    await this.conn.ensureAccountSeq();
    const data = await this.conn.api<{ result?: { orders: Array<Record<string, unknown>> } }>(
      'GET',
      '/api/v1/orders?status=CLOSED&limit=50',
      'ORDER_HISTORY',
      true,
    );
    const out: BrokerExecution[] = [];
    for (const o of data.result?.orders ?? []) {
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
    return this.conn.api('GET', `/api/v1/market-calendar/${market}`, 'MARKET_INFO', false);
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
}

export function createTossBroker(): TossBrokerAdapter {
  return new TossBrokerAdapter();
}

function unwrapList(data: unknown, key: string): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const obj = data as { result?: unknown };
  const r = obj.result;
  if (Array.isArray(r)) return r as Array<Record<string, unknown>>;
  if (r && typeof r === 'object' && Array.isArray((r as Record<string, unknown>)[key])) {
    return (r as Record<string, unknown>)[key] as Array<Record<string, unknown>>;
  }
  if (r && typeof r === 'object') return [r as Record<string, unknown>];
  return [];
}

function unwrapObj(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && 'result' in (data as object)) {
    return ((data as { result: Record<string, unknown> }).result as Record<string, unknown>) ?? {};
  }
  return (data as Record<string, unknown>) ?? {};
}
