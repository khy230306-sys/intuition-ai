/**
 * Persisted FIRE_TRUCK_01 customization — part colors, not whole-image hue.
 * Same object must drive wash / repair / drive / mission / reward.
 */

export type VehicleCustomization = {
  vehicleId: 'FIRE_TRUCK_01'
  bodyColor: string
  frontDoorColor: string
  rearDoorColor: string
  frontRimColor: string
  rearRimColor: string
  bumperColor: string
  ladderColor: string
  stickers: string[]
  assembledParts: string[]
  updatedAt: number
}

const KEY = 'ssukssuk.vehicleCustomization.FIRE_TRUCK_01'

export const DEFAULT_CUSTOMIZATION: VehicleCustomization = {
  vehicleId: 'FIRE_TRUCK_01',
  bodyColor: '#E53935',
  frontDoorColor: '#FFD54F',
  rearDoorColor: '#E53935',
  frontRimColor: '#ECEFF1',
  rearRimColor: '#ECEFF1',
  bumperColor: '#CFD8DC',
  ladderColor: '#90A4AE',
  stickers: [],
  assembledParts: [],
  updatedAt: 0,
}

export function loadVehicleCustomization(): VehicleCustomization {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_CUSTOMIZATION }
    return { ...DEFAULT_CUSTOMIZATION, ...(JSON.parse(raw) as VehicleCustomization) }
  } catch {
    return { ...DEFAULT_CUSTOMIZATION }
  }
}

export function saveVehicleCustomization(next: VehicleCustomization): void {
  const payload = { ...next, updatedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(payload))
}

/** Map entity part ids → customization fields (independent regions). */
export function applyPartColor(
  custom: VehicleCustomization,
  partId: string,
  color: string,
): VehicleCustomization {
  const map: Record<string, keyof VehicleCustomization> = {
    body: 'bodyColor',
    frontDoor: 'frontDoorColor',
    rearDoor: 'rearDoorColor',
    frontRim: 'frontRimColor',
    rearRim: 'rearRimColor',
    bumper: 'bumperColor',
    ladder: 'ladderColor',
  }
  const field = map[partId]
  if (!field) return custom
  return { ...custom, [field]: color, updatedAt: Date.now() }
}
