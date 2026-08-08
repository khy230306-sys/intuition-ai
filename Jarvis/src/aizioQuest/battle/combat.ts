/** Turn-based combat resolver on top of Match-3. */

import type {
  BattleRuntime,
  GemKind,
  HeroDef,
  MatchGroup,
  QuestSave,
  SkillDef,
  StageDef,
} from '../types'
import { enemyById } from '../content/enemies'
import { heroById } from '../content/heroes'
import { stageById } from '../content/stages'
import {
  applyGravity,
  BOARD_SIZE,
  clearMatches,
  cloneBoard,
  createCell,
  ensurePlayable,
  generateBoard,
  resolveBoard,
  shuffleBoard,
  trySwap,
} from '../match3/board'
import { chooseEnemyMove } from './enemyAi'
import { mulberry32 } from '../match3/rng'

function equippedBonus(save: QuestSave): { atk: number; def: number; hp: number; energy: number } {
  let atk = 0
  let def = 0
  let hp = 0
  let energy = 0
  for (const id of Object.values(save.equipped)) {
    const item = save.inventory.find((i) => i.id === id)
    if (!item) continue
    atk += item.atk || 0
    def += item.def || 0
    hp += item.hp || 0
    energy += item.energyBonus || 0
  }
  return { atk, def, hp, energy }
}

export function startBattle(save: QuestSave, stage: StageDef, seed: number, tutorial = false): BattleRuntime {
  const hero = heroById(save.heroId || 'kael')!
  const enemy = enemyById(stage.enemyId)!
  const eq = equippedBonus(save)
  const lvl = save.level
  const pAtk = hero.baseAtk + (lvl - 1) * 6 + eq.atk
  const pDef = hero.baseDef + (lvl - 1) * 3 + eq.def
  const pHp = hero.baseHp + (lvl - 1) * 35 + eq.hp
  // Stage-index scaling so reused enemy IDs still grow in threat (pattern ≠ HP-only clones).
  const stageScale = 1 + Math.max(0, stage.index - 1) * 0.028
  const diffMul =
    stage.difficulty === 'BOSS' ? 1.05 : stage.difficulty === 'ELITE' ? 1.06 : stage.difficulty === 'HARD' ? 1.03 : 1
  const eHp = Math.round(enemy.hp * stageScale * diffMul)
  const eAtk = Math.round(enemy.atk * (1 + (stage.index - 1) * 0.022) * diffMul)
  const eDef = Math.round(enemy.def * (1 + (stage.index - 1) * 0.015))
  const board = ensurePlayable(generateBoard(seed), seed + 1)
  return {
    stageId: stage.id,
    seed,
    turn: 'player',
    board,
    player: {
      name: hero.name,
      hp: pHp,
      maxHp: pHp,
      atk: pAtk,
      def: pDef,
      energy: 2 + eq.energy,
      maxEnergy: 10 + eq.energy,
      shield: 0,
      status: [],
    },
    enemy: {
      name: enemy.name,
      hp: eHp,
      maxHp: eHp,
      atk: eAtk,
      def: eDef,
      energy: 1,
      maxEnergy: 8,
      shield: 0,
      status: [],
    },
    combo: 0,
    animLock: false,
    log: [`${stage.name} — ${enemy.title}`],
    phase: 0,
    tutorialStep: tutorial ? 0 : undefined,
    extraTurns: 0,
    damagedThisBattle: false,
    moves: 0,
  }
}

function dmgCalc(atk: number, def: number, power: number, pierce = false, variance = 0.08): number {
  const mit = pierce ? def * 0.25 : def
  // Deterministic mid-band variance (seeded callers can pass variance 0..0.16).
  return Math.max(1, Math.round((atk * power - mit * 0.55) * (0.92 + variance)))
}

