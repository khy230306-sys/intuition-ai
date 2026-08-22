export type AutopilotState =
  | 'OFF'
  | 'STARTING'
  | 'RUNNING'
  | 'MARKET_CLOSED'
  | 'PAUSED'
  | 'HALTED'
  | 'ERROR';

/** PAPER = paper broker + local/replay data; PAPER_REPLAY = explicit replay universe.
 *  SHADOW = real market data + paper fills; LIVE_OBSERVE = real reads, no orders;
 *  LIVE = real orders only when ALLOW_LIVE + gate PASS.
 */
export type TradingMode = 'PAPER' | 'PAPER_REPLAY' | 'SHADOW' | 'LIVE_OBSERVE' | 'LIVE';

export type DataLane = 'REPLAY' | 'PAPER' | 'SHADOW' | 'LIVE';

export type StopMode = 'NONE' | 'STOP_NEW_ENTRIES' | 'CLOSE_AND_STOP';

export type SystemReadiness =
  | 'NOT_CONFIGURED'
  | 'PAPER_MODE'
  | 'LIVE_READY'
  | 'LIVE_RUNNING'
  | 'LIVE_OBSERVE'
  | 'SHADOW'
  | 'DEGRADED'
  | 'HALTED';

export type TossConnectionState =
  | 'NOT_CONFIGURED'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'DISCONNECTED';

export type MarketCode = 'KR' | 'US';
export type Venue = 'KRX' | 'NXT';

export type SessionPhase =
  | 'PRE_MARKET'
  | 'REGULAR'
  | 'AFTER_HOURS'
  | 'CLOSED';

export type MarketRegime =
  | 'STRONG_BULL'
  | 'BULL'
  | 'NEUTRAL'
  | 'BEAR'
  | 'STRONG_BEAR'
  | 'HIGH_VOLATILITY';

export type RiskLevel = 'STABLE' | 'BALANCED' | 'AGGRESSIVE';

export type GateResult = 'PASS' | 'WARN' | 'FAIL';

export interface MarketSession {
  market: MarketCode;
  venue?: Venue;
  tradingDate: string;
  isTradingDay: boolean;
  isOpen: boolean;
  session: SessionPhase;
  opensAt: string | null;
  closesAt: string | null;
  reason?: string;
}

export interface VenueSessions {
  tradingDate: string;
  krx: MarketSession;
  nxt: MarketSession;
  integrated: MarketSession;
}

export interface DiscoverySignal {
  symbol: string;
  strategyId: string;
  score: number;
  confidence: number;
  detectedAt: string;
  evidence: Array<{
    metric: string;
    value: number | string;
    reason: string;
  }>;
  invalidation?: string[];
}

export interface AITradeDecision {
  symbol: string;
  action: 'BUY' | 'WATCH' | 'REJECT';
  confidence: number;
  bullScore: number;
  bearScore: number;
  dataQuality: number;
  reasons: string[];
  risks: string[];
  generatedAt: string;
  signalCreatedAt?: string;
  aiStartedAt?: string;
  aiCompletedAt?: string;
  decisionAgeMs?: number;
}

export interface RiskProfile {
  maxCapital: number;
  maxPositionPct: number;
  maxOpenPositions: number;
  maxDailyLossPct: number;
  maxDrawdownPct: number;
  riskPerTradePct: number;
  maxConsecutiveLosses: number;
  maxSlippagePct: number;
  maxSpreadPct: number;
}

export interface ManagedPosition {
  symbol: string;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  strategyId: string;
  signalId: string;
  openedAt: string;
  highestPrice: number;
  lowestPrice: number;
  status: 'OPEN' | 'EXITING' | 'CLOSED';
}

export interface MarketEvidence {
  source: string;
  sourceType: 'BROKER' | 'EXCHANGE' | 'FILING' | 'NEWS' | 'ECONOMIC' | 'SOCIAL';
  symbol?: string;
  eventTime: string;
  receivedAt: string;
  confidence: number;
  freshnessMs: number;
}

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  tradingValue: number;
  changePct: number;
  marketTimestamp: string;
  receivedAt: string;
  source: 'TOSS' | 'REPLAY' | 'CACHE';
  ageMs: number;
  currency?: string;
}

export interface MarketStatus {
  market: MarketCode;
  venues: VenueSessions;
  provider: string;
  degraded: boolean;
  reason?: string;
}

export interface BrokerHealth {
  authentication: boolean;
  account: boolean;
  buyingPower: boolean;
  positions: boolean;
  openOrders: boolean;
  executions: boolean;
  checkedAt: string;
  connectionState: TossConnectionState;
}

