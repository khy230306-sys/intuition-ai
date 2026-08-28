import { newId } from '../utils/id.js';
import { round, clamp } from '../utils/math.js';
import type { MarketDataProvider } from '../marketdata/types.js';
import { quoteToBrokerQuote } from '../marketdata/types.js';
import { loadPaperState, savePaperState } from './paperPersist.js';
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

interface PaperState {
  cash: number;
  positions: Map<string, { quantity: number; avgPrice: number; name: string }>;
  orders: Map<string, BrokerOrder>;
  executions: BrokerExecution[];
  clientOrderIndex: Map<string, string>;
}

const FEE_RATE = 0.00015; // 1.5bp
const SELL_TAX_RATE = 0.0018; // KR sell tax approx for paper
const BASE_SLIPPAGE = 0.0005;

export class PaperBrokerAdapter implements BrokerAdapter {
  readonly name = 'paper';
  private connected = false;
  private state: PaperState;

  constructor(
    private market: MarketDataProvider,
    initialCash = 3_000_000,
  ) {
    this.state = {
      cash: initialCash,
      positions: new Map(),
      orders: new Map(),
      executions: [],
      clientOrderIndex: new Map(),
    };
  }

  setMarketProvider(market: MarketDataProvider) {
    this.market = market;
  }

  setCash(cash: number) {
    this.state.cash = cash;
  }

  getCash() {
    return this.state.cash;
  }

