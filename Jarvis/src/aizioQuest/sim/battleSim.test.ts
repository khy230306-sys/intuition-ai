import { describe, expect, it } from 'vitest'
import { runBattleSimulation } from './battleSim'
import { CHAPTER1_STAGES } from '../content/stages'

describe('AIZIO QUEST battle simulation', () => {
  it('runs 1000+ trials across chapter stages with sane early win rates', () => {
    const early = CHAPTER1_STAGES.slice(0, 5).map((s) => s.id)
    const mid = CHAPTER1_STAGES.slice(8, 12).map((s) => s.id)
    const boss = ['c1-boss']
    const earlySim = runBattleSimulation({ trialsPerStage: 110, stages: early })
    const midSim = runBattleSimulation({ trialsPerStage: 80, stages: mid })
    const bossSim = runBattleSimulation({ trialsPerStage: 130, stages: boss })
    const totalTrials =
      earlySim.results.reduce((a, r) => a + r.trials, 0) +
      midSim.results.reduce((a, r) => a + r.trials, 0) +
      bossSim.results.reduce((a, r) => a + r.trials, 0)
    // eslint-disable-next-line no-console
    console.log('sim', {
      totalTrials,
      early: earlySim.overallWinRate,
      mid: midSim.overallWinRate,
      boss: bossSim.overallWinRate,
      earlyDetail: earlySim.results.map((r) => `${r.stageId}:${(r.winRate * 100).toFixed(0)}%`),
      bossDetail: bossSim.results[0],
    })
    expect(totalTrials).toBeGreaterThanOrEqual(1000)
    expect(earlySim.overallWinRate).toBeGreaterThan(0.55)
    expect(midSim.overallWinRate).toBeLessThanOrEqual(earlySim.overallWinRate + 0.05)
    expect(bossSim.overallWinRate).toBeGreaterThan(0.2)
    expect(bossSim.overallWinRate).toBeLessThan(0.9)
  }, 180_000)
})
