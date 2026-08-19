export type AutopilotState =
  | 'OFF'
  | 'STARTING'
  | 'RUNNING'
  | 'MARKET_CLOSED'
  | 'PAUSED'
  | 'HALTED'
  | 'ERROR';

export type TradingMode = 'PAPER' | 'LIVE';

export type StopMode = 'NONE' | 'STOP_NEW_ENTRIES' | 'CLOSE_AND_STOP';

export type SystemReadiness =
  | 'NOT_CONFIGURED'
  | 'PAPER_MODE'
  | 'LIVE_READY'
  | 'LIVE_RUNNING'
  | 'DEGRADED'
  | 'HALTED';

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

export interface HealthSnapshot {
  server: 'OK' | 'DEGRADED' | 'DOWN';
  broker: SystemReadiness;
  marketData: SystemReadiness | 'REPLAY' | 'OK';
  ai: SystemReadiness;
  readiness: SystemReadiness;
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
  health: HealthSnapshot;
  activity: ActivityItem[];
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
