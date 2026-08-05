/**
 * AIE local persistence — learning + forgotten DNA suppress keys.
 * Lazy; never blocks boot.
 */

const LEARN_KEY = 'aizio_aie_learning_v1'
const FORGOTTEN_KEY = 'aizio_aie_forgotten_v1'
const CACHE_KEY = 'aizio_aie_ctx_cache_v1'

export type AieLearningState = {
  /** signalKey → ignore count */
  ignoreCounts: Record<string, number>
  /** skill/feature id → use count */
  skillBoosts: Record<string, number>
  /** last recommendation ids shown */
  lastShown: string[]
  updatedAt: number
}

const DEFAULT_LEARNING: AieLearningState = {
  ignoreCounts: {},
  skillBoosts: {},
  lastShown: [],
  updatedAt: 0,
}

export function loadLearning(): AieLearningState {
  try {
    const raw = localStorage.getItem(LEARN_KEY)
    if (!raw) return { ...DEFAULT_LEARNING, ignoreCounts: {}, skillBoosts: {}, lastShown: [] }
    const parsed = JSON.parse(raw) as Partial<AieLearningState>
    return {
      ignoreCounts: parsed.ignoreCounts || {},
      skillBoosts: parsed.skillBoosts || {},
      lastShown: Array.isArray(parsed.lastShown) ? parsed.lastShown : [],
      updatedAt: parsed.updatedAt || 0,
    }
  } catch {
    return { ...DEFAULT_LEARNING, ignoreCounts: {}, skillBoosts: {}, lastShown: [] }
  }
}

export function saveLearning(state: AieLearningState): void {
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }))
  } catch {
    /* quota / private mode */
  }
}

export function loadForgottenKeys(): string[] {
  try {
    const raw = localStorage.getItem(FORGOTTEN_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.map((s) => String(s).toLowerCase()).slice(0, 200) : []
  } catch {
    return []
  }
}

export function rememberForgottenKey(key: string): void {
  const k = key.trim().toLowerCase()
  if (!k) return
  const list = loadForgottenKeys()
  if (list.includes(k)) return
  list.unshift(k)
  try {
    localStorage.setItem(FORGOTTEN_KEY, JSON.stringify(list.slice(0, 200)))
  } catch {
    /* ignore */
  }
}

export type CachedContextBlob = {
  at: number
  json: string
}

export function readContextCache(): CachedContextBlob | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedContextBlob
  } catch {
    return null
  }
}

export function writeContextCache(json: string): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), json }))
  } catch {
    /* ignore */
  }
}

export function clearAieStorageForTests(): void {
  try {
    localStorage.removeItem(LEARN_KEY)
    localStorage.removeItem(FORGOTTEN_KEY)
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}
