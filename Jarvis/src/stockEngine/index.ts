/**
 * AIZIO Stock Engine v2.1 — AI-quant multi-factor screening, analysis, portfolio.
 * Deterministic & local-first. Confident ranks; final decision is the user's.
 */

export {
  REC_UNIVERSE,
  detectMarket,
  detectSectorFilter,
  filterUniverse,
  type RecCandidate,
  type RecMarket,
  type StockSector,
} from './universe'
export {
  factorsFromQuote,
  factorsFromBars,
  rangePosition,
  rsiProxyFromRet5d,
  type StockFactors,
} from './factors'
export {
  wantsStockRecommend,
  buildColdRecommendations,
  scorePick,
  enrichWithRelativeStrength,
  actionFromScore,
  type ScoredPick,
  type RecAction,
} from './screen'
export { wantsStockAnalysis, buildStockAnalysis } from './analyze'
export { buildPortfolioReport } from './portfolio'
export {
  deriveTradeLevels,
  attractivenessFromScore,
  formatPctSigned,
  type TradeLevels,
} from './levels'

export const STOCK_ENGINE_VERSION = '2.2.0'
