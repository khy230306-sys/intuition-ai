import type { RoundResult } from '../types'
import { buildTotalMainRoad } from './mainRoad'
import type { MainRoadModel, SameDisplayMode } from './types'

/** TOTAL main road — identical placement rules, LOW/CENTER/HIGH outcomes. */
export function buildTotalRoad(
  history: RoundResult[],
  options?: SameDisplayMode,
): MainRoadModel {
  return buildTotalMainRoad(history, options)
}
