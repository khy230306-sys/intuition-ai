import type {
  BetColor,
  LossAction,
  PatternMatch,
  RouletteResult,
  WinAction,
  ZeroHandling,
} from '../types.js';

export interface PatternRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  minimumHistory: number;
  confidence?: number;
  detect(history: RouletteResult[], zeroHandling?: ZeroHandling): PatternMatch | null;
  determineBet(match: PatternMatch): BetColor | null;
  onWin?: WinAction;
  onLoss?: LossAction;
  restRoundsAfterLoss?: number;
}

export function baseMatch(
  rule: Pick<PatternRule, 'id' | 'name' | 'priority' | 'confidence'>,
  partial: Omit<PatternMatch, 'ruleId' | 'ruleName' | 'priority' | 'confidence'> & {
    confidence?: number;
  },
): PatternMatch {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    priority: rule.priority,
    confidence: partial.confidence ?? rule.confidence ?? 0.5,
    matchedSequence: partial.matchedSequence,
    startIndex: partial.startIndex,
    endIndex: partial.endIndex,
    nextExpectedColor: partial.nextExpectedColor,
    metadata: partial.metadata,
  };
}
