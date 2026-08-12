import type { RepeatingBlockRuleConfig, RouletteColor, ZeroHandling } from '../../types.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { prepareColors } from '../PatternMatcher.js';

/**
 * Detect when a historical block is repeating and the next color of that block
 * is known — only signal when the current suffix is a proper prefix of a past block.
 */
export function createRepeatingBlockRule(config: RepeatingBlockRuleConfig): PatternRule {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    priority: config.priority,
    minimumHistory: config.minBlockLength * 2,
    confidence: 0.6,
    onWin: config.onWin,
    onLoss: config.onLoss,
    restRoundsAfterLoss: config.restRoundsAfterLoss,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled) return null;
      const { colors } = prepareColors(history, zeroHandling);
      const lookback = Math.min(config.lookback, colors.length);
      const window = colors.slice(-lookback);
      if (window.length < config.minBlockLength * 2) return null;

      let best: {
        block: RouletteColor[];
        startIndex: number;
        matchedPrefixLen: number;
        next: 'R' | 'B';
        confidence: number;
      } | null = null;

      for (let blockLen = config.minBlockLength; blockLen <= config.maxBlockLength; blockLen++) {
        // Search past occurrences of blocks of this length
        for (let i = 0; i <= window.length - blockLen * 2; i++) {
          const block = window.slice(i, i + blockLen);
          if (block.includes('Z')) continue;
          if (!block.every((c) => c === 'R' || c === 'B')) continue;

          // Check if a later suffix starts matching this block again (incomplete repeat)
          for (let j = i + blockLen; j < window.length; j++) {
            const remaining = window.length - j;
            if (remaining >= blockLen) continue; // full repeat already completed — wait for next cycle
            if (remaining === 0) continue;

            const prefix = window.slice(j);
            const matches = block.slice(0, remaining).every((c, idx) => c === prefix[idx]);
            if (!matches) continue;

            const nextColor = block[remaining];
            if (nextColor !== 'R' && nextColor !== 'B') continue;

            // Require at least one color of the repeat already matched
            if (remaining < 1) continue;

            const confidence = 0.5 + remaining / blockLen * 0.4;
            if (!best || confidence > best.confidence || blockLen > best.block.length) {
              best = {
                block,
                startIndex: colors.length - window.length + j,
                matchedPrefixLen: remaining,
                next: nextColor,
                confidence,
              };
            }
          }
        }
      }

      if (!best) return null;

      return baseMatch(this, {
        matchedSequence: best.block.slice(0, best.matchedPrefixLen),
        startIndex: best.startIndex,
        endIndex: colors.length - 1,
        nextExpectedColor: best.next,
        confidence: best.confidence,
        metadata: {
          matchedPattern: best.block.join(''),
          repeatLength: best.block.length,
          matchedPrefixLen: best.matchedPrefixLen,
          nextExpectedColor: best.next,
        },
      });
    },
    determineBet(match) {
      return match.nextExpectedColor ?? null;
    },
  };
}
