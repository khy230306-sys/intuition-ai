import type { SameColorChangeRuleConfig, ZeroHandling } from '../../types.js';
import { oppositeColor } from '../../roulette/colors.js';
import type { PatternRule } from '../PatternRule.js';
import { baseMatch } from '../PatternRule.js';
import { prepareColors } from '../PatternMatcher.js';

/**
 * Same color run → change → wait entryOffset results after the change point,
 * then bet SAME or OPPOSITE relative to the new color.
 *
 * Configurable (no hardcoded photo guesses):
 * - minimumSameColorRun
 * - requiredChanges
 * - entryOffset
 * - betMode
 */
export function createSameColorChangeRule(config: SameColorChangeRuleConfig): PatternRule {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    priority: config.priority,
    minimumHistory: config.minimumSameColorRun + config.requiredChanges + config.entryOffset,
    confidence: 0.65,
    onWin: config.onWin,
    onLoss: config.onLoss,
    restRoundsAfterLoss: config.restRoundsAfterLoss,
    detect(history, zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN') {
      if (!this.enabled) return null;
      const { colors } = prepareColors(history, zeroHandling);
      const need =
        config.minimumSameColorRun + config.requiredChanges + Math.max(0, config.entryOffset - 1);
      if (colors.length < need) return null;
      if (colors.some((c, i) => c === 'Z' && i >= colors.length - need)) return null;

      // Walk from end: find change points
      const rb = colors.filter((c) => c !== 'Z') as ('R' | 'B')[];
      if (rb.length < need) return null;

      // Find trailing structure: initial run of same color, then changes
      // Work on full colors stream (zeros already filtered or breaking)
      const seq = colors as RouletteColorStrict[];
      if (seq.some((c) => c === 'Z')) {
        // If any Z in relevant window under BREAKS, pattern invalid unless ignored already
        const window = seq.slice(-(need + 5));
        if (window.includes('Z') && zeroHandling === 'ZERO_BREAKS_PATTERN') return null;
      }

      const changeIndices: number[] = [];
      for (let i = 1; i < seq.length; i++) {
        if (seq[i] !== seq[i - 1] && seq[i] !== 'Z' && seq[i - 1] !== 'Z') {
          changeIndices.push(i);
        }
      }
      if (changeIndices.length < config.requiredChanges) return null;

      const lastChange = changeIndices[changeIndices.length - 1]!;
      // Verify run before the first of the last `requiredChanges` changes
      const relevantChanges = changeIndices.slice(-config.requiredChanges);
      const firstChange = relevantChanges[0]!;
      let runLen = 1;
      for (let i = firstChange - 1; i > 0; i--) {
        if (seq[i] === seq[i - 1] && seq[i] !== 'Z') runLen += 1;
        else break;
      }
      // also count the color at firstChange-1 itself as start of run
      // run is colors [firstChange-runLen ... firstChange-1]
      if (runLen < config.minimumSameColorRun) return null;

      const afterChangeCount = seq.length - lastChange;
      if (afterChangeCount < config.entryOffset) return null;
      if (afterChangeCount > config.entryOffset) return null; // only fire at exact entry slot

      const changedColor = seq[lastChange] as 'R' | 'B';
      const bet =
        config.betMode === 'SAME' ? changedColor : oppositeColor(changedColor);

      return baseMatch(this, {
        matchedSequence: seq.slice(firstChange - runLen),
        startIndex: firstChange - runLen,
        endIndex: seq.length - 1,
        nextExpectedColor: bet,
        confidence: 0.65,
        metadata: {
          minimumSameColorRun: config.minimumSameColorRun,
          requiredChanges: config.requiredChanges,
          entryOffset: config.entryOffset,
          betMode: config.betMode,
          changedColor,
          afterChangeCount,
        },
      });
    },
    determineBet(match) {
      return match.nextExpectedColor ?? null;
    },
  };
}

type RouletteColorStrict = 'R' | 'B' | 'Z';
