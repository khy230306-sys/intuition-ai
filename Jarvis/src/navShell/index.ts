export {
  FEATURE_CATALOG,
  searchFeatures,
  userVisibleFeatures,
  getFeatureById,
  GROUP_LABELS,
  catalogTargetViews,
} from './featureCatalog'
export type { FeatureEntry, FeatureGroup } from './featureCatalog'
export { PRIMARY_TABS, primaryTabForView, normalizeNavView } from './primaryTabs'
export type { PrimaryTabId } from './primaryTabs'
export { renderPrimaryBottomNav } from './renderBottomNav'
export { renderHomeDashboard } from './renderHomeDashboard'
export { renderScheduleHub } from './renderScheduleHub'
export type { ScheduleHubTab, ScheduleHubLine } from './renderScheduleHub'
export { renderMoreHub } from './renderMoreHub'
export { renderChatShell } from './renderChatShell'
export { recordRecentFeature, listRecentFeatures, clearRecentFeatures } from './recentFeatures'
export {
  listVisibleQuickActions,
  listAddableQuickActions,
  listHiddenQuickActions,
  getQuickPrefs,
  toggleQuickHidden,
  showQuickAction,
  hideQuickAction,
  resetQuickActions,
  saveQuickPrefs,
  titleForQuickId,
  DEFAULT_QUICK_ACTIONS,
  QUICK_ACTION_CATALOG,
  QUICK_ACTION_MAX,
} from './quickActions'
export type { QuickActionId } from './quickActions'
export { runMenuAudit, exportMenuStructureJson } from './menuAudit'
export type { MenuAuditReport, AuditStatus } from './menuAudit'
