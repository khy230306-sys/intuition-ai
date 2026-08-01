export type Screen = 'home' | 'stages' | 'play' | 'result'

export interface MedalDef {
  id: string
  title: string
  desc: string
}

export const MEDALS: MedalDef[] = [
  { id: 'first-clear', title: '첫 클리어', desc: '스테이지 1 클리어' },
  { id: 'stage-5', title: '워밍업', desc: '스테이지 5 클리어' },
  { id: 'stage-10', title: '손맛', desc: '스테이지 10 클리어' },
  { id: 'stage-20', title: '퍼즐러', desc: '스테이지 20 클리어' },
  { id: 'stage-40', title: '착 마스터', desc: '스테이지 40 클리어' },
  { id: 'combo-3', title: '연쇄', desc: '콤보 3 달성' },
  { id: 'combo-5', title: '불꽃 연쇄', desc: '콤보 5 달성' },
  { id: 'clear-2', title: '더블', desc: '한 번에 2줄 지우기' },
  { id: 'clear-3', title: '트리플', desc: '한 번에 3줄 이상' },
  { id: 'endless-2k', title: '지구력', desc: '엔드리스 2000점' },
  { id: 'endless-5k', title: '끝없는 손', desc: '엔드리스 5000점' },
  { id: 'daily', title: '오늘의 착', desc: '데일리 목표 달성' },
  { id: 'streak-3', title: '3일 연속', desc: '3일 연속 플레이' },
  { id: 'perfect', title: '여유', desc: '목표의 150%로 클리어' },
]

export interface Profile {
  xp: number
  maxStage: number // highest unlocked (1-based clear count → unlock next)
  stageStars: Record<string, number>
  bestEndless: number
  bestCombo: number
  medals: string[]
  dayStreak: number
  lastPlayDay: string | null
  dailyScore: number
  dailyDay: string | null
  dailyCleared: boolean
  totalClears: number
}

const KEY = 'chak-puzzle-profile-v1'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function defaultProfile(): Profile {
  return {
    xp: 0,
    maxStage: 1,
    stageStars: {},
    bestEndless: 0,
    bestCombo: 0,
    medals: [],
    dayStreak: 0,
    lastPlayDay: null,
    dailyScore: 0,
    dailyDay: null,
    dailyCleared: false,
    totalClears: 0,
  }
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProfile()
    const p = { ...defaultProfile(), ...(JSON.parse(raw) as Partial<Profile>) }
    const day = todayKey()
    if (p.dailyDay !== day) {
      p.dailyDay = day
      p.dailyScore = 0
      p.dailyCleared = false
    }
    return p
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p))
}

export interface RankDef {
  label: string
  minXp: number
  color: string
}

export const RANKS: RankDef[] = [
  { label: '연습', minXp: 0, color: '#7a9aa3' },
  { label: '견습', minXp: 400, color: '#2ec4b6' },
  { label: '숙련', minXp: 1200, color: '#4d96ff' },
  { label: '고수', minXp: 2800, color: '#ff6b4a' },
  { label: '달인', minXp: 5500, color: '#ffd166' },
  { label: '명인', minXp: 9500, color: '#1b3a4b' },
  { label: '전설', minXp: 15000, color: '#f4a261' },
]

export function rankFor(xp: number): RankDef {
  let cur = RANKS[0]!
  for (const r of RANKS) if (xp >= r.minXp) cur = r
  return cur
}

export function rankProgress(xp: number) {
  const cur = rankFor(xp)
  const idx = RANKS.findIndex((r) => r.label === cur.label)
  const next = RANKS[idx + 1] ?? null
  if (!next) return { cur, next, pct: 1, need: 0 }
  return {
    cur,
    next,
    pct: Math.min(1, (xp - cur.minXp) / (next.minXp - cur.minXp)),
    need: next.minXp - xp,
  }
}

export function dailyTarget(): number {
  const day = todayKey()
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  return 1200 + (h % 900)
}

function unlock(p: Profile, id: string, newly: string[]) {
  if (!p.medals.includes(id)) {
    p.medals.push(id)
    newly.push(id)
  }
}

export function touchSession(p: Profile): Profile {
  const day = todayKey()
  const next = { ...p, medals: [...p.medals], stageStars: { ...p.stageStars } }
  if (next.lastPlayDay !== day) {
    next.dayStreak = next.lastPlayDay === yesterdayKey() ? next.dayStreak + 1 : 1
    next.lastPlayDay = day
  }
  if (next.dailyDay !== day) {
    next.dailyDay = day
    next.dailyScore = 0
    next.dailyCleared = false
  }
  saveProfile(next)
  return next
}

export function starsFor(score: number, goal: number): number {
  if (score < goal) return 0
  if (score >= goal * 1.5) return 3
  if (score >= goal * 1.2) return 2
  return 1
}

export interface SettleInput {
  mode: 'stage' | 'endless'
  stageId: number
  score: number
  goal: number
  won: boolean
  bestCombo: number
  maxLinesAtOnce: number
}

export function settleRun(p: Profile, run: SettleInput): { profile: Profile; newMedals: MedalDef[]; stars: number; xpGained: number } {
  const next = { ...p, medals: [...p.medals], stageStars: { ...p.stageStars } }
  const newly: string[] = []
  let xpGained = Math.floor(run.score * 0.2) + run.bestCombo * 10
  let stars = 0

  next.bestCombo = Math.max(next.bestCombo, run.bestCombo)
  next.dailyScore = Math.max(next.dailyScore, run.score)

  if (run.mode === 'endless') {
    if (run.score > next.bestEndless) next.bestEndless = run.score
    if (run.score >= 2000) unlock(next, 'endless-2k', newly)
    if (run.score >= 5000) unlock(next, 'endless-5k', newly)
  }

  if (run.mode === 'stage' && run.won) {
    stars = starsFor(run.score, run.goal)
    const key = String(run.stageId)
    next.stageStars[key] = Math.max(next.stageStars[key] ?? 0, stars)
    next.totalClears += 1
    next.maxStage = Math.max(next.maxStage, run.stageId + 1)
    xpGained += 80 + run.stageId * 12 + stars * 20

    if (run.stageId >= 1) unlock(next, 'first-clear', newly)
    if (run.stageId >= 5) unlock(next, 'stage-5', newly)
    if (run.stageId >= 10) unlock(next, 'stage-10', newly)
    if (run.stageId >= 20) unlock(next, 'stage-20', newly)
    if (run.stageId >= 40) unlock(next, 'stage-40', newly)
    if (stars >= 3) unlock(next, 'perfect', newly)
  }

  if (run.bestCombo >= 3) unlock(next, 'combo-3', newly)
  if (run.bestCombo >= 5) unlock(next, 'combo-5', newly)
  if (run.maxLinesAtOnce >= 2) unlock(next, 'clear-2', newly)
  if (run.maxLinesAtOnce >= 3) unlock(next, 'clear-3', newly)
  if (next.dayStreak >= 3) unlock(next, 'streak-3', newly)

  const target = dailyTarget()
  if (!next.dailyCleared && next.dailyScore >= target) {
    next.dailyCleared = true
    xpGained += 150
    unlock(next, 'daily', newly)
  }

  next.xp += xpGained
  saveProfile(next)
  return {
    profile: next,
    newMedals: newly.map((id) => MEDALS.find((m) => m.id === id)!).filter(Boolean),
    stars,
    xpGained,
  }
}
