import { loadStoreList, saveStoreList } from '../lifeRepository'
import type { GoalRecord } from './goalTypes'

const KEY = 'aizio_life_goals_v1'
const SCHEMA = 1

export function loadGoals(): GoalRecord[] {
  return loadStoreList<GoalRecord>(KEY, SCHEMA)
}

export function saveGoals(items: GoalRecord[]): void {
  saveStoreList(KEY, SCHEMA, items, 120)
}

export function clearGoalsStore(): void {
  localStorage.removeItem(KEY)
}
