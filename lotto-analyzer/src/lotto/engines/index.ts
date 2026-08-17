import type { AnalysisEngine } from './types'
import { contrarianEngine } from './contrarian/contrarianEngine'
import { cycleEngine } from './cycle/cycleEngine'
import { delayEngine } from './delay/delayEngine'
import { endingEngine } from './ending/endingEngine'
import { gapEngine } from './gap/gapEngine'
import { masterEngine } from './master/masterEngine'
import { monteCarloEngine } from './monteCarlo/monteCarloEngine'
import { networkEngine } from './network/networkEngine'
import { pairEngine } from './pair/pairEngine'
import { randomEngine } from './random/randomEngine'
import { repeatEngine } from './repeat/repeatEngine'
import { structureEngine } from './structure/structureEngine'
import { trendEngine } from './trend/trendEngine'
import { tripleEngine } from './triple/tripleEngine'

export type { AnalysisEngine } from './types'
export { emptyScores, rankFromScores, appearanceIndexes } from './types'

export {
  trendEngine,
  delayEngine,
  cycleEngine,
  pairEngine,
  tripleEngine,
  networkEngine,
  structureEngine,
  repeatEngine,
  endingEngine,
  gapEngine,
  contrarianEngine,
  randomEngine,
  monteCarloEngine,
  masterEngine,
}

export const ALL_ENGINES: AnalysisEngine[] = [
  trendEngine,
  delayEngine,
  cycleEngine,
  pairEngine,
  tripleEngine,
  networkEngine,
  structureEngine,
  repeatEngine,
  endingEngine,
  gapEngine,
  contrarianEngine,
  randomEngine,
  monteCarloEngine,
  masterEngine,
]

export const ENGINE_VERSIONS: Record<string, string> = Object.fromEntries(
  ALL_ENGINES.map((e) => [e.id, e.version]),
)

export const ENGINE_BY_ID: Record<string, AnalysisEngine> = Object.fromEntries(
  ALL_ENGINES.map((e) => [e.id, e]),
)