function tallyClears(
  clears: Array<{ kind: GemKind }>,
  hero: HeroDef,
): { damage: number; heal: number; energy: number; pierce: number; guard: number } {
  let damage = 0
  let heal = 0
  let energy = 0
  let pierce = 0
  let guard = 0
  for (const c of clears) {
    switch (c.kind) {
      case 'fire':
        damage += 1.0 * (hero.element === 'fire' ? 1.08 : 1)
        break
      case 'dark':
        damage += 0.85
        pierce += 0.35
        break
      case 'water':
        energy += 0.45
        break
      case 'light':
        energy += 0.55
        break
      case 'nature':
        heal += 0.7 * (hero.element === 'nature' ? 1.1 : 1)
        break
      case 'guard':
        guard += 0.65
        break
    }
  }
  return { damage, heal, energy, pierce, guard }
}

export type TurnFx = {
  damageToEnemy: number
  damageToPlayer: number
  heal: number
  energyGain: number
  shieldGain: number
  combo: number
  hadFive: boolean
  extraTurn: boolean
  log: string[]
}

export function applyPlayerSwap(
  battle: BattleRuntime,
  save: QuestSave,
  a: { r: number; c: number },
  b: { r: number; c: number },
): { battle: BattleRuntime; fx: TurnFx; ok: boolean } {
  // animLock is a UI concern — engine only requires player turn.
  if (battle.turn !== 'player') {
    return { battle, fx: emptyFx(), ok: false }
  }
  const hero = heroById(save.heroId || 'kael')!
  const result = trySwap(battle.board, a, b, battle.seed + battle.moves * 17)
  if (!result.ok) return { battle, fx: emptyFx(), ok: false }

  const tallied = tallyClears(result.cleared, hero)
  const hadFive = result.groups.some((g) => g.shape === 'line5' || g.cells.length >= 5)
  const specialExtra = result.groups.some((g) => g.shape === 'line5' || g.shape === 'L' || g.shape === 'T')
  const varRng = mulberry32(battle.seed + battle.moves * 97 + result.cleared.length)
  let dmg =
    dmgCalc(
      battle.player.atk,
      battle.enemy.def,
      0.55 + tallied.damage * 0.22 + tallied.pierce * 0.15,
      false,
      varRng() * 0.16,
    ) + Math.floor(result.combos * 4)
  if (specialExtra) dmg = Math.round(dmg * 1.15)

  const next = { ...battle, board: result.board, moves: battle.moves + 1, combo: Math.max(battle.combo, result.combos) }
  next.enemy = { ...next.enemy, hp: Math.max(0, next.enemy.hp - dmg) }
  const heal = Math.round(battle.player.maxHp * 0.02 * tallied.heal)
  const shield = Math.round(battle.player.maxHp * 0.03 * tallied.guard)
  next.player = {
    ...next.player,
    hp: Math.min(next.player.maxHp, next.player.hp + heal),
    energy: Math.min(next.player.maxEnergy, next.player.energy + Math.floor(tallied.energy) + (result.combos > 1 ? 1 : 0)),
    shield: next.player.shield + shield,
  }
  const extraTurn = specialExtra || result.combos >= 3
  if (extraTurn) next.extraTurns += 1

  if (next.enemy.hp <= 0) {
    next.turn = 'player'
    next.log = [...next.log, `피해 ${dmg} · 격파!`]
  } else if (next.extraTurns > 0) {
    next.extraTurns -= 1
    next.turn = 'player'
    next.log = [...next.log, `피해 ${dmg} · 추가 턴!`]
  } else {
    next.turn = 'enemy'
    next.log = [...next.log, `피해 ${dmg}`]
  }

  // Dead board shuffle
  next.board = ensurePlayable(next.board, next.seed + next.moves)

  return {
    battle: next,
    fx: {
      damageToEnemy: dmg,
      damageToPlayer: 0,
      heal,
      energyGain: Math.floor(tallied.energy),
      shieldGain: shield,
      combo: result.combos,
      hadFive,
      extraTurn,
      log: next.log.slice(-2),
    },
    ok: true,
  }
}

function emptyFx(): TurnFx {
  return {
    damageToEnemy: 0,
    damageToPlayer: 0,
    heal: 0,
    energyGain: 0,
    shieldGain: 0,
    combo: 0,
    hadFive: false,
    extraTurn: false,
    log: [],
  }
}

