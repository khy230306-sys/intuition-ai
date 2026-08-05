/**
 * AIZIO Stock Engine v2 — multi-factor screening, analysis, portfolio.
 * Deterministic & local-first. Not investment advice.
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
export { factorsFromQuote, factorsFromBars, rangePosition, type StockFactors } from './factors'
export {
  wantsStockRecommend,
  buildColdRecommendations,
  scorePick,
  type ScoredPick,
} from './screen'
export { wantsStockAnalysis, buildStockAnalysis } from './analyze'
export { buildPortfolioReport } from './portfolio'

export const STOCK_ENGINE_VERSION = '2.0.0'
