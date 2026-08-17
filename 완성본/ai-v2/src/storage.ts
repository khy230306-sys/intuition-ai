import type { Outcome, PatternMemory, PredictionRecord } from './types'
import { HISTORY_CAP, PREDICTION_CAP, STORAGE_KEYS } from './engine/constants'

function loadArray<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function loadObject(key: string): PatternMemory {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}') as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PatternMemory
    }
    return {}
  } catch {
    return {}
  }
}

export type AppStore = {
  history: Outcome[]
  predictionRecords: PredictionRecord[]
  /** Preserved from old engine; not used for Future Road picks. */
  patternMemory: PatternMemory
}

export function loadStore(): AppStore {
  const history = loadArray<Outcome>(STORAGE_KEYS.history).filter(
    (x): x is Outcome => x === 'P' || x === 'B' || x === 'T',
  )
  const predictionRecords = loadArray<PredictionRecord>(STORAGE_KEYS.predictionRecords)
  const patternMemory = loadObject(STORAGE_KEYS.patternMemory)
  return { history, predictionRecords, patternMemory }
}

export function saveStore(store: AppStore): void {
  localStorage.setItem(
    STORAGE_KEYS.history,
    JSON.stringify(store.history.slice(-HISTORY_CAP)),
  )
  localStorage.setItem(
    STORAGE_KEYS.predictionRecords,
    JSON.stringify(store.predictionRecords.slice(-PREDICTION_CAP)),
  )
  localStorage.setItem(STORAGE_KEYS.patternMemory, JSON.stringify(store.patternMemory))
}

export function clearStore(): AppStore {
  const empty: AppStore = { history: [], predictionRecords: [], patternMemory: {} }
  saveStore(empty)
  return empty
}
