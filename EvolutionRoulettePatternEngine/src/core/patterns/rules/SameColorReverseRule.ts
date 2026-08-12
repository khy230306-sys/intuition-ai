import type { SameColorRuleConfig, ZeroHandling } from '../../types.js';
import { oppositeColor } from '../../roulette/colors.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { prepareColors, streakAtEnd } from '../PatternMatcher.js';

export function createSameColorReverseRule(config: SameColorRuleConfig): PatternRule {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    priority: config.priority,
    minimumHistory: config.minimumStreak,
    confidence: 0.7,
    onWin: config.onWin,
    onLoss: config.onLoss,
    restRoundsAfterLoss: config.restRoundsAfterLoss,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled) return null;
      const { colors } = prepareColors(history, zeroHandling);
      if (colors.length < config.minimumStreak) return null;
      const streak = streakAtEnd(colors);
      if (!streak || streak.color === 'Z') return null;
      if (streak.length < config.minimumStreak) return null;

      const color = streak.color as 'R' | 'B';
      const bet = config.betOpposite ? oppositeColor(color) : color;
      const startIndex = colors.length - streak.length;
      return baseMatch(this, {
        matchedSequence: colors.slice(startIndex) as ('R' | 'B')[],
        startIndex,
        endIndex: colors.length - 1,
        nextExpectedColor: bet,
        confidence: Math.min(0.95, 0.5 + streak.length * 0.05),
        metadata: {
          streakLength: streak.length,
          streakColor: color,
          betOpposite: config.betOpposite,
        },
      });
    },
    determineBet(match) {
      return match.nextExpectedColor ?? null;
    },
  };
}
