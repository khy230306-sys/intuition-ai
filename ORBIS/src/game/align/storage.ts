const SCORE_KEY = 'orbis.align.score.v1'
const LEVEL_KEY = 'orbis.align.level.v1'

export function loadBestScore(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(SCORE_KEY)
  if (raw == null || raw.trim() === '') return 0
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function saveBestScore(score: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SCORE_KEY, String(Math.max(0, Math.floor(score))))
}

export function loadUnlockedLevel(): number {
  if (typeof window === 'undefined') return 1
  const raw = window.localStorage.getItem(LEVEL_KEY)
  if (raw == null || raw.trim() === '') return 1
  const value = Number(raw)
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(20, Math.floor(value)))
}

export function saveUnlockedLevel(level: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LEVEL_KEY, String(Math.max(1, Math.min(20, Math.floor(level)))))
}

export function resetAlignProgress(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SCORE_KEY, '0')
  window.localStorage.setItem(LEVEL_KEY, '1')
}
