import type { BrokerQuote } from '../brokers/types.js';

export interface ManagedPositionState {
  id: string;
  symbol: string;
  entryPrice: number;
  quantity: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  trailingStop?: number | null;
  strategyId: string;
  signalId?: string | null;
  openedAt: Date;
  highestPrice: number;
  lowestPrice: number;
  status: 'OPEN' | 'EXITING' | 'CLOSED';
}

export type ExitReason =
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'TIME_STOP'
  | 'MOMENTUM_EXIT'
  | 'TREND_BREAK'
  | 'THESIS_INVALIDATED'
  | 'END_OF_DAY'
  | 'VOLATILITY_EXIT'
  | 'KILL_CLOSE'
  | 'NONE';

export interface PositionRules {
  stopLossPct: number;
  takeProfitPct: number;
  trailingStopPct: number;
  timeStopMs: number;
  endOfDay: boolean;
}

export const DEFAULT_POSITION_RULES: PositionRules = {
  stopLossPct: 2,
  takeProfitPct: 3.5,
  trailingStopPct: 1.5,
  timeStopMs: 1000 * 60 * 60 * 4,
  endOfDay: true,
};

export function defaultStops(entry: number, rules = DEFAULT_POSITION_RULES) {
  return {
    stopLoss: round2(entry * (1 - rules.stopLossPct / 100)),
    takeProfit: round2(entry * (1 + rules.takeProfitPct / 100)),
    trailingStop: rules.trailingStopPct,
  };
}

export function evaluateExit(
  pos: ManagedPositionState,
  quote: BrokerQuote,
  rules: PositionRules = DEFAULT_POSITION_RULES,
  opts: { marketRegularClosed?: boolean; thesisInvalidated?: boolean } = {},
): { shouldExit: boolean; reason: ExitReason; highest: number; lowest: number } {
  const px = quote.lastPrice;
  const highest = Math.max(pos.highestPrice, px);
  const lowest = Math.min(pos.lowestPrice, px);

  if (opts.thesisInvalidated) return { shouldExit: true, reason: 'THESIS_INVALIDATED', highest, lowest };
  if (pos.stopLoss != null && px <= pos.stopLoss) return { shouldExit: true, reason: 'STOP_LOSS', highest, lowest };
  if (pos.takeProfit != null && px >= pos.takeProfit) return { shouldExit: true, reason: 'TAKE_PROFIT', highest, lowest };

  if (pos.trailingStop != null) {
    const trail = highest * (1 - pos.trailingStop / 100);
    if (px <= trail && highest > pos.entryPrice) {
      return { shouldExit: true, reason: 'TRAILING_STOP', highest, lowest };
    }
  }

  const held = Date.now() - pos.openedAt.getTime();
  if (held >= rules.timeStopMs) return { shouldExit: true, reason: 'TIME_STOP', highest, lowest };

  if (quote.changePct < -1.2 && px < pos.entryPrice) {
    return { shouldExit: true, reason: 'MOMENTUM_EXIT', highest, lowest };
  }
  if (px < pos.entryPrice * 0.99 && quote.changePct < 0) {
    return { shouldExit: true, reason: 'TREND_BREAK', highest, lowest };
  }
  if (Math.abs(quote.changePct) > 6) return { shouldExit: true, reason: 'VOLATILITY_EXIT', highest, lowest };
  if (opts.marketRegularClosed && rules.endOfDay) {
    return { shouldExit: true, reason: 'END_OF_DAY', highest, lowest };
  }
  return { shouldExit: false, reason: 'NONE', highest, lowest };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
