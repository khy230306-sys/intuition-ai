export type Screen = 'home' | 'stages' | 'play' | 'result'

export interface MedalDef {
  id: string
  title: string
  desc: string
}

export const MEDALS: MedalDef[] = [
  { id: 'first', title: '첫 맞춤', desc: '스테이지 1 클리어' },
  { id: 'stage-5', title: '손놀림', desc: '스테이지 5 클리어' },
  { id: 'stage-10', title: '3×3 졸업', desc: '스테이지 10 클리어' },
  { id: 'stage-25', title: '4×4 정복', desc: '스테이지 25 클리어' },
  { id: 'stage-40', title: '스윽 마스터', desc: '스테이지 40 클리어' },
  { id: 'three-star', title: '완벽', desc: '별 3개 클리어' },
  { id: 'three-star-5', title: '완벽주의', desc: '별 3개 5회' },
  { id: 'fast-30', title: '번개 손', desc: '30초 안 클리어' },
  { id: 'undo-zero', title: '한 수', desc: '되돌리기 없이 클리어' },
  { id: 'daily', title: '오늘의 스윽', desc: '데일리 클리어' },
  { id: 'streak-3', title: '3일 연속', desc: '3일 연속 플레이' },
  { id: 'moves-par', title: '효율', desc: '파 이내로 클리어' },
]

export interface Profile {
  xp: number
  maxStage: number
  stageStars: Record<string, number>
  threeStarCount: number
  bestTimeMs: Record<string, number>
  medals: string[]
  dayStreak: number
  lastPlayDay: string | null
  dailyClears: number
  dailyDay: string | null
  dailyCleared: boolean
  totalClears: number
}

const KEY = 'sseuk-profile-v1'

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
    threeStarCount: 0,
    bestTimeMs: {},
    medals: [],
    dayStreak: 0,
    lastPlayDay: null,
    dailyClears: 0,
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
      p.dailyClears = 0
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
  { label: '입문', minXp: 0, color: '#7a9aa3' },
  { label: '습작', minXp: 350, color: '#3d9cf0' },
  { label: '숙련', minXp: 1000, color: '#5ad1c0' },
  { label: '고수', minXp: 2400, color: '#ff8a5b' },
  { label: '달인', minXp: 5000, color: '#ffd166' },
  { label: '명인', minXp: 9000, color: '#243b55' },
  { label: '전설', minXp: 14000, color: '#ffd166' },
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
  for (let i = 0; i < day.length; i++) h = (h * 29 + day.charCodeAt(i)) >>> 0
  return 2 + (h % 3)
}

function unlock(p: Profile, id: string, newly: string[]) {
  if (!p.medals.includes(id)) {
    p.medals.push(id)
    newly.push(id)
  }
}

export function touchSession(p: Profile): Profile {
  const day = todayKey()
  const next = {
    ...p,
    medals: [...p.medals],
    stageStars: { ...p.stageStars },
    bestTimeMs: { ...p.bestTimeMs },
  }
  if (next.lastPlayDay !== day) {
    next.dayStreak = next.lastPlayDay === yesterdayKey() ? next.dayStreak + 1 : 1
    next.lastPlayDay = day
  }
  if (next.dailyDay !== day) {
    next.dailyDay = day
    next.dailyClears = 0
    next.dailyCleared = false
  }
  saveProfile(next)
  return next
}

export interface SettleInput {
  stageId: number
  size: number
  moves: number
  par: number
  stars: number
  timeMs: number
  usedUndo: boolean
}

export function settleClear(p: Profile, run: SettleInput) {
  const next = {
    ...p,
    medals: [...p.medals],
    stageStars: { ...p.stageStars },
    bestTimeMs: { ...p.bestTimeMs },
  }
  const newly: string[] = []
  const key = String(run.stageId)
  const prevStars = next.stageStars[key] ?? 0
  next.stageStars[key] = Math.max(prevStars, run.stars)
  if (run.stars === 3 && prevStars < 3) next.threeStarCount += 1

  const prevBest = next.bestTimeMs[key]
  if (prevBest == null || run.timeMs < prevBest) next.bestTimeMs[key] = run.timeMs

  next.totalClears += 1
  next.maxStage = Math.max(next.maxStage, run.stageId + 1)
  next.dailyClears += 1

  let xpGained =
    60 +
    run.stageId * 10 +
    run.stars * 25 +
    Math.max(0, run.par - run.moves) * 2 +
    (run.size - 2) * 20

  if (run.stageId >= 1) unlock(next, 'first', newly)
  if (run.stageId >= 5) unlock(next, 'stage-5', newly)
  if (run.stageId >= 10) unlock(next, 'stage-10', newly)
  if (run.stageId >= 25) unlock(next, 'stage-25', newly)
  if (run.stageId >= 40) unlock(next, 'stage-40', newly)
  if (run.stars >= 3) unlock(next, 'three-star', newly)
  if (next.threeStarCount >= 5) unlock(next, 'three-star-5', newly)
  if (run.timeMs <= 30000) unlock(next, 'fast-30', newly)
  if (!run.usedUndo) unlock(next, 'undo-zero', newly)
  if (run.moves <= run.par) unlock(next, 'moves-par', newly)
  if (next.dayStreak >= 3) unlock(next, 'streak-3', newly)

  const target = dailyTarget()
  if (!next.dailyCleared && next.dailyClears >= target) {
    next.dailyCleared = true
    xpGained += 120
    unlock(next, 'daily', newly)
  }

  next.xp += xpGained
  saveProfile(next)
  return {
    profile: next,
    xpGained,
    newMedals: newly.map((id) => MEDALS.find((m) => m.id === id)!).filter(Boolean),
  }
}
