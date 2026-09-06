export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type BrokerOrderStatus =
  | 'PENDING'
  | 'PARTIAL_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'PENDING_CANCEL'
  | 'PENDING_REPLACE'
  | 'UNKNOWN';

export interface BrokerAccount {
  accountNo: string;
  accountSeq: string;
  accountType: string;
  currency: string;
  cash: number;
}

export interface BrokerBuyingPower {
  currency: string;
  cashBuyingPower: number;
}

export interface BrokerPosition {
  symbol: string;
  name: string;
  quantity: number;
  averagePurchasePrice: number;
  lastPrice: number;
  marketValue: number;
}

export interface BrokerQuote {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  value: number;
  changePct: number;
  timestamp: Date;
  source: string;
  freshnessMs: number;
}

export interface PlaceOrderRequest {
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  timeInForce?: 'DAY' | 'CLS';
}

export interface BrokerOrder {
  orderId: string;
  clientOrderId?: string | null;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number | null;
  status: BrokerOrderStatus | string;
  filledQuantity: number;
  averageFilledPrice?: number | null;
  commission?: number;
  tax?: number;
  orderedAt?: Date;
}

export interface BrokerExecution {
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  tax: number;
  executedAt: Date;
}

export interface BrokerAdapter {
  readonly name: string;
  connect(): Promise<void>;
  health(): Promise<{ ok: boolean; status: string; detail?: string }>;
  getAccount(): Promise<BrokerAccount>;
  getBuyingPower(): Promise<BrokerBuyingPower>;
  getPositions(): Promise<BrokerPosition[]>;
  getOpenOrders(): Promise<BrokerOrder[]>;
  getQuote(symbol: string): Promise<BrokerQuote>;
  placeOrder(order: PlaceOrderRequest): Promise<BrokerOrder>;
  cancelOrder(orderId: string): Promise<BrokerOrder>;
  getOrder(orderId: string): Promise<BrokerOrder>;
  getExecutions(): Promise<BrokerExecution[]>;
}
