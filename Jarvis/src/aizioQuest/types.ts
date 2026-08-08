/** AIZIO QUEST — shared types (original IP). */

export type GemKind = 'fire' | 'water' | 'nature' | 'light' | 'dark' | 'guard'

export type HeroRole = 'ATTACKER' | 'GUARDIAN' | 'TACTICIAN'

export type Difficulty = 'NORMAL' | 'HARD' | 'ELITE' | 'BOSS'

export type EquipSlot = 'WEAPON' | 'ARMOR' | 'CORE' | 'ACCESSORY'

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type QuestScreen =
  | 'title'
  | 'heroSelect'
  | 'campaign'
  | 'battle'
  | 'victory'
  | 'defeat'
  | 'inventory'
  | 'daily'
  | 'settings'
  | 'tutorial'

export type GemCell = {
  id: string
  kind: GemKind
  special?: 'none' | 'blast' | 'core' | 'line'
}

export type Board = GemCell[][] // 8x8 row-major [r][c]

export type MatchGroup = {
  cells: Array<{ r: number; c: number }>
  kind: GemKind
  shape: 'line3' | 'line4' | 'line5' | 'L' | 'T' | 'other'
}

export type HeroId = 'kael' | 'mira' | 'nyx'

export type SkillId = string

export type SkillDef = {
  id: SkillId
  name: string
  desc: string
  energyCost: number
  kind: 'damage' | 'heal' | 'convert' | 'clear' | 'shield' | 'extraTurn' | 'blast' | 'drain'
  /** Primary power scaling */
  power: number
  convertFrom?: GemKind
  convertTo?: GemKind
  clearKind?: GemKind
}

export type HeroDef = {
  id: HeroId
  name: string
  title: string
  role: HeroRole
  element: GemKind
  blurb: string
  baseHp: number
  baseAtk: number
  baseDef: number
  passive: string
  skills: SkillDef[]
  ultimate: SkillDef
  unlockStage: number
  /** SVG portrait accent */
  accent: string
}

export type EnemyDef = {
  id: string
  name: string
  title: string
  difficulty: Difficulty
  hp: number
  atk: number
  def: number
  aiDepth: number
  passive?: string
  skills: Array<{ id: string; name: string; weight: number; power: number; kind: string }>
  phases?: Array<{ hpRatio: number; label: string; atkMul: number; note: string }>
  boardMechanic?: 'corrupt' | 'lock' | 'none'
}

export type StageDef = {
  id: string
  chapter: number
  index: number
  name: string
  enemyId: string
  difficulty: Difficulty
  xp: number
  credit: number
  isElite?: boolean
  isBoss?: boolean
}

export type EquipItem = {
  id: string
  name: string
  slot: EquipSlot
  rarity: Rarity
  atk?: number
  def?: number
  hp?: number
  energyBonus?: number
}

export type BattleFighter = {
  name: string
  hp: number
  maxHp: number
  atk: number
  def: number
  energy: number
  maxEnergy: number
  shield: number
  status: string[]
}

export type QuestSave = {
  v: 1
  heroId: HeroId | null
  unlockedHeroes: HeroId[]
  level: number
  xp: number
  credit: number
  stageCleared: number
  inventory: EquipItem[]
  equipped: Partial<Record<EquipSlot, string>>
  achievements: string[]
  settings: { music: boolean; sfx: boolean; haptic: boolean }
  tutorialDone: boolean
  bestCombo: number
  gemsCleared: number
  battlesWon: number
  battlesLost: number
  dailyDate: string
  dailyBest: number
  updatedAt: string
}

export type QuestRuntime = {
  screen: QuestScreen
  save: QuestSave
  battle?: BattleRuntime
  lastReward?: { xp: number; credit: number; item?: EquipItem; newAchievements: string[] }
  toast?: string
}

export type BattleRuntime = {
  stageId: string
  seed: number
  turn: 'player' | 'enemy'
  board: Board
  player: BattleFighter
  enemy: BattleFighter
  combo: number
  animLock: boolean
  log: string[]
  phase: number
  tutorialStep?: number
  extraTurns: number
  damagedThisBattle: boolean
  moves: number
}
