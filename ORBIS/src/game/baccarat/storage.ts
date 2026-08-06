import type { RoadBead } from './types'

const BALANCE_KEY = 'orbis.table.balance.v1'
const ROAD_KEY = 'orbis.table.road.v1'
export const STARTING_BALANCE = 1000
const MAX_ROAD = 48

export function loadBalance(): number {
  if (typeof window === 'undefined') return STARTING_BALANCE
  const raw = window.localStorage.getItem(BALANCE_KEY)
  if (raw == null || raw.trim() === '') return STARTING_BALANCE
  const value = Number(raw)
  if (!Number.isFinite(value)) return STARTING_BALANCE
  return Math.max(0, Math.floor(value))
}

export function saveBalance(balance: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BALANCE_KEY, String(Math.max(0, Math.floor(balance))))
}

export function loadRoad(): RoadBead[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ROAD_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RoadBead[]
    if (!Array.isArray(parsed)) return []
    return parsed.slice(-MAX_ROAD)
  } catch {
    return []
  }
}

export function saveRoad(road: RoadBead[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ROAD_KEY, JSON.stringify(road.slice(-MAX_ROAD)))
}

export function resetTableProgress(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BALANCE_KEY, String(STARTING_BALANCE))
  window.localStorage.setItem(ROAD_KEY, JSON.stringify([]))
}
