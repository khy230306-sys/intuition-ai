import type {
  BetColor,
  CustomPatternDefinition,
  ZeroHandling,
} from '../../types.js';
import { oppositeColor } from '../../roulette/colors.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { prepareColors } from '../PatternMatcher.js';

/** Custom Pattern Builder rule — matches exact sequence suffix then bets per entryMode. */
export function createCustomSequenceRule(def: CustomPatternDefinition): PatternRule {
  return {
    id: def.id,
    name: def.name,
    enabled: def.enabled,
    priority: def.priority,
    minimumHistory: def.sequence.length,
    confidence: def.confidence ?? 0.8,
    onWin: def.onWin,
    onLoss: def.onLoss,
    restRoundsAfterLoss: def.restRounds,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled) return null;
      if (def.sequence.length === 0) return null;
      const { colors } = prepareColors(history, zeroHandling);
      if (colors.length < def.sequence.length) return null;

      const start = colors.length - def.sequence.length;
      const slice = colors.slice(start);
      for (let i = 0; i < def.sequence.length; i++) {
        if (slice[i] !== def.sequence[i]) return null;
      }

      let bet: BetColor | null = null;
      const lastRB = [...def.sequence].reverse().find((c) => c === 'R' || c === 'B') as
        | BetColor
        | undefined;

      if (def.entryMode === 'FIXED') {
        bet = def.fixedBetColor ?? null;
      } else if (!lastRB) {
        bet = null;
      } else if (def.entryMode === 'SAME') {
        bet = lastRB;
      } else {
        bet = oppositeColor(lastRB);
      }

      return baseMatch(this, {
        matchedSequence: [...def.sequence],
        startIndex: start,
        endIndex: colors.length - 1,
        nextExpectedColor: bet ?? undefined,
        confidence: def.confidence ?? 0.8,
        metadata: { entryMode: def.entryMode, source: 'pattern-builder' },
      });
    },
    determineBet(match) {
      return match.nextExpectedColor ?? null;
    },
  };
}
