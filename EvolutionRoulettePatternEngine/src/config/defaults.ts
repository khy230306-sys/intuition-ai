import type { StrategyConfig } from '../core/types.js';
import type {
  AlternatingRuleConfig,
  SameColorChangeRuleConfig,
  SameColorRuleConfig,
  RepeatingBlockRuleConfig,
} from '../core/types.js';

export const DEFAULT_STRATEGY: StrategyConfig = {
  martingale: {
    baseBet: 1,
    multiplier: 2,
    maxStage: 14,
  },
  defaultRestRounds: 3,
  zeroHandling: 'ZERO_BREAKS_PATTERN',
  mode: 'DRY_RUN',
  idleAction: {
    enabled: false,
    timeoutMs: 8 * 60 * 1000,
    minimumChip: 1,
    targetNumber: 0,
    warnOnly: true,
  },
  historyLimit: 500,
};

export const DEFAULT_SAME_COLOR: SameColorRuleConfig = {
  id: 'same-color-reverse',
  name: 'Same Color / Reverse',
  enabled: true,
  priority: 50,
  minimumStreak: 3,
  betOpposite: true,
  onWin: 'WAIT_NEW_PATTERN',
  onLoss: 'REST',
  restRoundsAfterLoss: 3,
};

export const DEFAULT_SAME_COLOR_CHANGE: SameColorChangeRuleConfig = {
  id: 'same-color-change',
  name: 'Same Color → Change → Entry',
  enabled: true,
  priority: 40,
  minimumSameColorRun: 2,
  requiredChanges: 1,
  entryOffset: 1,
  betMode: 'OPPOSITE',
  onWin: 'WAIT_NEW_PATTERN',
  onLoss: 'REST',
  restRoundsAfterLoss: 3,
};

export const DEFAULT_ALTERNATING: AlternatingRuleConfig = {
  id: 'alternating-01',
  name: 'Alternating Pattern',
  enabled: true,
  priority: 60,
  minimumLength: 4,
  continueUntilLoss: true,
  onWin: 'CONTINUE',
  onLoss: 'REST',
  restRoundsAfterLoss: 3,
};

export const DEFAULT_REPEATING_BLOCK: RepeatingBlockRuleConfig = {
  id: 'repeating-block',
  name: 'Repeating Block',
  enabled: true,
  priority: 30,
  minBlockLength: 2,
  maxBlockLength: 8,
  lookback: 40,
  onWin: 'WAIT_NEW_PATTERN',
  onLoss: 'REST',
  restRoundsAfterLoss: 3,
};
