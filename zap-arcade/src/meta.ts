/** Persistent profile, ranks, medals, daily challenge — progression & rivalry. */

export type RankId =
  | 'rookie'
  | 'spark'
  | 'flash'
  | 'bolt'
  | 'thunder'
  | 'storm'
  | 'legend'

export interface RankDef {
  id: RankId
  label: string
  minXp: number
  color: string
}

export const RANKS: RankDef[] = [
  { id: 'rookie', label: '루키', minXp: 0, color: '#7a9aa3' },
  { id: 'spark', label: '스파크', minXp: 400, color: '#00c2a8' },
  { id: 'flash', label: '플래시', minXp: 1200, color: '#1a4d7c' },
  { id: 'bolt', label: '볼트', minXp: 2800, color: '#e8b86d' },
  { id: 'thunder', label: '썬더', minXp: 5500, color: '#ff4d6d' },
  { id: 'storm', label: '스톰', minXp: 9500, color: '#7ef0d4' },
  { id: 'legend', label: '레전드', minXp: 15000, color: '#063a42' },
]

export interface MedalDef {
  id: string
  title: string
  desc: string
}

export const MEDALS: MedalDef[] = [
  { id: 'first-blood', title: '첫 출격', desc: '첫 판을 끝냈다' },
  { id: 'combo-5', title: '손맛', desc: '콤보 5 달성' },
  { id: 'combo-12', title: '광속', desc: '콤보 12 달성' },
  { id: 'combo-20', title: '무아지경', desc: '콤보 20 달성' },
  { id: 'score-1k', title: '천점 클럽', desc: '한 판 1000점' },
  { id: 'score-3k', title: '삼천 돌파', desc: '한 판 3000점' },
  { id: 'score-5k', title: '오천 괴물', desc: '한 판 5000점' },
  { id: 'react-200', title: '반사신경', desc: 'GO 반응 200ms 이하' },
  { id: 'react-120', title: '번개손', desc: 'GO 반응 120ms 이하' },
  { id: 'fever-enter', title: '피버 입성', desc: '피버 모드 진입' },
  { id: 'stage-10', title: '스테이지 10', desc: '한 판에서 스테이지 10' },
  { id: 'stage-20', title: '스테이지 20', desc: '한 판에서 스테이지 20' },
  { id: 'daily-clear', title: '일일 정복', desc: '데일리 챌린지 클리어' },
  { id: 'streak-3', title: '3일 연속', desc: '3일 연속 플레이' },
  { id: 'streak-7', title: '일주일 불꽃', desc: '7일 연속 플레이' },
  { id: 'plays-20', title: '단골', desc: '누적 20판' },
  { id: 'plays-50', title: '중독', desc: '누적 50판' },
  { id: 'near-revenge', title: '복수심', desc: '베스트 50점 이내로 아깝게 실패 후 재도전' },
]

export interface Profile {
  xp: number
  bestScore: number
  bestCombo: number
  bestReactMs: number | null
  totalPlays: number
  totalScore: number
  medals: string[]
  dayStreak: number
  lastPlayDay: string | null
  dailyBest: number
  dailyDay: string | null
  dailyCleared: boolean
  almostBeat: boolean
}

const PROFILE_KEY = 'zap-arcade-profile-v1'

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
    bestScore: 0,
    bestCombo: 0,
    bestReactMs: null,
    totalPlays: 0,
    totalScore: 0,
    medals: [],
    dayStreak: 0,
    lastPlayDay: null,
    dailyBest: 0,
    dailyDay: null,
    dailyCleared: false,
    almostBeat: false,
  }
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return defaultProfile()
    const p = { ...defaultProfile(), ...(JSON.parse(raw) as Partial<Profile>) }
    // migrate day
    const day = todayKey()
    if (p.dailyDay !== day) {
      p.dailyDay = day
      p.dailyBest = 0
      p.dailyCleared = false
    }
    return p
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
}

export function rankForXp(xp: number): RankDef {
  let current = RANKS[0]!
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r
  }
  return current
}

export function nextRank(xp: number): RankDef | null {
  const cur = rankForXp(xp)
  const idx = RANKS.findIndex((r) => r.id === cur.id)
  return RANKS[idx + 1] ?? null
}

export function rankProgress(xp: number): { pct: number; cur: RankDef; next: RankDef | null; need: number } {
  const cur = rankForXp(xp)
  const next = nextRank(xp)
  if (!next) return { pct: 1, cur, next: null, need: 0 }
  const span = next.minXp - cur.minXp
  const into = xp - cur.minXp
  return { pct: Math.min(1, into / span), cur, next, need: next.minXp - xp }
}

/** Seeded daily target — rises with rank so it always feels like a stretch. */
export function dailyTarget(xp: number): number {
  const day = todayKey()
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  const base = 900 + (h % 700)
  const rankBoost = Math.floor(rankForXp(xp).minXp / 40)
  return base + rankBoost
}