export function runEnemyTurn(battle: BattleRuntime, save: QuestSave): { battle: BattleRuntime; fx: TurnFx } {
  if (battle.turn !== 'enemy' || battle.enemy.hp <= 0) {
    return { battle, fx: emptyFx() }
  }
  const stage = stageById(battle.stageId)!
  const enemy = enemyById(stage.enemyId)!
  let board = battle.board
  const move = chooseEnemyMove(board, enemy.difficulty, battle.seed + battle.moves * 31 + 7)
  let fx = emptyFx()
  const next = { ...battle, moves: battle.moves + 1 }

  // Phase update for boss (thresholds descend: e.g. 1 → 0.6 → 0.3)
  if (enemy.phases?.length) {
    const ratio = next.enemy.hp / next.enemy.maxHp
    let p = 0
    for (let i = 0; i < enemy.phases.length; i++) {
      if (ratio <= enemy.phases[i]!.hpRatio) p = i
    }
    if (p !== next.phase) {
      next.phase = p
      next.log = [...next.log, `페이즈 ${enemy.phases[p]!.label}`]
    }
  }

  const atkMul = enemy.phases?.[next.phase]?.atkMul || 1

  if (move) {
    const result = trySwap(board, move.a, move.b, battle.seed + next.moves * 19)
    if (result.ok) {
      board = result.board
      const tallied = tallyClears(result.cleared, heroById(save.heroId || 'kael')!)
      const varRng = mulberry32(battle.seed + next.moves * 53)
      let dmg = dmgCalc(next.enemy.atk * atkMul, next.player.def, 0.5 + tallied.damage * 0.2, false, varRng() * 0.16)
      // shield absorb
      const absorbed = Math.min(next.player.shield, dmg)
      dmg -= absorbed
      next.player = {
        ...next.player,
        shield: next.player.shield - absorbed,
        hp: Math.max(0, next.player.hp - dmg),
        energy: Math.max(0, next.player.energy - (tallied.energy > 1 ? 1 : 0)),
      }
      if (dmg > 0) next.damagedThisBattle = true
      // enemy self heal from nature
      const eHeal = Math.round(next.enemy.maxHp * 0.015 * tallied.heal)
      next.enemy = { ...next.enemy, hp: Math.min(next.enemy.maxHp, next.enemy.hp + eHeal) }
      fx = {
        ...fx,
        damageToPlayer: dmg,
        combo: result.combos,
        log: [`적 공격 ${dmg}`],
      }
      next.log = [...next.log, `적 공격 ${dmg}`]
    }
  } else {
    board = shuffleBoard(board, battle.seed + next.moves)
    next.log = [...next.log, '적 보드 재배치']
  }

  // Boss corrupt mechanic occasionally
  if (enemy.boardMechanic === 'corrupt' && next.moves % 4 === 0) {
    board = corruptBoard(board, battle.seed + next.moves)
    next.log = [...next.log, '보드가 오염된다…']
  }

  next.board = ensurePlayable(board, battle.seed + next.moves + 3)
  next.turn = next.player.hp <= 0 ? 'enemy' : 'player'
  return { battle: next, fx }
}

function corruptBoard(board: ReturnType<typeof cloneBoard>, seed: number) {
  const rng = mulberry32(seed)
  const next = cloneBoard(board)
  for (let i = 0; i < 3; i++) {
    const r = Math.floor(rng() * BOARD_SIZE)
    const c = Math.floor(rng() * BOARD_SIZE)
    next[r]![c] = createCell('dark')
  }
  return next
}

