import type {
  PatternDecision,
  PatternMatch,
  RouletteResult,
  ZeroHandling,
} from '../types.js';
import type { PatternRule } from './PatternRule.js';

function compareMatches(a: PatternMatch, b: PatternMatch): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (b.confidence !== a.confidence) return b.confidence - a.confidence;
  return a.ruleId.localeCompare(b.ruleId);
}

export class PatternEngine {
  private rules: PatternRule[] = [];

  constructor(rules: PatternRule[] = []) {
    this.rules = [...rules];
  }

  setRules(rules: PatternRule[]): void {
    this.rules = [...rules];
  }

  addRule(rule: PatternRule): void {
    const idx = this.rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) this.rules[idx] = rule;
    else this.rules.push(rule);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  getRules(): PatternRule[] {
    return [...this.rules];
  }

  getRule(id: string): PatternRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  /**
   * Evaluate all enabled rules against history.
   * NEVER invents a bet without a match.
   * Conflict resolution: priority → confidence → ruleId.
   */
  evaluate(
    history: RouletteResult[],
    zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN',
  ): PatternDecision {
    const matches: PatternMatch[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (history.length < rule.minimumHistory) continue;
      const match = rule.detect(history, zeroHandling);
      if (match) matches.push(match);
    }

    if (matches.length === 0) {
      return {
        match: null,
        betColor: null,
        conflicts: [],
        reason: 'PATTERN_NOT_READY',
      };
    }

    matches.sort(compareMatches);
    const winner = matches[0]!;
    const rule = this.getRule(winner.ruleId);
    const betColor = rule?.determineBet(winner) ?? winner.nextExpectedColor ?? null;

    if (!betColor) {
      return {
        match: winner,
        betColor: null,
        conflicts: matches.slice(1),
        reason: 'INVALID_SIGNAL',
      };
    }

    return {
      match: winner,
      betColor,
      conflicts: matches.slice(1),
      reason: undefined,
    };
  }
}
