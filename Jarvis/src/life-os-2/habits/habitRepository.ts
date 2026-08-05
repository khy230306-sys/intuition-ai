import { loadItems, saveItems, LOS2_KEYS, los2Id, nowIso } from '../repository'
import type { HabitObservation, HabitRecord } from './habitTypes'

export function loadHabits(): HabitRecord[] {
  return loadItems<HabitRecord>(LOS2_KEYS.habits)
}

export function saveHabits(items: HabitRecord[]): void {
  saveItems(LOS2_KEYS.habits, items, 80)
}

export function loadObservations(): HabitObservation[] {
  return loadItems<HabitObservation>(LOS2_KEYS.habitObservations)
}

export function saveObservations(items: HabitObservation[]): void {
  saveItems(LOS2_KEYS.habitObservations, items, 400)
}

export function addObservation(type: HabitRecord['type'], label: string, hour?: number): HabitObservation {
  const obs: HabitObservation = {
    id: los2Id('hobs'),
    type,
    hour: hour ?? new Date().getHours(),
    label,
    at: nowIso(),
  }
  const items = loadObservations()
  items.unshift(obs)
  saveObservations(items)
  return obs
}
