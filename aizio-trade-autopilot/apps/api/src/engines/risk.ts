import type { RiskProfile } from '@aizio/trade-shared';
import type { BrokerQuote } from '../brokers/types.js';
import { estimateSlippagePct } from '../brokers/paperBroker.js';

export interface RiskContext {
  profile: RiskProfile;
  capitalUsed: number;
  openPositions: number;
  dailyPnlPct: number;
  drawdownPct: number;
  consecutiveLosses: number;
  quote?: BrokerQuote;
  marketOpen: boolean;
  brokerOk: boolean;
  orderStateKnown: boolean;
  aiValid: boolean;
  circuitBreakerOn: boolean;
  stopNewEntries: boolean;
  dataStaleMs?: number;
  maxStaleMs?: number;
  proposedNotional: number;
}

export interface RiskDecision {
  allowed: boolean;
  reasons: string[];
  positionSize: number;
}

export class RiskEngine {
  evaluate(ctx: RiskContext): RiskDecision {
    const reasons: string[] = [];
    const reject = (r: string): RiskDecision => ({ allowed: false, reasons: [...reasons, r], positionSize: 0 });

    if (ctx.circuitBreakerOn) return reject('CIRCUIT_BREAKER');
    if (ctx.stopNewEntries) return reject('STOP_NEW_ENTRIES');
    if (!ctx.marketOpen) return reject('MARKET_CLOSED');
    if (!ctx.brokerOk) return reject('BROKER_UNSTABLE');
    if (!ctx.orderStateKnown) return reject('ORDER_STATE_UNKNOWN');
    if (!ctx.aiValid) return reject('AI_MALFORMED_OR_UNAVAILABLE');
    if (ctx.capitalUsed + ctx.proposedNotional > ctx.profile.maxCapital) return reject('MAX_CAPITAL');
    if (ctx.dailyPnlPct <= -ctx.profile.maxDailyLossPct) return reject('MAX_DAILY_LOSS');
    if (ctx.drawdownPct >= ctx.profile.maxDrawdownPct) return reject('MAX_DRAWDOWN');
    if (ctx.openPositions >= ctx.profile.maxOpenPositions) return reject('MAX_OPEN_POSITIONS');
    if (ctx.consecutiveLosses >= ctx.profile.maxConsecutiveLosses) return reject('MAX_CONSECUTIVE_LOSSES');

    if (ctx.quote) {
      const mid = ctx.quote.lastPrice || 1;
      const spreadPct = ((ctx.quote.ask - ctx.quote.bid) / mid) * 100;
      if (spreadPct > ctx.profile.maxSpreadPct) return reject('ABNORMAL_SPREAD');
      const slip = estimateSlippagePct(ctx.quote, 'BUY');
      if (slip > ctx.profile.maxSlippagePct) return reject('SLIPPAGE_TOO_HIGH');
      const stale = ctx.dataStaleMs ?? ctx.quote.freshnessMs;
      if (stale > (ctx.maxStaleMs ?? 60_000)) return reject('STALE_MARKET_DATA');
    } else {
      return reject('NO_QUOTE');
    }

    const maxNotional = ctx.profile.maxCapital * (ctx.profile.maxPositionPct / 100);
    const riskNotional = ctx.profile.maxCapital * (ctx.profile.riskPerTradePct / 100);
    const notional = Math.min(maxNotional, riskNotional * 5, ctx.proposedNotional || maxNotional);
    const qty = Math.floor(notional / ctx.quote.lastPrice);
    if (qty < 1) return reject('SIZE_TOO_SMALL');

    reasons.push('RISK_PASS');
    return { allowed: true, reasons, positionSize: qty };
  }
}
