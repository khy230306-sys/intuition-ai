/**
 * Life OS facade — domain modules stay independent; this is the stable import surface.
 */

export { loadLifeFlags, saveLifeFlags, isLifeFeatureEnabled, DEFAULT_LIFE_FLAGS, resetLifeFlagsForTests } from './featureFlags'
export { ensureLifeOsSchema, LIFE_OS_SCHEMA_VERSION } from './lifeRepository'
export { buildLifeWorldContext, formatTodayBrief } from './lifeContext'
export { rememberDnaFromText, forgetDna, formatDnaList, dnaContextSnippet, listDna } from './dna/dnaService'
export {
  createGoal,
  planMilestones,
  autoPlanGoal,
  updateGoalStatus,
  nextActions,
  formatGoals,
  findGoalByTitleHint,
  computeGoalProgress,
} from './goals/goalService'
export { saveIdea, searchIdeas, formatIdeas, linkIdeaToProject } from './ideas/ideaService'
export {
  upsertProject,
  findProject,
  addProjectBug,
  addProjectTask,
  markTaskDone,
  formatProjectStatus,
  mostUrgentProject,
  computeProjectHealth,
  loadProjects,
} from './projects/projectService'
export { runAiMeeting } from './ai-meeting/meetingService'
export { addTimelineEvent, listTimeline, formatTimeline } from './timeline/timelineService'
export {
  ensureDefaultRoutines,
  findRoutineByPhrase,
  previewRoutine,
  runRoutine,
  formatRoutineRun,
} from './routines/routineService'
export { formatFamilyOverview, upsertFamilyMember, loadFamilySpace } from './family/familyService'
export { assessEmergencyUtterance, formatEmergencyHelp, buildEmergencyCard } from './emergency/emergencyService'
export { addHealthLog, formatHealthLogs } from './health/healthService'
export { addFinanceRecord, formatFinanceSummary } from './finance/financeService'
export { createTravelPlan, formatTravelPlans } from './travel/travelService'
export { createLearningPlan, formatLearningPlans } from './learning/learningService'
export {
  listSkillCatalog,
  setSkillEnabled,
  formatSkillCatalog,
  validateManifest,
  assertNoRemoteCodeInstall,
} from './marketplace/skillCatalog'
export { parseLifeOsIntent } from './intentParse'
export type { LifeOsParsedIntent } from './intentParse'
