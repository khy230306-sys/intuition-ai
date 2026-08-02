export type Position = 1 | 2 | 3
export type CardNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface GameRecord {
  id: string
  cards: [CardNumber, CardNumber, CardNumber]
  winner: Position
  recommended: Position | null
  hit: boolean | null
  createdAt: number
}

export interface EngineResult {
  name: string
  probs: [number, number, number]
  weight: number
  sample: number
  reason: string
}

export interface AnalysisResult {
  probs: [number, number, number]
  recommended: Position
  confidence: number
  sample: number
  recent50Rate: number | null
  overallRate: number | null
  reason: string
  engines: EngineResult[]
}

export interface HeaderStats {
  total: number
  recentHitRate: number | null
  overallHitRate: number | null
  confidence: number
}

export interface AppState {
  cards: (CardNumber | null)[]
  analysis: AnalysisResult | null
  view: 'play' | 'stats' | 'data'
  flash: string | null
}

export const STORAGE_KEY = 'djgt_pick_ai_v1'
export const BACKUP_KEY = 'djgt_pick_ai_backup_v1'