export function castSkill(
  battle: BattleRuntime,
  save: QuestSave,
  skill: SkillDef,
): { battle: BattleRuntime; fx: TurnFx; ok: boolean } {
  if (battle.turn !== 'player') return { battle, fx: emptyFx(), ok: false }
  if (battle.player.energy < skill.energyCost) return { battle, fx: emptyFx(), ok: false }
  const hero = heroById(save.heroId || 'kael')!
  let next = {
    ...battle,
    player: { ...battle.player, energy: battle.player.energy - skill.energyCost },
    board: cloneBoard(battle.board),
  }
  const fx = emptyFx()
  const rng = mulberry32(battle.seed + battle.moves * 41 + skill.energyCost)

  if (skill.kind === 'damage' || skill.kind === 'drain') {
    const dmg = dmgCalc(next.player.atk, next.enemy.def, skill.power, skill.kind === 'drain')
    next.enemy = { ...next.enemy, hp: Math.max(0, next.enemy.hp - dmg) }
    fx.damageToEnemy = dmg
    if (skill.kind === 'drain') {
      next.enemy = { ...next.enemy, energy: Math.max(0, next.enemy.energy - 2) }
      next.player = { ...next.player, energy: Math.min(next.player.maxEnergy, next.player.energy + 1) }
    }
  }
  if (skill.kind === 'heal') {
    const heal = Math.round(next.player.maxHp * 0.12 * skill.power)
    next.player = { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + heal) }
    fx.heal = heal
    if (skill.id === 'mira-aegis') {
      next.player.shield += Math.round(next.player.maxHp * 0.18)
      // spawn some guard gems
      for (let i = 0; i < 4; i++) {
        const r = Math.floor(rng() * BOARD_SIZE)
        const c = Math.floor(rng() * BOARD_SIZE)
        next.board[r]![c] = createCell('guard')
      }
    }
  }
  if (skill.kind === 'shield') {
    const sh = Math.round(next.player.maxHp * 0.14 * skill.power)
    next.player = { ...next.player, shield: next.player.shield + sh }
    fx.shieldGain = sh
  }
  if (skill.kind === 'convert' && skill.convertTo) {
    let n = 0
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (n >= 8) break
        if (next.board[r]![c]!.kind !== skill.convertTo && rng() < 0.28) {
          next.board[r]![c] = createCell(skill.convertTo)
          n++
        }
      }
  }
  if (skill.kind === 'clear' && skill.clearKind) {
    const groups: MatchGroup[] = []
    const cells: Array<{ r: number; c: number }> = []
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (next.board[r]![c]!.kind === skill.clearKind) cells.push({ r, c })
    if (cells.length) {
      groups.push({ cells, kind: skill.clearKind, shape: cells.length >= 5 ? 'line5' : 'other' })
      const cleared = clearMatches(next.board, groups)
      const resolved = resolveBoard(applyGravity(cleared.board, battle.seed + 3), battle.seed + 5)
      next.board = resolved.board
      const dmg = dmgCalc(next.player.atk, next.enemy.def, skill.power + cells.length * 0.05)
      next.enemy = { ...next.enemy, hp: Math.max(0, next.enemy.hp - dmg) }
      fx.damageToEnemy = dmg
      fx.extraTurn = true
      next.extraTurns += 1
    }
  }
  if (skill.kind === 'blast') {
    const r = Math.floor(rng() * BOARD_SIZE)
    const c = Math.floor(rng() * BOARD_SIZE)
    next.board[r]![c] = createCell(hero.element, 'blast')
    fx.extraTurn = true
    next.extraTurns += 1
  }
  if (skill.kind === 'extraTurn') {
    next.extraTurns += 1
    fx.extraTurn = true
  }

  next.log = [...next.log, `${skill.name} 발동`]
  if (next.enemy.hp <= 0) {
    next.turn = 'player'
  } else if (next.extraTurns > 0) {
    next.extraTurns -= 1
    next.turn = 'player'
  } else {
    next.turn = 'enemy'
  }
  next.board = ensurePlayable(next.board, battle.seed + next.moves + 9)
  return { battle: next, fx, ok: true }
}

export function isVictory(b: BattleRuntime): boolean {
  return b.enemy.hp <= 0
}
export function isDefeat(b: BattleRuntime): boolean {
  return b.player.hp <= 0
}
