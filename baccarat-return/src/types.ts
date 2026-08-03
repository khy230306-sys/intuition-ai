/** Banker / Player / Tie */
export type Outcome = 'B' | 'P' | 'T'

export type Mark = 'O' | 'X'

export type View = 'setup' | 'play' | 'history'

export type SessionStatus = 'idle' | 'playing' | 'cleared' | 'failed'

export interface SessionRecord {
  id: string
  createdAt: number
  pattern: Outcome[]
  marks: Mark[]
  status: 'cleared' | 'failed'
  hitCount: number
  missCount: number
  source: 'photo' | 'manual'
}

export interface BigRoadCell {
  outcome: 'B' | 'P'
  tiesAfter: number
}

/** Column-major Big Road grid (max 6 rows per column). */
export type BigRoad = BigRoadCell[][]
