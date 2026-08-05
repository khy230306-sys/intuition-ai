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
}

const C = '/assets/chars'
export const STICKERS = [
  { id: 'bus', src: `${C}/bus.png`, ko: '버스' },
  { id: 'police', src: `${C}/police.png`, ko: '경찰차' },
  { id: 'fire', src: `${C}/fire.png`, ko: '소방차' },
  { id: 'ambulance', src: `${C}/ambulance.png`, ko: '구급차' },
  { id: 'sports', src: `${C}/car.png`, ko: '자동차' },
  { id: 'truck', src: `${C}/dump.png`, ko: '트럭' },
  { id: 'tractor', src: `${C}/tractor.png`, ko: '트랙터' },
  { id: 'star', src: `${C}/char-star.png`, ko: '별' },
  { id: 'paint', src: `${C}/char-paint.png`, ko: '팔레트' },
  { id: 'drum', src: `${C}/char-drum.png`, ko: '북' },
  { id: 'sand', src: `${C}/char-sand.png`, ko: '모래성' },
  { id: 'busFront', src: `${C}/bus-front.png`, ko: '스쿨버스' },
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('ssuk-hanyoung-v2')
    if (!raw) return { ...DEFAULT, played: {}, stickers: [], missionsDone: [] }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT,
      ...parsed,
      played: { ...(parsed.played || {}) },
      stickers: parsed.stickers || [],
      missionsDone: parsed.missionsDone || [],
      muteSpeech: !!parsed.muteSpeech,
      muteSfx: !!parsed.muteSfx,
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
  // lazy import avoided — Layout syncs sfx mute
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

export function addStars(n: number, gameId?: string) {
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