  async resetLedger(cash: number) {
    this.state.cash = cash;
    this.state.positions.clear();
    this.state.orders.clear();
    this.state.executions = [];
    this.state.clientOrderIndex.clear();
    this.connected = true;
    await this.persist();
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      const saved = await loadPaperState();
      if (saved) {
        this.state.cash = saved.cash;
        this.state.positions = new Map(
          saved.positions.map((p) => [p.symbol, { quantity: p.quantity, avgPrice: p.avgPrice, name: p.name }]),
        );
      }
    }
    this.connected = true;
    await this.persist();
  }

  private async persist() {
    await savePaperState({
      cash: this.state.cash,
      positions: [...this.state.positions.entries()].map(([symbol, p]) => ({
        symbol,
        quantity: p.quantity,
        avgPrice: p.avgPrice,
        name: p.name,
      })),
    });
  }

  async health() {
    return {
      ok: this.connected,
      status: this.connected ? 'PAPER_MODE' : 'NOT_CONFIGURED',
      detail: 'Paper broker uses market-data quotes with spread/slippage/fees',
    };
  }

  async getAccount(): Promise<BrokerAccount> {
    this.assertConnected();
    return {
      accountNo: 'PAPER-0001',
      accountSeq: 'paper',
      accountType: 'BROKERAGE',
      currency: 'KRW',
      cash: this.state.cash,
    };
  }

  async getBuyingPower(): Promise<BrokerBuyingPower> {
    this.assertConnected();
    return { currency: 'KRW', cashBuyingPower: this.state.cash };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    this.assertConnected();
    const out: BrokerPosition[] = [];
    for (const [symbol, p] of this.state.positions) {
      const q = quoteToBrokerQuote(await this.market.getQuote(symbol));
      out.push({
        symbol,
        name: p.name || symbol,
        quantity: p.quantity,
        averagePurchasePrice: p.avgPrice,
        lastPrice: q.lastPrice,
        marketValue: p.quantity * q.lastPrice,
      });
    }
    return out;
  }

  async getOpenOrders(): Promise<BrokerOrder[]> {
    this.assertConnected();
    return [...this.state.orders.values()].filter((o) =>
      ['PENDING', 'PARTIAL_FILLED', 'PENDING_CANCEL'].includes(String(o.status)),
    );
  }

  async getQuote(symbol: string): Promise<BrokerQuote> {
    this.assertConnected();
    return quoteToBrokerQuote(await this.market.getQuote(symbol));
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrder> {
    this.assertConnected();
    const existingId = this.state.clientOrderIndex.get(req.clientOrderId);
    if (existingId) {
      const existing = this.state.orders.get(existingId);
      if (existing) return existing;
    }

    const quote = quoteToBrokerQuote(await this.market.getQuote(req.symbol));
    const mid = quote.lastPrice;
    const spreadPct = mid > 0 ? ((quote.ask - quote.bid) / mid) * 100 : 99;
    const slip = BASE_SLIPPAGE + spreadPct / 100 / 4;

    let fillPrice: number;
    if (req.orderType === 'MARKET') {
      fillPrice = req.side === 'BUY' ? quote.ask * (1 + slip) : quote.bid * (1 - slip);
    } else {
      const limit = req.price ?? mid;
      if (req.side === 'BUY' && limit < quote.ask) {
        return this.reject(req, 'limit-not-marketable');
      }
      if (req.side === 'SELL' && limit > quote.bid) {
        return this.reject(req, 'limit-not-marketable');
      }
      fillPrice = req.side === 'BUY' ? Math.min(limit, quote.ask * (1 + slip)) : Math.max(limit, quote.bid * (1 - slip));
    }
    fillPrice = round(fillPrice, 0);

    // latency simulation structure (deterministic short delay marker only)
    const notional = fillPrice * req.quantity;
    const commission = round(notional * FEE_RATE, 0);
    const tax = req.side === 'SELL' ? round(notional * SELL_TAX_RATE, 0) : 0;

    if (req.side === 'BUY') {
      const cost = notional + commission;
      if (cost > this.state.cash) {
        return this.reject(req, 'insufficient-buying-power');
      }
      this.state.cash -= cost;
      const prev = this.state.positions.get(req.symbol);
      if (prev) {
        const qty = prev.quantity + req.quantity;
        const avg = (prev.avgPrice * prev.quantity + fillPrice * req.quantity) / qty;
        this.state.positions.set(req.symbol, { quantity: qty, avgPrice: avg, name: prev.name });
      } else {
        this.state.positions.set(req.symbol, {
          quantity: req.quantity,
          avgPrice: fillPrice,
          name: req.symbol,
        });
      }
    } else {
      const prev = this.state.positions.get(req.symbol);
      if (!prev || prev.quantity < req.quantity) {
        return this.reject(req, 'insufficient-position');
      }
      const remain = prev.quantity - req.quantity;
      if (remain <= 0) this.state.positions.delete(req.symbol);
      else this.state.positions.set(req.symbol, { ...prev, quantity: remain });
      this.state.cash += notional - commission - tax;
    }

    const orderId = newId('pord');
    const order: BrokerOrder = {
      orderId,
      clientOrderId: req.clientOrderId,
      symbol: req.symbol,
      side: req.side,
      orderType: req.orderType,
      quantity: req.quantity,
      price: req.price ?? null,
      status: 'FILLED',
      filledQuantity: req.quantity,
      averageFilledPrice: fillPrice,
      commission,
      tax,
      orderedAt: new Date(),
    };
    this.state.orders.set(orderId, order);
    this.state.clientOrderIndex.set(req.clientOrderId, orderId);
    this.state.executions.push({
      orderId,
      symbol: req.symbol,
      side: req.side,
      quantity: req.quantity,
      price: fillPrice,
      commission,
      tax,
      executedAt: new Date(),
    });
    await this.persist();
    return order;
  }

  async cancelOrder(orderId: string): Promise<BrokerOrder> {
    const order = this.state.orders.get(orderId);
    if (!order) throw new Error('order-not-found');
    if (order.status === 'FILLED') throw new Error('order-already-filled');
    order.status = 'CANCELED';
    return order;
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const order = this.state.orders.get(orderId);
    if (!order) throw new Error('order-not-found');
    return order;
  }

  async getExecutions(): Promise<BrokerExecution[]> {
    return [...this.state.executions];
  }

  /** Reconcile helper for recovery tests */
  forcePosition(symbol: string, quantity: number, avgPrice: number) {
    if (quantity <= 0) this.state.positions.delete(symbol);
    else this.state.positions.set(symbol, { quantity, avgPrice, name: symbol });
    void this.persist();
  }

  private reject(req: PlaceOrderRequest, reason: string): BrokerOrder {
    const orderId = newId('prej');
    const order: BrokerOrder & { rejectReason: string } = {
      orderId,
      clientOrderId: req.clientOrderId,
      symbol: req.symbol,
      side: req.side,
      orderType: req.orderType,
      quantity: req.quantity,
      price: req.price ?? null,
      status: 'REJECTED',
      filledQuantity: 0,
      averageFilledPrice: null,
      orderedAt: new Date(),
      rejectReason: reason,
    };
    this.state.orders.set(orderId, order);
    this.state.clientOrderIndex.set(req.clientOrderId, orderId);
    return order;
  }

  private assertConnected() {
    if (!this.connected) throw new Error('paper-broker-not-connected');
  }
}

export function estimateSlippagePct(quote: BrokerQuote, side: 'BUY' | 'SELL'): number {
  const mid = quote.lastPrice || 1;
  const spread = Math.abs(quote.ask - quote.bid) / mid;
  return clamp(BASE_SLIPPAGE * 100 + (spread * 100) / 4, 0, 10);
}
