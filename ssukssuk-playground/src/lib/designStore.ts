import type { VehicleDesign } from '../assets/registry/types'

const KEY = 'ssukssuk.vehicleDesign.FIRE_TRUCK_01'

export function loadFireTruckDesign(): VehicleDesign | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as VehicleDesign
  } catch {
    return null
  }
}

export function saveFireTruckDesign(design: VehicleDesign): void {
  const next: VehicleDesign = { ...design, updatedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function clearFireTruckDesign(): void {
  localStorage.removeItem(KEY)
}
