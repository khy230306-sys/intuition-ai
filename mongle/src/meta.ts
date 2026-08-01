import { MAX_LEVEL, type RunState } from './game'

export type Screen = 'home' | 'play' | 'book' | 'result'

export interface MedalDef {
  id: string
  title: string
  desc: string
}

export const MEDALS: MedalDef[] = [
  { id: 'first-merge', title: '첫 합체', desc: '처음으로 합쳤다' },
  { id: 'lv5', title: '몽별 탄생', desc: '레벨 5 도달' },
  { id: 'lv8', title: '산의 숨결', desc: '레벨 8 도달' },
  { id: 'lv12', title: '전설', desc: '전설몽 탄생' },
  { id: 'merge-50', title: '손버릇', desc: '누적 합치기 50' },
  { id: 'merge-200', title: '중독', desc: '누적 합치기 200' },
  { id: 'merge-500', title: '몽글 장인', desc: '누적 합치기 500' },
  { id: 'coin-1k', title: '부자 몽', desc: '코인 1000 보유' },
  { id: 'prestige-1', title: '이사', desc: '첫 리셋 성장' },
  { id: 'prestige-3', title: '유랑', desc: '리셋 3회' },
  { id: 'book-6', title: '도감러', desc: '도감 6종 해금' },
  { id: 'book-all', title: '완성', desc: '도감 전부 해금' },
  { id: 'daily', title: '오늘도', desc: '데일리 클리어' },
  { id: 'streak-3', title: '3일 둥지', desc: '3일 연속 접속' },
]

export interface Profile {
  xp: number
  bestHighest: number
  lifetimeMerges: number
  lifetimeCoins: number
  medals: string[]
  dayStreak: number
  lastPlayDay: string | null
  dailyMerges: number
  dailyDay: string | null
  dailyCleared: boolean
  unlocked: number
  prestige: number
}

const KEY = 'mongle-profile-v1'

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
    bestHighest: 1,
    lifetimeMerges: 0,
    lifetimeCoins: 0,
    medals: [],
    dayStreak: 0,
    lastPlayDay: null,
    dailyMerges: 0,
    dailyDay: null,
    dailyCleared: false,
    unlocked: 1,
    prestige: 0,
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
      p.dailyMerges = 0
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

export type RankId = '둥지' | '새싹' | '잎새' | '가지' | '숲' | '산' | '전설'

export interface RankDef {
  label: RankId
  minXp: number
  color: string
}

export const RANKS: RankDef[] = [
  { label: '둥지', minXp: 0, color: '#7a9aa3' },
  { label: '새싹', minXp: 300, color: '#7fd6c2' },
  { label: '잎새', minXp: 900, color: '#5aa6e8' },
  { label: '가지', minXp: 2200, color: '#ff7a59' },
  { label: '숲', minXp: 4800, color: '#1f4d5c' },
  { label: '산', minXp: 9000, color: '#ffb347' },
  { label: '전설', minXp: 15000, color: '#ffd166' },
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
  const pct = (xp - cur.minXp) / (next.minXp - cur.minXp)
  return { cur, next, pct: Math.min(1, pct), need: next.minXp - xp }
}

export function dailyTarget(prestige: number): number {
  const day = todayKey()
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 33 + day.charCodeAt(i)) >>> 0
  return 12 + (h % 10) + prestige * 2
}

function unlock(p: Profile, id: string, newly: string[]) {
  if (!p.medals.includes(id)) {
    p.medals.push(id)
    newly.push(id)
  }
}

export function touchSession(p: Profile): Profile {
  const day = todayKey()
  const next = { ...p, medals: [...p.medals] }
  if (next.lastPlayDay !== day) {
    if (next.lastPlayDay === yesterdayKey()) next.dayStreak += 1
    else next.dayStreak = 1
    next.lastPlayDay = day
  }
  if (next.dailyDay !== day) {
    next.dailyDay = day
    next.dailyMerges = 0
    next.dailyCleared = false
  }
  saveProfile(next)
  return next
}

export function applyMergeProgress(p: Profile, run: RunState, mergedTo: number): { profile: Profile; newMedals: MedalDef[] } {
  const newly: string[] = []
  const next = { ...p, medals: [...p.medals] }
  next.lifetimeMerges += 1
  next.dailyMerges += 1
  next.xp += 8 + mergedTo * 4
  next.unlocked = Math.max(next.unlocked, run.unlocked)
  next.bestHighest = Math.max(next.bestHighest, run.highest)
  next.prestige = run.prestige

  unlock(next, 'first-merge', newly)
  if (run.highest >= 5) unlock(next, 'lv5', newly)
  if (run.highest >= 8) unlock(next, 'lv8', newly)
  if (run.highest >= MAX_LEVEL) unlock(next, 'lv12', newly)
  if (next.lifetimeMerges >= 50) unlock(next, 'merge-50', newly)
  if (next.lifetimeMerges >= 200) unlock(next, 'merge-200', newly)
  if (next.lifetimeMerges >= 500) unlock(next, 'merge-500', newly)
  if (run.coins >= 1000) unlock(next, 'coin-1k', newly)
  if (next.unlocked >= 6) unlock(next, 'book-6', newly)
  if (next.unlocked >= MAX_LEVEL) unlock(next, 'book-all', newly)
  if (next.dayStreak >= 3) unlock(next, 'streak-3', newly)

  const target = dailyTarget(run.prestige)
  if (!next.dailyCleared && next.dailyMerges >= target) {
    next.dailyCleared = true
    next.xp += 120
    unlock(next, 'daily', newly)
  }

  saveProfile(next)
  return {
    profile: next,
    newMedals: newly.map((id) => MEDALS.find((m) => m.id === id)!).filter(Boolean),
  }
}

export function applyPrestige(p: Profile, run: RunState): Profile {
  const next = { ...p, medals: [...p.medals] }
  next.prestige = run.prestige + 1
  next.xp += 200 + run.highest * 40
  next.unlocked = Math.max(next.unlocked, run.unlocked)
  const newly: string[] = []
  unlock(next, 'prestige-1', newly)
  if (next.prestige >= 3) unlock(next, 'prestige-3', newly)
  void newly
  saveProfile(next)
  return next
}
