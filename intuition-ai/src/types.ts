/** Baccarat outcomes. B=BANKER, P=PLAYER, T=TIE */
export type Side = 'B' | 'P'
export type Outcome = Side | 'T'
export type Judgment = 'WIN' | 'LOSE'

export type FuturePath = Side[]

export type RoadShape = {
  sequence: Side[]
  runLengths: number[]
  runSides: Side[]
  currentRunLength: number
  currentSide: Side | null
  transitions: number
}

export type SimilarityBreakdown = {
  exact: number
  runLength: number
  roadShape: number
  recentSegment: number
  mirror: number
  contextLength: number
  recency: number
}

export type HistoricalMatch = {
  /** Exclusive end index in BP history used for context (look-ahead safe). */
  endIndex: number
  contextLength: number
  similarity: number
  breakdown: SimilarityBreakdown
  mirrored: boolean
  continuation: Side[]
}

export type PathClusterType =
  | 'CONTINUE'
  | 'FLIP_ONCE'
  | 'FLIP_RETURN'
  | 'ALTERNATING'
  | 'OTHER'

export type ContinuationCluster = {
  type: PathClusterType
  representative: Side[]
  nextSide: Side
  weight: number
  count: number
  avgSimilarity: number
  share: number
}

export type PathSummary = {
  path: Side[]
  type: PathClusterType
  nextSide: Side
  weight: number
  count: number
  share: number
  label: string
} | null

export type EngineDebug = {
  currentContext: Side[]
  matchCount: number
  topMatches: Array<{
    endIndex: number
    contextLength: number
    similarity: number
    continuation: string
    mirrored: boolean
  }>
  clusters: Array<{
    type: PathClusterType
    path: string
    nextSide: Side
    weight: number
    count: number
    share: number
  }>
  expectedPath: string | null
  alternativePath: string | null
  hiddenPath: string | null
  finalPick: Side
  confidence: number
  nextSideAgreement: number
  obviousPath: string
  adapted: boolean
  adaptiveSource: string
  lossStreak: number
  recentHitRate: number
}

export type EnginePrediction = {
  pick: Side
  confidence: number
  reason: string
  expectedPath: PathSummary
  alternativePath: PathSummary
  hiddenPath: PathSummary
  matchCount: number
  nextSideAgreement: number
  adapted: boolean
  adaptiveSource: string
  debug: EngineDebug
}

export type PendingPrediction = {
  pick: Side
  confidence: number
  reason: string
  pattern: Side[]
  createdAt: string
  expectedPath: string | null
  alternativePath: string | null
  hiddenPath: string | null
  matchCount: number
  nextSideAgreement: number
}

export type PredictionRecord = PendingPrediction & {
  actualResult: Side
  result: Judgment
  judgedAt: string
}

export type PatternMemory = Record<string, { P: number; B: number }>
