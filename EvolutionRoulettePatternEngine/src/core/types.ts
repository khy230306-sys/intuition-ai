/** Shared domain types for Evolution Roulette Pattern Engine */

export type RouletteColor = 'R' | 'B' | 'Z';

export type BetColor = 'R' | 'B';

export type ZeroHandling = 'ZERO_BREAKS_PATTERN' | 'ZERO_IGNORED';

export type WinAction =
  | 'CONTINUE'
  | 'CONTINUE_SAME_PATTERN'
  | 'CONTINUE_OPPOSITE'
  | 'WAIT_PATTERN'
  | 'WAIT_NEW_PATTERN'
  | 'REST';

export type LossAction = 'CONTINUE' | 'WAIT_PATTERN' | 'WAIT_NEW_PATTERN' | 'REST';

export type EngineState =
  | 'IDLE'
  | 'WAIT_PATTERN'
  | 'SIGNAL_READY'
  | 'BETTING'
  | 'WAIT_RESULT'
  | 'WIN'
  | 'LOSS'
  | 'REST'
  | 'STOPPED'
  | 'ERROR';

export type RunMode = 'DRY_RUN' | 'REAL';

export type NoBetReason =
  | 'PATTERN_NOT_READY'
  | 'RESTING'
  | 'DUPLICATE_ROUND'
  | 'BETTING_CLOSED'
  | 'STOPPED'
  | 'INVALID_SIGNAL'
  | 'INVALID_AMOUNT'
  | 'BALANCE_UNVERIFIED'
  | 'TABLE_NOT_CONFIRMED'
  | 'RESULT_NOT_SYNCED'
  | 'MAX_MARTINGALE'
  | 'NO_ACTIVE_RULE'
  | 'IDLE';

export interface RouletteResult {
  roundId: string;
  number: number;
  color: RouletteColor;
  timestamp: number;
  source?: 'live' | 'replay' | 'manual' | 'simulation';
}

export interface PatternMatch {
  ruleId: string;
  ruleName: string;
  confidence: number;
  priority: number;
  matchedSequence: RouletteColor[];
  startIndex: number;
  endIndex: number;
  nextExpectedColor?: BetColor;
  metadata?: Record<string, unknown>;
}

export interface PatternDecision {
  match: PatternMatch | null;
  betColor: BetColor | null;
  conflicts: PatternMatch[];
  reason?: NoBetReason | string;
}

export interface BetRequest {
  roundId: string;
  color: BetColor;
  amount: number;
  martingaleStage: number;
  ruleId: string;
  dryRun: boolean;
}

export interface BetResult {
  ok: boolean;
  dryRun: boolean;
  placed: boolean;
  message: string;
  request: BetRequest;
}

export interface TableInfo {
  tableId: string;
  tableName: string;
  gameType: string;
  confirmed: boolean;
}

export interface RouletteSiteAdapter {
  connect(): Promise<void>;
  disconnect?(): Promise<void>;
  detectTable(): Promise<TableInfo>;
  readLatestResult(): Promise<RouletteResult | null>;
  placeBet?(request: BetRequest): Promise<BetResult>;
  getBalance?(): Promise<number | null>;
  isBettingOpen?(): Promise<boolean>;
}

export interface MartingaleConfig {
  baseBet: number;
  multiplier: number;
  maxStage: number;
}

export interface IdleActionConfig {
  enabled: boolean;
  timeoutMs: number;
  minimumChip: number;
  targetNumber: number;
  warnOnly: boolean;
}

export interface StrategyConfig {
  martingale: MartingaleConfig;
  defaultRestRounds: number;
  zeroHandling: ZeroHandling;
  mode: RunMode;
  idleAction: IdleActionConfig;
  historyLimit: number;
}

export interface CustomPatternDefinition {
  id: string;
  name: string;
  sequence: RouletteColor[];
  entryMode: 'SAME' | 'OPPOSITE' | 'FIXED';
  fixedBetColor?: BetColor;
  onWin: WinAction;
  onLoss: LossAction;
  restRounds: number;
  priority: number;
  enabled: boolean;
  confidence?: number;
}

/** Exact suffix match → force NO BET / wait (photo: 13번 흘려보내기). */
export interface SuppressPatternDefinition {
  id: string;
  name: string;
  sequence: RouletteColor[];
  priority: number;
  enabled: boolean;
}

export interface SameColorRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  minimumStreak: number;
  betOpposite: boolean;
  onWin: WinAction;
  onLoss: LossAction;
  restRoundsAfterLoss: number;
}

export interface SameColorChangeRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  minimumSameColorRun: number;
  requiredChanges: number;
  entryOffset: number;
  betMode: 'SAME' | 'OPPOSITE';
  onWin: WinAction;
  onLoss: LossAction;
  restRoundsAfterLoss: number;
}

export interface AlternatingRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  minimumLength: number;
  continueUntilLoss: boolean;
  onWin: WinAction;
  onLoss: LossAction;
  restRoundsAfterLoss: number;
}

export interface RepeatingBlockRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  minBlockLength: number;
  maxBlockLength: number;
  lookback: number;
  onWin: WinAction;
  onLoss: LossAction;
  restRoundsAfterLoss: number;
}

/** Photo: 첫 배팅 전용 — 단일→반대, 연속→같은색 */
export interface FirstBetRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  onWin: WinAction;
  onLoss: LossAction;
  restRoundsAfterLoss: number;
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  deviceMemo: string;
  version: string;
  role: 'admin' | 'user';
}

export interface RoundLogEntry {
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: Record<string, unknown>;
}

export interface SessionRoundRecord {
  index: number;
  result: RouletteResult;
  stateBefore: EngineState;
  stateAfter: EngineState;
  decision: PatternDecision;
  bet?: BetRequest;
  betOutcome?: 'WIN' | 'LOSS' | 'NONE';
  martingaleStage: number;
  restRemaining: number;
  noBetReason?: string;
  conflicts: PatternMatch[];
}
