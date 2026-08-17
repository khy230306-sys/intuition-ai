import type {
  EnginePrediction,
  FavoritePreset,
  GeneratorConstraints,
  Strategy,
  UserTicket,
} from '../domain/types'

const PREFIX = 'lottolens.v3.'

const KEYS = {
  tickets: `${PREFIX}tickets`,
  strategies: `${PREFIX}strategies`,
  favorites: `${PREFIX}favorites`,
  constraints: `${PREFIX}constraints`,
  predictions: `${PREFIX}predictions`,
  migrated: `${PREFIX}migrated`,
} as const

export interface UserConstraints {
  fixed: number[]
  excluded: number[]
  watch: number[]
}

export interface StoreExport {
  version: string
  exportedAt: string
  tickets: UserTicket[]
  strategies: Strategy[]
  favorites: FavoritePreset[]
  constraints: UserConstraints
  predictions: EnginePrediction[]
}

const memoryStore = new Map<string, string>()

function getStorage(): Storage {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage
  }
  return {
    getItem: (k: string) => memoryStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memoryStore.set(k, v)
    },
    removeItem: (k: string) => {
      memoryStore.delete(k)
    },
    clear: () => memoryStore.clear(),
    key: (i: number) => [...memoryStore.keys()][i] ?? null,
    get length() {
      return memoryStore.size
    },
  } as Storage
}

function readJson<T>(key: string, fallback: T): T {
  const raw = getStorage().getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  getStorage().setItem(key, JSON.stringify(value))
}

export function migrateIfNeeded(): void {
  const storage = getStorage()
  if (storage.getItem(KEYS.migrated)) return

  if (!storage.getItem(KEYS.tickets)) writeJson(KEYS.tickets, [])
  if (!storage.getItem(KEYS.strategies)) writeJson(KEYS.strategies, [])
  if (!storage.getItem(KEYS.favorites)) writeJson(KEYS.favorites, [])
  if (!storage.getItem(KEYS.constraints)) {
    writeJson<UserConstraints>(KEYS.constraints, { fixed: [], excluded: [], watch: [] })
  }
  if (!storage.getItem(KEYS.predictions)) writeJson(KEYS.predictions, [])

  storage.setItem(KEYS.migrated, '1')
}

export function listTickets(): UserTicket[] {
  migrateIfNeeded()
  return readJson<UserTicket[]>(KEYS.tickets, [])
}

export function getTicket(id: string): UserTicket | undefined {
  return listTickets().find((t) => t.id === id)
}

export function saveTicket(ticket: UserTicket): UserTicket {
  migrateIfNeeded()
  const tickets = listTickets()
  const idx = tickets.findIndex((t) => t.id === ticket.id)
  if (idx >= 0) tickets[idx] = ticket
  else tickets.push(ticket)
  writeJson(KEYS.tickets, tickets)
  return ticket
}

export function deleteTicket(id: string): boolean {
  migrateIfNeeded()
  const tickets = listTickets()
  const next = tickets.filter((t) => t.id !== id)
  if (next.length === tickets.length) return false
  writeJson(KEYS.tickets, next)
  return true
}

export function listStrategies(): Strategy[] {
  migrateIfNeeded()
  return readJson<Strategy[]>(KEYS.strategies, [])
}

export function getStrategy(id: string): Strategy | undefined {
  return listStrategies().find((s) => s.id === id)
}

export function saveStrategy(strategy: Strategy): Strategy {
  migrateIfNeeded()
  const strategies = listStrategies()
  const idx = strategies.findIndex((s) => s.id === strategy.id)
  const updated = { ...strategy, updatedAt: new Date().toISOString() }
  if (idx >= 0) strategies[idx] = updated
  else strategies.push(updated)
  writeJson(KEYS.strategies, strategies)
  return updated
}

export function deleteStrategy(id: string): boolean {
  migrateIfNeeded()
  const strategies = listStrategies()
  const next = strategies.filter((s) => s.id !== id)
  if (next.length === strategies.length) return false
  writeJson(KEYS.strategies, next)
  return true
}

export function listFavorites(): FavoritePreset[] {
  migrateIfNeeded()
  return readJson<FavoritePreset[]>(KEYS.favorites, [])
}

