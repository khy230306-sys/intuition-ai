export type Profile = {
  name: string
  character: string
  stars: number
  played: Record<string, number>
}

const KEY = 'ssuk-hanyoung-v2'

const DEFAULT: Profile = {
  name: '한영이',
  character: '🚌',
  stars: 0,
  played: {},
}

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT, played: {} }
    return { ...DEFAULT, ...JSON.parse(raw), played: { ...DEFAULT.played, ...(JSON.parse(raw).played || {}) } }
  } catch {
    return { ...DEFAULT, played: {} }
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

export function addStars(n: number, gameId?: string) {
  const p = read()
  p.stars += n
  if (gameId) p.played[gameId] = (p.played[gameId] || 0) + 1
  write(p)
  return p.stars
}

export function useProfileSubscribe(cb: () => void) {
  window.addEventListener('ssuk-profile', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('ssuk-profile', cb)
    window.removeEventListener('storage', cb)
  }
}
