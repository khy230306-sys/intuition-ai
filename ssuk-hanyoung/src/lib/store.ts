import {
  DEFAULT_PARENT_SETTINGS,
  emptyLearningProgress,
  type ActivityEntry,
  type LearningProgress,
  type ParentSettings,
} from './learningTypes'
import { migrateLearningFields } from './migrateLearning'

export type Profile = {
  name: string
  stars: number
  played: Record<string, number>
  stickers: string[]
  missionDate: string
  missionsDone: string[]
  muteSpeech: boolean
  muteSfx: boolean
  lastSticker?: string | null
  learningProgress?: LearningProgress
  activityLog?: ActivityEntry[]
  parentSettings?: ParentSettings
  playStreak?: number
  lastPlayDate?: string
}

const KEY = 'ssuk-hanyoung-v3'

const DEFAULT: Profile = {
  name: '한영이',
  stars: 0,
  played: {},
  stickers: [],
  missionDate: '',
  missionsDone: [],
  muteSpeech: false,
  muteSfx: false,
  lastSticker: null,
  learningProgress: emptyLearningProgress(),
  activityLog: [],
  parentSettings: { ...DEFAULT_PARENT_SETTINGS },
  playStreak: 0,
  lastPlayDate: '',
}

/** Stickers use optimized WebP (same art family as GameArt) */
const C = '/assets/chars/sm'
export const STICKERS = [
  { id: 'bus', src: `${C}/bus.webp`, ko: '버스' },
  { id: 'police', src: `${C}/police.webp`, ko: '경찰차' },
  { id: 'fire', src: `${C}/fire.webp`, ko: '소방차' },
  { id: 'ambulance', src: `${C}/ambulance.webp`, ko: '구급차' },
  { id: 'sports', src: `${C}/char-car.webp`, ko: '자동차' },
  { id: 'truck', src: `${C}/dump.webp`, ko: '트럭' },
  { id: 'tractor', src: `${C}/tractor.webp`, ko: '트랙터' },
  { id: 'star', src: `${C}/char-star.webp`, ko: '별' },
  { id: 'paint', src: `${C}/char-paint.webp`, ko: '팔레트' },
  { id: 'drum', src: `${C}/char-drum.webp`, ko: '북' },
  { id: 'sand', src: `${C}/char-sand.webp`, ko: '모래성' },
  { id: 'busFront', src: `${C}/bus-front.webp`, ko: '스쿨버스' },
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('ssuk-hanyoung-v2')
    if (!raw) {
      return migrateLearningFields({
        ...DEFAULT,
        played: {},
        stickers: [],
        missionsDone: [],
        learningProgress: emptyLearningProgress(),
        activityLog: [],
      })
    }
    const parsed = JSON.parse(raw)
    const base: Profile = {
      ...DEFAULT,
      ...parsed,
      played: { ...(parsed.played || {}) },
      stickers: parsed.stickers || [],
      missionsDone: parsed.missionsDone || [],
      muteSpeech: !!parsed.muteSpeech,
      muteSfx: !!parsed.muteSfx,
    }
    return migrateLearningFields(base)
  } catch {
    return migrateLearningFields({
      ...DEFAULT,
      played: {},
      stickers: [],
      missionsDone: [],
      learningProgress: emptyLearningProgress(),
      activityLog: [],
    })
  }
}

function write(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p))
  window.dispatchEvent(new CustomEvent('ssuk-profile'))
}

export function writeProfilePatch(p: Profile) {
  write(migrateLearningFields(p))
}

export function getProfile(): Profile {
  return read()
}

export function getSettings() {
  const p = read()
  return { muteSpeech: p.muteSpeech, muteSfx: p.muteSfx }
}

export function setMuteSpeech(v: boolean) {
  const p = read()
  p.muteSpeech = v
  write(p)
}

export function setMuteSfx(v: boolean) {
  const p = read()
  p.muteSfx = v
  write(p)
  window.dispatchEvent(new CustomEvent('ssuk-sfx-mute', { detail: v }))
}

export function setName(name: string) {
  const p = read()
  p.name = name.trim() || DEFAULT.name
  write(p)
}

function maybeUnlockSticker(p: Profile) {
  const locked = STICKERS.filter((s) => !p.stickers.includes(s.id))
  if (!locked.length) return null
  const should = p.stars > 0 && p.stars % 4 === 0
  if (!should) return null
  const pick = locked[Math.floor(Math.random() * locked.length)]!
  p.stickers = [...p.stickers, pick.id]
  p.lastSticker = pick.id
  return pick
}

export function consumeLastSticker() {
  const p = read()
  const id = p.lastSticker
  if (!id) return null
  p.lastSticker = null
  write(p)
  return STICKERS.find((s) => s.id === id) || null
}

export function addStars(n: number, gameId?: string, opts?: { skipLearning?: boolean; duration?: number; colorsUsed?: string[]; toolsUsed?: string[] }) {
  const p = read()
  p.stars += n
  if (gameId) p.played[gameId] = (p.played[gameId] || 0) + 1
  const unlocked = maybeUnlockSticker(p)
  ensureMissions(p)
  if (gameId && !p.missionsDone.includes(gameId)) {
    const todays = getMissionIdsFor(p.missionDate)
    if (todays.includes(gameId)) {
      p.missionsDone = [...p.missionsDone, gameId]
      p.stars += 1
    }
  }
  write(p)
  if (unlocked) {
    window.dispatchEvent(new CustomEvent('ssuk-sticker', { detail: unlocked }))
  }
  // Learning Core: stars → success or creative engagement (no forced fail on creative)
  if (gameId && typeof window !== 'undefined' && !opts?.skipLearning) {
    void import('./learningEvents').then(({ recordSuccess }) => {
      recordSuccess(gameId, {
        duration: opts?.duration ?? 15,
        score: n,
        colorsUsed: opts?.colorsUsed,
        toolsUsed: opts?.toolsUsed,
      })
    })
  }
  return p.stars
}

function getMissionIdsFor(date: string) {
  const pool = [
    'color-follow',
    'car-paint',
    'maze-drive',
    'sound-board',
    'car-parade',
    'car-puzzle',
    'story-tap',
    'wait-go',
    'car-builder',
    'sand-play',
    'balloons',
    'color-mix',
  ]
  let hash = 0
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) >>> 0
  const out: string[] = []
  let h = hash
  while (out.length < 3) {
    const id = pool[h % pool.length]!
    if (!out.includes(id)) out.push(id)
    h = (h * 17 + 13) >>> 0
  }
  return out
}

function ensureMissions(p: Profile) {
  const t = todayKey()
  if (p.missionDate !== t) {
    p.missionDate = t
    p.missionsDone = []
  }
}

export function getDailyMissions() {
  const p = read()
  ensureMissions(p)
  write(p)
  const ids = getMissionIdsFor(p.missionDate)
  return ids.map((id) => ({
    id,
    done: p.missionsDone.includes(id),
  }))
}

export function useProfileSubscribe(cb: () => void) {
  window.addEventListener('ssuk-profile', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('ssuk-profile', cb)
    window.removeEventListener('storage', cb)
  }
}
