import type { AlternatingRuleConfig, ZeroHandling } from '../../types.js';
import { oppositeColor } from '../../roulette/colors.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { longestAlternatingSuffix, prepareColors } from '../PatternMatcher.js';

export function createAlternatingRule(config: AlternatingRuleConfig): PatternRule {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    priority: config.priority,
    minimumHistory: config.minimumLength,
    confidence: 0.75,
    onWin: config.onWin,
    onLoss: config.onLoss,
    restRoundsAfterLoss: config.restRoundsAfterLoss,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled) return null;
      const { colors } = prepareColors(history, zeroHandling);
      const alt = longestAlternatingSuffix(colors);
      if (alt.length < config.minimumLength) return null;
      if (alt.some((c) => c === 'Z')) return null;

      const last = alt[alt.length - 1] as 'R' | 'B';
      const next = oppositeColor(last);
      const startIndex = colors.length - alt.length;

      return baseMatch(this, {
        matchedSequence: [...alt],
        startIndex,
        endIndex: colors.length - 1,
        nextExpectedColor: next,
        confidence: Math.min(0.95, 0.55 + alt.length * 0.04),
        metadata: {
          alternatingLength: alt.length,
          continueUntilLoss: config.continueUntilLoss,
          normalized: alt.map((c) => (c === 'R' ? '1' : '2')).join(''),
        },
      });
    },
    determineBet(match) {
      return match.nextExpectedColor ?? null;
    },
  };
}
