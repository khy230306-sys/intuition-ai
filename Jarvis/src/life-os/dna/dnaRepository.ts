import { loadStoreList, saveStoreList } from '../lifeRepository'
import type { DnaRecord } from './dnaTypes'

const KEY = 'aizio_life_dna_v1'
const SCHEMA = 1
const MAX = 200

export function loadDna(): DnaRecord[] {
  return loadStoreList<DnaRecord>(KEY, SCHEMA)
}

export function saveDna(items: DnaRecord[]): void {
  saveStoreList(KEY, SCHEMA, items, MAX)
}

export function clearDnaStore(): void {
  localStorage.removeItem(KEY)
}
