/**
 * Tunable Future Road Engine weights.
 * Kept as named constants so tests can assert behavior without magic numbers.
 */
export const CONTEXT_LENGTHS = [6, 8, 10, 12, 16, 20, 30] as const

export const HORIZON_MIN = 1
export const HORIZON_MAX = 5
export const DEFAULT_HORIZON = 4

/** Minimum similarity (0..1) to keep a historical match. */
export const MIN_SIMILARITY = 0.55

/** Soft cap on matches retained after scoring (performance). */
export const MAX_MATCHES = 160

/** Max historical positions scanned per context length (newest-first). */
export const MAX_SCAN_POSITIONS = 900

export const SIMILARITY_WEIGHTS = {
  exact: 0.28,
  runLength: 0.22,
  roadShape: 0.16,
  recentSegment: 0.14,
  mirror: 0.1,
  contextLength: 0.05,
  recency: 0.05,
} as const

/** Minimum occurrences before Hidden Path is allowed. */
export const HIDDEN_MIN_OCCURRENCES = 3

/** Minimum share of total match weight for Hidden Path. */
export const HIDDEN_MIN_SHARE = 0.12

/** Minimum similarity average for Hidden Path. */
export const HIDDEN_MIN_AVG_SIMILARITY = 0.6

/** Confidence floors/ceilings for UI display (not win-rate claim). */
export const CONFIDENCE_MIN = 35
export const CONFIDENCE_MAX = 88
export const CONFIDENCE_EMPTY = 50

export const STORAGE_KEYS = {
  history: 'intuitionHistory',
  predictionRecords: 'predictionRecords',
  patternMemory: 'patternMemory',
} as const

export const HISTORY_CAP = 5000
export const PREDICTION_CAP = 10000
export const SUCCESS_BOARD_SIZE = 12
