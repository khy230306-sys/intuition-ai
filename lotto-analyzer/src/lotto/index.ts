// LottoLens 3.0 public API

export {
  MAX_N,
  PICK,
  type LottoDraw,
  type NumberStatistic,
  type Temperature,
  type Grade,
  type CouncilVote,
  type ScoreBreakdown,
  type Combination,
  type CombinationDNA,
  type UserTicket,
  type UserTicketGame,
  type Strategy,
  type GeneratorConstraints,
  type GeneratorMode,
  type EnginePrediction,
  type EnginePerformance,
  type AnalysisContext,
  type EngineResult,
  type NumberRankingRow,
  type FavoritePreset,
} from './domain/types'

export {
  DrawValidationError,
  validateDraw,
  validateCombination,
} from './domain/validate'

export {
  BundledLottoProvider,
  drawsBefore,
  cached,
  clearAnalysisCache,
  type LottoDataProvider,
  type BundledDataset,
  type CompactRow,
} from './data/provider'

export { buildCombinationDNA } from './dna/dna'
export { computeNumberStatistics } from './features/numberStats'

export {
  mulberry32,
  sampleUnique,
  weightedPick,
} from './math/random'

export {
  mean,
  median,
  stddev,
  percentileRank,
  clamp01,
  normalizeMap,
  jaccard,
  PRIMES,
  oddCount,
  lowCount,
  sectionCounts,
  consecutivePairs,
  gaps,
  endingDigits,
} from './math/stats'

export {
  ALL_ENGINES,
  ENGINE_BY_ID,
  ENGINE_VERSIONS,
  type AnalysisEngine,
  emptyScores,
  rankFromScores,
  appearanceIndexes,
} from './engines'

export {
  masterEngine,
  DEFAULT_MASTER_WEIGHTS,
  CHILD_ENGINES,
} from './engines/master/masterEngine'

export {
  buildCouncil,
  councilSummary,
  classifyVote,
  consensusFromVotes,
  type CouncilEntry,
} from './council/council'

export {
  defaultWeights,
  normalizeWeights,
  createStrategy,
  listPresets,
  presetByMode,
  STRATEGY_PRESETS,
  STRATEGY_VERSION,
  type StrategyPreset,
} from './strategy/strategy'

export {
  generateCombinations,
  generateRandomGames,
  type GenerateOptions,
  GeneratorValidationError,
} from './generator/generator'

export {
  scoreCoverage,
  diversifyGames,
  type CoverageScore,
} from './coverage/coverage'

export {
  findSimilarDraws,
  type SimilarDrawResult,
} from './similarity/similarity'

export {
  runBacktest,
  walkForward,
  assertNoLookahead,
  LookaheadError,
  type BacktestReport,
  type WalkForwardFold,
  type WalkForwardFoldResult,
  type WalkForwardReport,
  type RunBacktestOptions,
  type WalkForwardOptions,
} from './backtest/backtest'

export { buildNumberRankings } from './ranking/ranking'

export {
  evaluatePrediction,
  createEmptyPerformance,
  accumulatePerformance,
  evaluateBatch,
} from './performance/performance'

export {
  migrateIfNeeded,
  listTickets,
  getTicket,
  saveTicket,
  deleteTicket,
  listStrategies,
  getStrategy,
  saveStrategy,
  deleteStrategy,
  listFavorites,
  saveFavorite,
  deleteFavorite,
  getConstraints,
  saveConstraints,
  saveConstraintsFromGenerator,
  listPredictionSnapshots,
  savePredictionSnapshot,
  exportStore,
  importStore,
  clearStore,
  resetStoreForTests,
  type UserConstraints,
  type StoreExport,
} from './persistence/store'

export {
  buildDrawReport,
  formatBacktestHuman,
  emptyDataMessage,
  describeDrawStructure,
  type DrawReport,
  type DrawReportInput,
} from './reports/report'

export {
  parseNaturalLanguageConstraints,
  mergeParsedConstraints,
  type ParsedNlConstraints,
} from './generator/nlConstraints'

export {
  analyzeUserBias,
  type BiasFinding,
  type UserBiasReport,
} from './performance/userBias'

export {
  buildNetworkGraph,
  renderRelationSvg,
  type NetworkGraph,
  type NetworkEdge,
} from './engines/network/graph'

export { mapWithYield, yieldToUi, runChunked } from './workers/scheduler'

export {
  proposeWeightEvolution,
  type EvolutionProposal,
  type EvolutionOptions,
} from './strategy/evolution'
