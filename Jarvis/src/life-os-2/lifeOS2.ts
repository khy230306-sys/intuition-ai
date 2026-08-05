export { coordinateLifeOs2 } from './lifeCoordinator'
export { parseLifeOs2Intent } from './intentParse'
export { loadLifeOs2Flags, saveLifeOs2Flags, isLifeOs2Enabled } from './featureFlags'
export { fuseContext, formatFusedContextSummary } from './context-fusion/contextFusionEngine'
export { buildMorningCompanion, buildEveningCompanion } from './companion/companionEngine'
export { ensureLifeOs2Schema, listLos2BackupKeys, LIFE_OS2_SCHEMA_VERSION } from './repository'
export { getLifeOs2State } from './lifeState'

export const LIFE_OS2_VERSION = '2.0.0'