export function saveFavorite(preset: FavoritePreset): FavoritePreset {
  migrateIfNeeded()
  const favorites = listFavorites()
  const idx = favorites.findIndex((f) => f.id === preset.id)
  if (idx >= 0) favorites[idx] = preset
  else favorites.push(preset)
  writeJson(KEYS.favorites, favorites)
  return preset
}

export function deleteFavorite(id: string): boolean {
  migrateIfNeeded()
  const favorites = listFavorites()
  const next = favorites.filter((f) => f.id !== id)
  if (next.length === favorites.length) return false
  writeJson(KEYS.favorites, next)
  return true
}

export function getConstraints(): UserConstraints {
  migrateIfNeeded()
  return readJson<UserConstraints>(KEYS.constraints, {
    fixed: [],
    excluded: [],
    watch: [],
  })
}

export function saveConstraints(constraints: UserConstraints): UserConstraints {
  migrateIfNeeded()
  writeJson(KEYS.constraints, constraints)
  return constraints
}

export function saveConstraintsFromGenerator(
  partial: Partial<UserConstraints> & Partial<GeneratorConstraints>,
): UserConstraints {
  const current = getConstraints()
  const merged: UserConstraints = {
    fixed: partial.fixed ?? current.fixed,
    excluded: partial.excluded ?? current.excluded,
    watch: partial.watch ?? current.watch,
  }
  return saveConstraints(merged)
}

export function listPredictionSnapshots(): EnginePrediction[] {
  migrateIfNeeded()
  return readJson<EnginePrediction[]>(KEYS.predictions, [])
}

/** Immutable append — snapshots are never updated in place */
export function savePredictionSnapshot(snapshot: EnginePrediction): EnginePrediction {
  migrateIfNeeded()
  const predictions = listPredictionSnapshots()
  predictions.push(snapshot)
  writeJson(KEYS.predictions, predictions)
  return snapshot
}

export function exportStore(): StoreExport {
  migrateIfNeeded()
  return {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    tickets: listTickets(),
    strategies: listStrategies(),
    favorites: listFavorites(),
    constraints: getConstraints(),
    predictions: listPredictionSnapshots(),
  }
}

export function importStore(data: StoreExport, merge = false): void {
  migrateIfNeeded()
  if (!merge) {
    writeJson(KEYS.tickets, data.tickets)
    writeJson(KEYS.strategies, data.strategies)
    writeJson(KEYS.favorites, data.favorites)
    writeJson(KEYS.constraints, data.constraints)
    writeJson(KEYS.predictions, data.predictions)
    return
  }

  const tickets = [...listTickets()]
  for (const t of data.tickets) {
    if (!tickets.some((x) => x.id === t.id)) tickets.push(t)
  }
  writeJson(KEYS.tickets, tickets)

  const strategies = [...listStrategies()]
  for (const s of data.strategies) {
    const idx = strategies.findIndex((x) => x.id === s.id)
    if (idx >= 0) strategies[idx] = s
    else strategies.push(s)
  }
  writeJson(KEYS.strategies, strategies)

  const favorites = [...listFavorites()]
  for (const f of data.favorites) {
    if (!favorites.some((x) => x.id === f.id)) favorites.push(f)
  }
  writeJson(KEYS.favorites, favorites)

  saveConstraints(data.constraints)

  const predictions = [...listPredictionSnapshots(), ...data.predictions]
  writeJson(KEYS.predictions, predictions)
}

export function clearStore(): void {
  getStorage().removeItem(KEYS.tickets)
  getStorage().removeItem(KEYS.strategies)
  getStorage().removeItem(KEYS.favorites)
  getStorage().removeItem(KEYS.constraints)
  getStorage().removeItem(KEYS.predictions)
  getStorage().removeItem(KEYS.migrated)
  migrateIfNeeded()
}

/** Test helper */
export function resetStoreForTests(): void {
  memoryStore.clear()
  if (typeof globalThis.localStorage !== 'undefined') {
    for (const key of Object.values(KEYS)) {
      globalThis.localStorage.removeItem(key)
    }
  }
}
