import type { StrategyConfig } from '../core/types.js';
import type {
  AlternatingRuleConfig,
  CustomPatternDefinition,
  SameColorChangeRuleConfig,
  SameColorRuleConfig,
  RepeatingBlockRuleConfig,
  SuppressPatternDefinition,
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

/** Photo: RRR / BBB → 반대편 배팅. 패배 시 최소 3회 휴식. */
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

/**
 * Photo condition #2:
 * 같은색 2회+ 연속 후, 변경된 색깔의 2번째에 배팅 (= 변경 1회 관측 시 SAME 신호).
 */
export const DEFAULT_SAME_COLOR_CHANGE: SameColorChangeRuleConfig = {
  id: 'same-color-change',
  name: 'Same Color → Change → 2nd',
  enabled: true,
  priority: 55,
  minimumSameColorRun: 2,
  requiredChanges: 1,
  entryOffset: 1,
  betMode: 'SAME',
  onWin: 'WAIT_NEW_PATTERN',
  onLoss: 'REST',
  restRoundsAfterLoss: 3,
};

/**
 * Photo: RBR / BRB / 1212 — 반대 배팅, 승리 시 계속 반대, 패배 시 휴식.
 * 손그림 3연속(RBR)도 잡도록 minimumLength=3.
 */
export const DEFAULT_ALTERNATING: AlternatingRuleConfig = {
  id: 'alternating-01',
  name: 'Alternating Pattern',
  enabled: true,
  priority: 60,
  minimumLength: 3,
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

/**
 * Photo-confirmed custom sequences (1/2 정규화의 양 색 대칭본 포함).
 * 1↔R, 2↔B 및 손그림에서 1=B,2=R로 적은 경우 모두 구조로 등록.
 */
export const PHOTO_CUSTOM_PATTERNS: CustomPatternDefinition[] = [
  {
    id: 'photo-12221-bet2-as-rbbbr',
    name: 'Photo 1 2 2 2 1 → bet 2 (RBBBR→B)',
    sequence: ['R', 'B', 'B', 'B', 'R'],
    entryMode: 'FIXED',
    fixedBetColor: 'B',
    onWin: 'CONTINUE_SAME_PATTERN',
    onLoss: 'REST',
    restRounds: 3,
    priority: 70,
    enabled: true,
  },
  {
    id: 'photo-12221-bet2-as-brrrb',
    name: 'Photo 1 2 2 2 1 → bet 2 (BRRRB→R)',
    sequence: ['B', 'R', 'R', 'R', 'B'],
    entryMode: 'FIXED',
    fixedBetColor: 'R',
    onWin: 'CONTINUE_SAME_PATTERN',
    onLoss: 'REST',
    restRounds: 3,
    priority: 70,
    enabled: true,
  },
  {
    id: 'photo-2111112-bet1',
    name: 'Photo 2 1 1 1 1 1 2 → bet 1 (BRRRRRB→R)',
    sequence: ['B', 'R', 'R', 'R', 'R', 'R', 'B'],
    entryMode: 'FIXED',
    fixedBetColor: 'R',
    onWin: 'CONTINUE_SAME_PATTERN',
    onLoss: 'REST',
    restRounds: 3,
    priority: 70,
    enabled: true,
  },
  {
    id: 'photo-2111112-bet1-flip',
    name: 'Photo 2 1 1 1 1 1 2 → bet 1 flip (RBBBBBR→B)',
    sequence: ['R', 'B', 'B', 'B', 'B', 'B', 'R'],
    entryMode: 'FIXED',
    fixedBetColor: 'B',
    onWin: 'CONTINUE_SAME_PATTERN',
    onLoss: 'REST',
    restRounds: 3,
    priority: 70,
    enabled: true,
  },
  {
    id: 'photo-211112-bet1',
    name: 'Photo 2 1 1 1 1 2 → bet 1 (BRRRRB→R)',
    sequence: ['B', 'R', 'R', 'R', 'R', 'B'],
    entryMode: 'FIXED',
    fixedBetColor: 'R',
    onWin: 'CONTINUE_SAME_PATTERN',
    onLoss: 'REST',
    restRounds: 3,
    priority: 69,
    enabled: true,
  },
  {
    id: 'photo-211112-bet1-flip',
    name: 'Photo 2 1 1 1 1 2 → bet 1 flip (RBBBBR→B)',
    sequence: ['R', 'B', 'B', 'B', 'B', 'R'],
    entryMode: 'FIXED',
    fixedBetColor: 'B',
    onWin: 'CONTINUE_SAME_PATTERN',
    onLoss: 'REST',
    restRounds: 3,
    priority: 69,
    enabled: true,
  },
];

/** Photo: RR BB R B R BB RRR 다음(13)은 배팅하지 않고 흘려보냄. */
export const PHOTO_SUPPRESS_PATTERNS: SuppressPatternDefinition[] = [
  {
    id: 'photo-suppress-13-pass',
    name: 'Photo 13 pass (RRBBRBRBBRRR → NO BET)',
    sequence: ['R', 'R', 'B', 'B', 'R', 'B', 'R', 'B', 'B', 'R', 'R', 'R'],
    priority: 10_000,
    enabled: true,
  },
  {
    id: 'photo-suppress-13-pass-flip',
    name: 'Photo 13 pass color-flip → NO BET',
    sequence: ['B', 'B', 'R', 'R', 'B', 'R', 'B', 'R', 'R', 'B', 'B', 'B'],
    priority: 10_000,
    enabled: true,
  },
];
