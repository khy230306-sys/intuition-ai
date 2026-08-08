export { mountAizioQuest } from './ui/questApp'
export { loadQuestSave, saveQuestSave, defaultSave } from './save/saveStore'
export { CHAPTER1_STAGES } from './content/stages'
export { HEROES } from './content/heroes'
export { runBattleSimulation } from './sim/battleSim'
export type { QuestSave } from './types'

import { runBattleSimulation as runSim } from './sim/battleSim'

/** Browser QA hook — local battle sim without cloud AI. */
if (typeof window !== 'undefined') {
  ;(window as unknown as { __AIZIO_QUEST__?: { runBattleSimulation: typeof runSim } }).__AIZIO_QUEST__ = {
    runBattleSimulation: runSim,
  }
}