export interface RunSummary {
  score: number
  bestCombo: number
  stage: number
  perfects: number
  feverPeaks: number
  bestReactMs: number | null
  nearMiss: boolean
}

export interface SettleResult {
  profile: Profile
  xpGained: number
  leveledUp: boolean
  newRank: RankDef | null
  newMedals: MedalDef[]
  newBest: boolean
  dailyClearedNow: boolean
  gapToBest: number
}

function unlock(p: Profile, id: string, newly: string[]) {
  if (!p.medals.includes(id)) {
    p.medals.push(id)
    newly.push(id)
  }
}

export function settleRun(prev: Profile, run: RunSummary): SettleResult {
  const p: Profile = {
    ...prev,
    medals: [...prev.medals],
  }
  const day = todayKey()
  const newly: string[] = []

  // streak
  if (p.lastPlayDay === day) {
    // already counted today
  } else if (p.lastPlayDay === yesterdayKey()) {
    p.dayStreak += 1
  } else {
    p.dayStreak = 1
  }
  p.lastPlayDay = day

  if (p.dailyDay !== day) {
    p.dailyDay = day
    p.dailyBest = 0
    p.dailyCleared = false
  }

  const oldRank = rankForXp(p.xp)
  const xpGained =
    Math.round(run.score * 0.35) +
    run.bestCombo * 8 +
    run.perfects * 15 +
    run.stage * 4 +
    (run.feverPeaks > 0 ? 40 : 0)

  p.xp += xpGained
  p.totalPlays += 1
  p.totalScore += run.score
  p.dailyBest = Math.max(p.dailyBest, run.score)

  const newBest = run.score > p.bestScore
  const gapToBest = p.bestScore - run.score
  p.almostBeat = !newBest && p.bestScore > 0 && gapToBest > 0 && gapToBest <= 120

  if (newBest) p.bestScore = run.score
  if (run.bestCombo > p.bestCombo) p.bestCombo = run.bestCombo
  if (run.bestReactMs != null) {
    if (p.bestReactMs == null || run.bestReactMs < p.bestReactMs) {
      p.bestReactMs = run.bestReactMs
    }
  }

  const target = dailyTarget(prev.xp)
  let dailyClearedNow = false
  if (!p.dailyCleared && run.score >= target) {
    p.dailyCleared = true
    dailyClearedNow = true
    p.xp += 150
    unlock(p, 'daily-clear', newly)
  }

  // medals
  unlock(p, 'first-blood', newly)
  if (run.bestCombo >= 5) unlock(p, 'combo-5', newly)
  if (run.bestCombo >= 12) unlock(p, 'combo-12', newly)
  if (run.bestCombo >= 20) unlock(p, 'combo-20', newly)
  if (run.score >= 1000) unlock(p, 'score-1k', newly)
  if (run.score >= 3000) unlock(p, 'score-3k', newly)
  if (run.score >= 5000) unlock(p, 'score-5k', newly)
  if (run.bestReactMs != null && run.bestReactMs <= 200) unlock(p, 'react-200', newly)
  if (run.bestReactMs != null && run.bestReactMs <= 120) unlock(p, 'react-120', newly)
  if (run.feverPeaks > 0) unlock(p, 'fever-enter', newly)
  if (run.stage >= 10) unlock(p, 'stage-10', newly)
  if (run.stage >= 20) unlock(p, 'stage-20', newly)
  if (p.dayStreak >= 3) unlock(p, 'streak-3', newly)
  if (p.dayStreak >= 7) unlock(p, 'streak-7', newly)
  if (p.totalPlays >= 20) unlock(p, 'plays-20', newly)
  if (p.totalPlays >= 50) unlock(p, 'plays-50', newly)
  if (p.almostBeat) unlock(p, 'near-revenge', newly)

  const newRankDef = rankForXp(p.xp)
  const leveledUp = newRankDef.id !== oldRank.id

  saveProfile(p)

  return {
    profile: p,
    xpGained: xpGained + (dailyClearedNow ? 150 : 0),
    leveledUp,
    newRank: leveledUp ? newRankDef : null,
    newMedals: newly.map((id) => MEDALS.find((m) => m.id === id)!).filter(Boolean),
    newBest,
    dailyClearedNow,
    gapToBest: Math.max(0, gapToBest),
  }
}

export function gradeForGo(ms: number): 'S' | 'A' | 'B' | 'C' {
  if (ms <= 160) return 'S'
  if (ms <= 260) return 'A'
  if (ms <= 400) return 'B'
  return 'C'
}

export function gradeForSpeed(elapsed: number, limit: number): 'S' | 'A' | 'B' | 'C' {
  const r = elapsed / limit
  if (r <= 0.28) return 'S'
  if (r <= 0.45) return 'A'
  if (r <= 0.7) return 'B'
  return 'C'
}
