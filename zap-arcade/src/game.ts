export type Screen = 'title' | 'how' | 'play' | 'result' | 'medals'

export type RoundKind = 'go' | 'swipe' | 'pick'

export type SwipeDir = 'up' | 'down' | 'left' | 'right'

export type ColorId = 'coral' | 'teal' | 'navy' | 'sand' | 'mint' | 'sky' | 'lime'

export interface ColorDef {
  id: ColorId
  label: string
  hex: string
}

export const COLORS: ColorDef[] = [
  { id: 'coral', label: '코랄', hex: '#ff4d6d' },
  { id: 'teal', label: '틸', hex: '#00c2a8' },
  { id: 'navy', label: '네이비', hex: '#1a4d7c' },
  { id: 'sand', label: '샌드', hex: '#e8b86d' },
  { id: 'mint', label: '민트', hex: '#7ef0d4' },
  { id: 'sky', label: '스카이', hex: '#3dbbff' },
  { id: 'lime', label: '라임', hex: '#b6f400' },
]

export interface GoRound {
  kind: 'go'
  delayMs: number
  windowMs: number
}

export interface SwipeRound {
  kind: 'swipe'
  dir: SwipeDir
  limitMs: number
}

export interface PickRound {
  kind: 'pick'
  target: ColorId
  tiles: ColorId[]
  limitMs: number
  needed: number
}

export type Round = GoRound | SwipeRound | PickRound

export interface GameStats {
  score: number
  combo: number
  bestCombo: number
  lives: number
  maxLives: number
  round: number
  stage: number
  lastDelta: number
  lastGrade: 'S' | 'A' | 'B' | 'C' | null
  perfects: number
  fever: boolean
  feverPeaks: number
  bestReactMs: number | null
  multiplier: number
}

export const FEVER_COMBO = 5
export const STAGE_EVERY = 5

export function createStats(): GameStats {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: 3,
    maxLives: 3,
    round: 0,
    stage: 1,
    lastDelta: 0,
    lastGrade: null,
    perfects: 0,
    fever: false,
    feverPeaks: 0,
    bestReactMs: null,
    multiplier: 1,
  }
}

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function comboMultiplier(combo: number, fever: boolean): number {
  const base = 1 + Math.min(combo, 30) * 0.1
  return fever ? base * 1.5 : base
}

export function isFever(combo: number): boolean {
  return combo >= FEVER_COMBO
}

/** Difficulty scales with stage + round. */
export function nextRound(roundIndex: number, stage: number): Round {
  const tier = Math.floor(roundIndex / 3) + (stage - 1)
  const kinds: RoundKind[] =
    roundIndex < 2
      ? ['go', 'swipe']
      : roundIndex < 5
        ? ['go', 'swipe', 'pick']
        : stage >= 4
          ? ['go', 'swipe', 'pick', 'pick', 'go']
          : ['go', 'swipe', 'pick', 'pick']

  const kind = rand(kinds)

  if (kind === 'go') {
    const delayMs = clamp(850 - tier * 55 + Math.random() * 650, 320, 1500)
    const windowMs = clamp(880 - tier * 35, 480, 880)
    return { kind: 'go', delayMs, windowMs }
  }

  if (kind === 'swipe') {
    const dirs: SwipeDir[] = ['up', 'down', 'left', 'right']
    return {
      kind: 'swipe',
      dir: rand(dirs),
      limitMs: clamp(1350 - tier * 70, 520, 1350),
    }
  }

  const unlocked =
    stage >= 6 ? COLORS : stage >= 3 ? COLORS.slice(0, 6) : COLORS.slice(0, 5)
  const palette = shuffle(unlocked).slice(0, clamp(3 + Math.floor(tier / 2), 3, Math.min(5, unlocked.length)))
  const target = rand(palette).id
  const count = clamp(6 + Math.floor(tier * 0.8), 6, 14)
  const tiles: ColorId[] = []
  let targetCount = 0
  const minTargets = clamp(2 + Math.floor(tier / 4), 2, 5)

  for (let i = 0; i < count; i++) {
    if (i < minTargets) {
      tiles.push(target)
      targetCount++
    } else {
      const c = rand(palette).id
      tiles.push(c)
      if (c === target) targetCount++
    }
  }

  return {
    kind: 'pick',
    target,
    tiles: shuffle(tiles),
    needed: targetCount,
    limitMs: clamp(3000 - tier * 100, 1400, 3000),
  }
}

export function scoreForSpeed(
  elapsedMs: number,
  limitMs: number,
  mult: number,
  grade: 'S' | 'A' | 'B' | 'C',
): number {
  const ratio = 1 - clamp(elapsedMs / limitMs, 0, 1)
  const gradeBonus = grade === 'S' ? 80 : grade === 'A' ? 40 : grade === 'B' ? 15 : 0
  const base = Math.round(90 + ratio * 140 + gradeBonus)
  return Math.round(base * mult)
}

export function scoreForGo(reactionMs: number, mult: number, grade: 'S' | 'A' | 'B' | 'C'): number {
  const speed = clamp(1 - reactionMs / 850, 0.12, 1)
  const gradeBonus = grade === 'S' ? 100 : grade === 'A' ? 50 : grade === 'B' ? 20 : 0
  const base = Math.round(110 + speed * 200 + gradeBonus)
  return Math.round(base * mult)
}

export function stageClearBonus(stage: number, mult: number): number {
  return Math.round((200 + stage * 60) * mult)
}

export const SWIPE_LABEL: Record<SwipeDir, string> = {
  up: '위로',
  down: '아래로',
  left: '왼쪽으로',
  right: '오른쪽으로',
}

export const SWIPE_ARROW: Record<SwipeDir, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

export function colorById(id: ColorId): ColorDef {
  return COLORS.find((c) => c.id === id) ?? COLORS[0]!
}

/** Rival taunt lines based on gap to personal best. */
export function rivalLine(best: number, score: number): string {
  if (best <= 0) return '첫 기록을 세워보세요.'
  const gap = best - score
  if (gap <= 0) return '신기록! 이제 이 점수가 라이벌입니다.'
  if (gap <= 50) return `고작 ${gap}점 차이. 한 판이면 뒤집어요.`
  if (gap <= 150) return `베스트까지 ${gap}점. 손이 기억하고 있을걸요.`
  if (gap <= 400) return `아직 ${gap}점 남음. 피버만 타면 됩니다.`
  return `베스트 ${best}. 오늘은 어디까지 가나.`
}
