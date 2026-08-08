/** Headless battle simulator for balance checks. */

import { defaultSave } from '../save/saveStore'
import { CHAPTER1_STAGES } from '../content/stages'
import { applyPlayerSwap, isDefeat, isVictory, runEnemyTurn, startBattle } from '../battle/combat'
import { chooseEnemyMove } from '../battle/enemyAi'
import { hashSeed } from '../match3/rng'
import type { QuestSave } from '../types'

export type SimResult = {
  stageId: string
  trials: number
  wins: number
  losses: number
  winRate: number
  avgTurns: number
  shuffles: number
}

function autoPlay(save: QuestSave, stageId: string, seed: number, maxTurns = 80): { win: boolean; turns: number } {
  const stage = CHAPTER1_STAGES.find((s) => s.id === stageId)!
  let battle = startBattle({ ...save, heroId: save.heroId || 'kael' }, stage, seed)
  let turns = 0
  for (let t = 0; t < maxTurns; t++) {
    turns++
    if (isVictory(battle)) return { win: true, turns }
    if (isDefeat(battle)) return { win: false, turns }
    if (battle.turn === 'player') {
      // Use same scoring AI as enemies (no cheating) for realistic win-rate measurement.
      const m = chooseEnemyMove(battle.board, 'HARD', seed + t * 13)
      if (!m) {
        battle = { ...battle, turn: 'enemy' }
      } else {
        const res = applyPlayerSwap(battle, save, m.a, m.b)
        if (!res.ok) {
          battle = { ...battle, turn: 'enemy' }
        } else {
          battle = { ...res.battle, animLock: false }
        }
      }
    }
    if (isVictory(battle)) return { win: true, turns }
    if (battle.turn === 'enemy') {
      const res = runEnemyTurn(battle, save)
      battle = { ...res.battle, animLock: false }
      if (!isDefeat(battle) && battle.player.hp > 0) battle = { ...battle, turn: 'player' }
    }
  }
  return { win: battle.enemy.hp <= 0, turns }
}

function saveForStage(stageIndex: number): QuestSave {
  // Approximate organic growth — not overleveled for the stage under test.
  const level = Math.min(14, 1 + Math.floor(stageIndex * 0.38))
  return {
    ...defaultSave(),
    heroId: 'kael',
    level,
    credit: 120 + stageIndex * 15,
    stageCleared: Math.max(0, stageIndex - 1),
  }
}

export function runBattleSimulation(opts?: { trialsPerStage?: number; stages?: string[] }): {
  results: SimResult[]
  overallWinRate: number
} {
  const trials = opts?.trialsPerStage ?? 40
  const stageIds = opts?.stages ?? CHAPTER1_STAGES.map((s) => s.id)
  const results: SimResult[] = []
  let wins = 0
  let total = 0
  for (const stageId of stageIds) {
    const stage = CHAPTER1_STAGES.find((s) => s.id === stageId)!
    const save = saveForStage(stage.index)
    let w = 0
    let turns = 0
    for (let i = 0; i < trials; i++) {
      const r = autoPlay(save, stageId, hashSeed(`${stageId}-${i}`))
      if (r.win) w++
      turns += r.turns
    }
    wins += w
    total += trials
    results.push({
      stageId,
      trials,
      wins: w,
      losses: trials - w,
      winRate: w / trials,
      avgTurns: turns / trials,
      shuffles: 0,
    })
  }
  return { results, overallWinRate: total ? wins / total : 0 }
}