export interface MarketEvent {
  symbol?: string;
  title: string;
  summary?: string;
  source: string;
  sourceTier: 1 | 2 | 3 | 4;
  publishedAt: string;
  receivedAt: string;
  sentiment?: number;
  relevance?: number;
  verified: boolean;
}

export interface FinalTradeCandidate {
  symbol: string;
  quantScore: number;
  aiConfidence: number;
  riskScore: number;
  dataQuality: number;
  marketRegime: string;
  action: 'BUY' | 'WATCH' | 'REJECT' | 'WOULD_BUY' | 'WOULD_SELL';
  entryPlan?: {
    price?: number;
    maxPrice?: number;
    quantity?: number;
  };
  stopLoss?: number;
  takeProfit?: number;
  validUntil: string;
  lane: DataLane;
}

export interface LiveGateCheck {
  name: string;
  result: GateResult;
  detail: string;
}

export interface HealthSnapshot {
  server: 'OK' | 'DEGRADED' | 'DOWN';
  broker: SystemReadiness | TossConnectionState;
  marketData: SystemReadiness | 'REPLAY' | 'LIVE' | 'OK' | 'DEGRADED' | 'NOT_CONFIGURED' | 'ERROR';
  ai: SystemReadiness;
  readiness: SystemReadiness;
  liveGate: 'LOCKED' | 'READY' | 'NOT_CONFIGURED';
  dataLane: DataLane;
  lastHeartbeatAt: string | null;
}

export interface AutopilotPublicState {
  enabled: boolean;
  state: AutopilotState;
  mode: TradingMode;
  stopMode: StopMode;
  startedAt: string | null;
  stoppedAt: string | null;
  lastHeartbeatAt: string | null;
  lastMarketCheckAt: string | null;
  haltReason: string | null;
  capital: number;
  riskLevel: RiskLevel;
  todayPnl: number;
  cumulativePnl: number;
  openPositions: number;
  aiStatusText: string;
  marketSession: MarketSession | null;
  venueSessions?: VenueSessions | null;
  health: HealthSnapshot;
  brokerHealth?: BrokerHealth | null;
  accountSummary?: AccountSummary | null;
  activity: ActivityItem[];
  universeCount?: number;
  liveGateChecks?: LiveGateCheck[];
}

export interface AccountSummary {
  lane: DataLane;
  totalEquity?: number;
  cash?: number;
  buyingPower?: number;
  positionsCount?: number;
  openOrdersCount?: number;
  dayRealizedPnl?: number;
  unrealizedPnl?: number;
  source: string;
}

export interface ActivityItem {
  id: string;
  at: string;
  level: 'info' | 'trade' | 'warn' | 'error';
  message: string;
}

export const DEFAULT_QUANT_WEIGHTS = {
  liquidity: 15,
  volumeSurge: 15,
  tradingValue: 15,
  momentum: 15,
  trend: 10,
  relativeStrength: 10,
  breakoutQuality: 10,
  volatility: 5,
  marketAlignment: 5,
} as const;

export const RISK_PRESETS: Record<RiskLevel, RiskProfile> = {
  STABLE: {
    maxCapital: 3_000_000,
    maxPositionPct: 10,
    maxOpenPositions: 3,
    maxDailyLossPct: 1.5,
    maxDrawdownPct: 5,
    riskPerTradePct: 0.5,
    maxConsecutiveLosses: 3,
    maxSlippagePct: 0.4,
    maxSpreadPct: 0.8,
  },
  BALANCED: {
    maxCapital: 3_000_000,
    maxPositionPct: 15,
    maxOpenPositions: 5,
    maxDailyLossPct: 2.5,
    maxDrawdownPct: 8,
    riskPerTradePct: 1,
    maxConsecutiveLosses: 4,
    maxSlippagePct: 0.6,
    maxSpreadPct: 1.2,
  },
  AGGRESSIVE: {
    maxCapital: 3_000_000,
    maxPositionPct: 25,
    maxOpenPositions: 8,
    maxDailyLossPct: 4,
    maxDrawdownPct: 12,
    riskPerTradePct: 1.5,
    maxConsecutiveLosses: 5,
    maxSlippagePct: 1,
    maxSpreadPct: 2,
  },
};

export const FRESHNESS_THRESHOLDS_MS = {
  KR: 60_000,
  US: 90_000,
} as const;

export const AI_MAX_DECISION_AGE_MS = 20_000;
