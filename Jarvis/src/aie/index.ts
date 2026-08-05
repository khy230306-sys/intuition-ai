/**
 * AIZIO Intelligence Engine (AIE)
 * Top-level orchestrator above Core Brain — does not replace it.
 */

export type * from './types'
export { DECISION_STEP_ORDER, SMART_PRIORITY_ORDER, decisionStepRank, smartPriorityRank } from './priority'
export { buildAieContext, formatAieContextBlock, invalidateAieContext } from './contextEngine'
export { decideNextFocus } from './decisionEngine'
export { planActions, formatActionPlanSummary } from './actionPlanner'
export {
  computeRecommendations,
  formatRecommendationsBlock,
  markRecommendationsPresented,
} from './recommendationEngine'
export {
  recordRecommendationShown,
  recordRecommendationsIgnored,
  recordSkillUse,
  recordForgottenMemory,
  filterByLearning,
} from './learningEngine'
export { buildAieDailyBrief, buildAieDailyBriefChat } from './dailyBrief'
export { aiePrepare, aieEnrichAnswer, aieFormatMultiTaskCombined } from './orchestrator'
export { clearAieStorageForTests } from './storage'

export const AIE_VERSION = '1.0.0'
