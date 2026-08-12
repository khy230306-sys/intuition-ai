import type { RouletteColor, ZeroHandling } from '../../types.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { prepareColors } from '../PatternMatcher.js';

/**
 * Photo-confirmed suppress rule:
 * When this exact history suffix appears, do NOT bet — wait / pass.
 * determineBet returns null so PatternEngine emits NO BET even if this wins priority.
 */
export function createSuppressSequenceRule(opts: {
  id: string;
  name: string;
  sequence: RouletteColor[];
  priority: number;
  enabled: boolean;
}): PatternRule {
  return {
    id: opts.id,
    name: opts.name,
    enabled: opts.enabled,
    priority: opts.priority,
    minimumHistory: opts.sequence.length,
    confidence: 1,
    onWin: 'WAIT_NEW_PATTERN',
    onLoss: 'WAIT_NEW_PATTERN',
    restRoundsAfterLoss: 0,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled || opts.sequence.length === 0) return null;
      const { colors } = prepareColors(history, zeroHandling);
      if (colors.length < opts.sequence.length) return null;
      const start = colors.length - opts.sequence.length;
      const slice = colors.slice(start);
      for (let i = 0; i < opts.sequence.length; i++) {
        if (slice[i] !== opts.sequence[i]) return null;
      }
      return baseMatch(this, {
        matchedSequence: [...opts.sequence],
        startIndex: start,
        endIndex: colors.length - 1,
        confidence: 1,
        metadata: { suppress: true, action: 'NO_BET_WAIT' },
      });
    },
    determineBet() {
      return null;
    },
  };
}
