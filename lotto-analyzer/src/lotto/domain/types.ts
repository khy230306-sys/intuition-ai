/** LottoLens 3.0 domain types — statistics, not predictions */

export const MAX_N = 45
export const PICK = 6

export interface LottoDraw {
  drawNumber: number
  drawDate: string
  numbers: number[]
  bonusNumber: number
  prize1Amount?: number
  prize1WinnerCount?: number
  totalSalesAmount?: number
  source: string
  fetchedAt: string
}

export interface NumberStatistic {
  number: number
  totalAppearances: number
  appearanceRate: number
  lastAppearanceDraw: number
  currentDelay: number
  averageDelay: number
  maxDelay: number
  minDelay: number
  recent5: number
  recent10: number
  recent20: number
  recent30: number
  recent50: number
  recent100: number
  recent300: number
  consecutiveAppearanceCount: number
  repeatAfterPreviousDrawRate: number
  rollingTrend: number
  temperature: Temperature
  percentileScore: number
}

export type Temperature = 'HOT' | 'WARM' | 'NEUTRAL' | 'COLD' | 'FROZEN'
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'
export type CouncilVote = 'strong_for' | 'for' | 'neutral' | 'against' | 'strong_against'

export interface ScoreBreakdown {
  [engineId: string]: number
}

export interface Combination {
  id: string
  numbers: number[]
  createdAt: string
  strategy: string
  score: number
  scoreComponents: {
    componentScore: number
    structuralScore: number
    relationScore: number
    diversityScore: number
    overlapPenalty: number
    constraintScore: number
  }
  dna: CombinationDNA
  diversityScore: number
  coverageGroup?: string
  source: string
  memo?: string
  warnings?: string[]
}

export interface CombinationDNA {
  oddEven: string
  lowHigh: string
  sectionDistribution: number[]
  sum: number
  range: number
  consecutivePairs: number
  endingPairs: number
  primeCount: number
  repeatCount: number
  averageGap: number
  maxGap: number
  structuralPercentile: number
  dnaString: string
  readable: string[]
}

export interface UserTicketGame {
  label: string
  numbers: number[]
}

export interface UserTicket {
  id: string
  drawNumber: number
  purchaseDate: string
  games: UserTicketGame[]
  purchaseAmount: number
  result?: { matches: number[]; bonusHit: boolean[]; rankHints: string[] }
  winnings: number
  qrValue?: string
  imageReference?: string
  createdAt: string
  source: 'manual' | 'scanner' | 'qr' | 'generator'
}

export interface Strategy {
  id: string
  name: string
  description: string
  weights: Record<string, number>
  constraints: GeneratorConstraints
  version: string
  createdAt: string
  updatedAt: string
}

export interface GeneratorConstraints {
  fixed: number[]
  excluded: number[]
  watch: number[]
  gameCount: number
  mode: GeneratorMode
  seed?: number
}

export type GeneratorMode =
  | 'MASTER'
  | 'BALANCED'
  | 'TREND'
  | 'DELAY'
  | 'RELATION'
  | 'CONTRARIAN'
  | 'COVERAGE'
  | 'EXPERIMENT'
  | 'RANDOM'

export interface EnginePrediction {
  drawNumber: number
  engine: string
  engineVersion: string
  candidateNumbers: number[]
  rankedNumbers: number[]
  generatedGames: number[][]
  scores: Record<number, number>
  createdAt: string
  datasetVersion: string
}

export interface EnginePerformance {
  engine: string
  evaluationWindow: string
  drawCount: number
  averageMatches: number
  match3Count: number
  match4Count: number
  match5Count: number
  match6Count: number
  randomBaselineDelta: number
  calculatedAt: string
}

export interface AnalysisContext {
  draws: LottoDraw[]
  /** Exclusive end: only draws with drawNumber < asOfDrawNumber (or all if omitted) */
  asOfDrawNumber?: number
  datasetVersion: string
  seed?: number
}

export interface EngineResult {
  engineId: string
  engineVersion: string
  numberScores: Record<number, number>
  rankedNumbers: number[]
  confidence: number
  evidence: Record<string, unknown>
  metadata: Record<string, unknown>
}

export interface NumberRankingRow {
  number: number
  rank: number
  score: number
  grade: Grade
  temperature: Temperature
  engineConsensus: CouncilVote
  votes: Partial<Record<string, CouncilVote>>
  breakdown: ScoreBreakdown
  lastAppearance: number
  reasonSummary: string[]
}

export interface FavoritePreset {
  id: string
  name: string
  fixed: number[]
  watch: number[]
  excluded: number[]
  createdAt: string
}
