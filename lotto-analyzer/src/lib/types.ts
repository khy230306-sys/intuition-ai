/** Compact draw row: [round, date, n1..n6, bonus] */
export type DrawRow = [
  number,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export interface Draw {
  round: number
  date: string
  numbers: number[]
  bonus: number
}

export interface Dataset {
  source: string
  updated: string
  count: number
  draws: DrawRow[]
}

export interface NumberStat {
  n: number
  count: number
  rate: number
  lastRound: number
  gap: number
  avgGap: number
  overdue: number
  recentCount: number
  weightedScore: number
}

export interface PairStat {
  a: number
  b: number
  count: number
}

export interface PatternSummary {
  oddEven: Record<string, number>
  highLow: Record<string, number>
  sumBuckets: { label: string; count: number; min: number; max: number }[]
  consecutive: Record<number, number>
  acBuckets: Record<string, number>
  sections: number[]
}

export type Strategy =
  | 'balanced'
  | 'hot'
  | 'cold'
  | 'overdue'
  | 'pair'
  | 'flow'

export interface PickResult {
  numbers: number[]
  strategy: Strategy
  score: number
  reasons: string[]
  pattern: {
    oddEven: string
    highLow: string
    sum: number
    consecutive: number
    ac: number
  }
}
