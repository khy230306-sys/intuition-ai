export type Profile = {
  name: string
  character: string
  stars: number
  played: Record<string, number>
  stickers: string[]
  missionDate: string
  missionsDone: string[]
}

const KEY = 'ssuk-hanyoung-v2'

const DEFAULT: Profile = {
  name: '한영이',
  character: '🚌',
  stars: 0,
  played: {},
  stickers: [],
  missionDate: '',
  missionsDone: [],
}

export const STICKERS = [
  { id: 'bus', emoji: '🚌', ko: '버스' },
  { id: 'police', emoji: '🚓', ko: '경찰차' },
  { id: 'fire', emoji: '🚒', ko: '소방차' },
  { id: 'ambulance', emoji: '🚑', ko: '구급차' },
  { id: 'sports', emoji: '🏎️', ko: '스포츠카' },
  { id: 'truck', emoji: '🚚', ko: '트럭' },
  { id: 'train', emoji: '🚂', ko: '기차' },
  { id: 'plane', emoji: '✈️', ko: '비행기' },
  { id: 'star', emoji: '⭐', ko: '별' },
  { id: 'rainbow', emoji: '🌈', ko: '무지개' },
  { id: 'trophy', emoji: '🏆', ko: '트로피' },
  { id: 'heart', emoji: '❤️', ko: '하트' },
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT, played: {}, stickers: [], missionsDone: [] }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT,
      ...parsed,
      played: { ...DEFAULT.played, ...(parsed.played || {}) },
      stickers: parsed.stickers || [],
      missionsDone: parsed.missionsDone || [],
    }
  } catch {
    return { ...DEFAULT, played: {}, stickers: [], missionsDone: [] }
  }
}

function write(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p))
  window.dispatchEvent(new CustomEvent('ssuk-profile'))
}

export function getProfile(): Profile {
  return read()
}

export function setName(name: string) {
  const p = read()
  p.name = name.trim() || DEFAULT.name
  write(p)
}

function maybeUnlockSticker(p: Profile) {
  const locked = STICKERS.filter((s) => !p.stickers.includes(s.id))
  if (!locked.length) return
  // unlock roughly every 4 stars earned total milestones
  const should = p.stars > 0 && p.stars % 4 === 0
  if (!should) return
  const pick = locked[Math.floor(Math.random() * locked.length)]!
  p.stickers = [...p.stickers, pick.id]
}

export function addStars(n: number, gameId?: string) {
  const p = read()
  p.stars += n
  if (gameId) p.played[gameId] = (p.played[gameId] || 0) + 1
  maybeUnlockSticker(p)
  // auto-complete mission if matching game played
  ensureMissions(p)
  if (gameId && !p.missionsDone.includes(gameId)) {
    const todays = getMissionIdsFor(p.missionDate)
    if (todays.includes(gameId)) {
      p.missionsDone = [...p.missionsDone, gameId]
      p.stars += 1
    }
  }
  write(p)
  return p.stars
}

export function unlockSticker(id: string) {
  const p = read()
  if (!p.stickers.includes(id)) {
    p.stickers = [...p.stickers, id]
    write(p)
  }
}

function getMissionIdsFor(date: string) {
  // stable daily trio from game ids
  const pool = [
    'color-follow',
    'sand-play',
    'car-paint',
    'bubble-pop',
    'maze-drive',
    'hidden-cars',
    'sound-board',
    'car-parade',
    'car-puzzle',
    'story-tap',
    'wait-go',
    'rhythm-tap',
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
