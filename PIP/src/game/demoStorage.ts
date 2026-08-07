import { INITIAL_DEMO_POINTS } from './types'

const POINTS_KEY = 'pip.demoPoints.v1'

export function loadDemoPoints(): number {
  if (typeof window === 'undefined') return INITIAL_DEMO_POINTS
  const raw = window.localStorage.getItem(POINTS_KEY)
  if (raw == null || raw.trim() === '') return INITIAL_DEMO_POINTS
  const value = Number(raw)
  if (!Number.isFinite(value)) return INITIAL_DEMO_POINTS
  return Math.max(0, Math.floor(value))
}

export function saveDemoPoints(points: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(POINTS_KEY, String(Math.max(0, Math.floor(points))))
}
