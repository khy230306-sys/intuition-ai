import type {
  Card,
  CardDuelResult,
  OddEven,
  PipValue,
  RoundResult,
  TotalBand,
} from '../types'

/** Max vertical cells in one main-road column before dragon-tail. */
export const MAIN_ROAD_MAX_ROWS = 6

/** Keep at most this many completed shoes in localStorage. */
export const MAX_ARCHIVED_SHOES = 20

export type SameDisplayMode = {
  /** When true, SAME/무 creates its own columns. Default false. */
  sameIndependent: boolean
}

export type MainRoadOutcome = CardDuelResult | TotalBand

export type MainRoadCell = {
  outcome: MainRoadOutcome
  icon: string
  label: string
  /** Attached SAME count when sameIndependent is false. */
  sameCount: number
  /** Round numbers contributing to this cell (main outcome + attached sames). */
  rounds: number[]
  /** True when this cell is part of a dragon-tail extension. */
  isDragonTail: boolean
  /** Streak length at this cell within its column streak. */
  streakIndex: number
}

export type MainRoadColumn = {
  outcome: MainRoadOutcome
  cells: MainRoadCell[]
}

export type MainRoadModel = {
  columns: MainRoadColumn[]
  /** Flattened chronological main outcomes after SAME handling. */
  sequence: MainRoadOutcome[]
}

export type BeadCell = {
  round: number
  cardDuel: CardDuelResult
  totalBand: TotalBand
  total: number
  oddEven: OddEven
  isPair: boolean
  cardA: PipValue
  cardB: PipValue
  duelIcon: string
  totalIcon: string
}

export type BeadRoadModel = {
  /** Column-major grid: each inner array is a column of up to 6 beads. */
  columns: BeadCell[][]
  beads: BeadCell[]
}

export type StreakInfo = {
  outcome: MainRoadOutcome | null
  length: number
  icon: string
  label: string
}

export type RoadStatistics = {
  cardDuel: Record<CardDuelResult, number>
  totalBand: Record<TotalBand, number>
  currentStreak: StreakInfo
  longestStreak: StreakInfo
  progress: { completed: number; total: number }
  pipCounts: Record<PipValue, number>
  pairByValue: Record<PipValue, number>
  pairTotal: number
  totalHistogram: Record<number, number>
}

export type ArchivedShoe = {
  id: string
  shoeNumber: number
  startedAt: string
  endedAt: string
  rounds: RoundResult[]
  /** Present only after shoe completion. Never expose during an active shoe. */
  hidden: Card[] | null
  cardDuelResults: CardDuelResult[]
  totalBandResults: TotalBand[]
}

export type RoadmapTabId = 'duel' | 'total' | 'bead' | 'distribution'
