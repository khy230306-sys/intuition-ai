export { mountAizioQuest } from './ui/questApp'
export { loadQuestSave, saveQuestSave, defaultSave } from './save/saveStore'
export { CHAPTER1_STAGES } from './content/stages'
export { HEROES } from './content/heroes'
export { runBattleSimulation } from './sim/battleSim'
export type { QuestSave } from './types'

import { runBattleSimulation as runSim } from './sim/battleSim'
import { createCell, findAllMoves } from './match3/board'
import type { Board, GemKind } from './types'

/** Browser QA hook — local battle sim without cloud AI. */
if (typeof window !== 'undefined') {
  ;(
    window as unknown as {
      __AIZIO_QUEST__?: {
        runBattleSimulation: typeof runSim
        legalMovesFromDom: () => ReturnType<typeof findAllMoves>
      }
    }
  ).__AIZIO_QUEST__ = {
    runBattleSimulation: runSim,
    legalMovesFromDom: () => {
      const gems = [...document.querySelectorAll<HTMLElement>('.aq-gem')]
      if (!gems.length) return []
      const board: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => createCell('fire')),
      )
      for (const g of gems) {
        const r = Number(g.dataset.r)
        const c = Number(g.dataset.c)
        const kind = (g.dataset.kind || 'fire') as GemKind
        if (Number.isFinite(r) && Number.isFinite(c)) board[r]![c] = createCell(kind)
      }
      return findAllMoves(board)
    },
  }
}
