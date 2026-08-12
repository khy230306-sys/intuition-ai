import type { FirstBetRuleConfig, ZeroHandling } from '../../types.js';
import { oppositeColor } from '../../roulette/colors.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { prepareColors } from '../PatternMatcher.js';

/**
 * Photo (첫 배팅 전용):
 * - 앞 색이 붙지 않은 단일 → 반대색 배팅
 * - 앞 색이 붙어서 연속 → 같은색 배팅
 * 세션의 첫 배팅에만 적용. 이후는 일반 패턴 규칙.
 */
export function createFirstBetEntryRule(
  config: FirstBetRuleConfig,
  isFirstBet: () => boolean,
): PatternRule {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    priority: config.priority,
    minimumHistory: 1,
    confidence: 0.85,
    onWin: config.onWin,
    onLoss: config.onLoss,
    restRoundsAfterLoss: config.restRoundsAfterLoss,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled) return null;
      if (!isFirstBet()) return null;

      const { colors } = prepareColors(history, zeroHandling);
      if (colors.length < 1) return null;

      const last = colors[colors.length - 1]!;
      if (last === 'Z') return null;

      const prev = colors.length >= 2 ? colors[colors.length - 2]! : null;
      const isStreak = prev !== null && prev === last;
      const bet = isStreak ? (last as 'R' | 'B') : oppositeColor(last as 'R' | 'B');

      const startIndex = isStreak ? colors.length - 2 : colors.length - 1;
      return baseMatch(this, {
        matchedSequence: colors.slice(startIndex) as ('R' | 'B' | 'Z')[],
        startIndex,
        endIndex: colors.length - 1,
        nextExpectedColor: bet,
        confidence: 0.85,
        metadata: {
          firstBetOnly: true,
          mode: isStreak ? 'STREAK_SAME' : 'SINGLE_OPPOSITE',
          lastColor: last,
        },
      });
    },
    determineBet(match) {
      return match.nextExpectedColor ?? null;
    },
  };
}
