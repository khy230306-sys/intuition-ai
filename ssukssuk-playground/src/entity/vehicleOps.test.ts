import { describe, expect, it } from 'vitest'
import { FIRE_TRUCK_01_VEHICLE, baselineTriad, isWorkshopPlayable } from '../assets/registry'
import { createFiretruckEntity, isFullyAssembled, toDesign } from './createFiretruck'
import { paintPart, trySnapPart } from './vehicleOps'

describe('VISUAL ASSET CONSTITUTION gate', () => {
  it('keeps FIRE_TRUCK_01 and triad as ASSET_REQUIRED until Quality Gate', () => {
    expect(FIRE_TRUCK_01_VEHICLE.status).toBe('ASSET_REQUIRED')
    expect(isWorkshopPlayable()).toBe(false)
    const triad = baselineTriad()
    expect(triad.allReady).toBe(false)
    expect(triad.requiredCount).toBeGreaterThan(0)
  })
})

describe('FIRE_TRUCK_01 vehicle entity (logic only)', () => {
  it('has independent part structure (not a single image)', () => {
    const v = createFiretruckEntity()
    expect(v.assembleOrder.length).toBeGreaterThanOrEqual(14)
    expect(v.parts.body).toBeDefined()
    expect(v.parts.frontRim).toBeDefined()
    expect(v.parts.hose).toBeDefined()
    expect(v.assetStatus).toBe('ASSET_REQUIRED')
  })

  it('snaps parts and paints regions independently (no whole-vehicle hue)', () => {
    let v = createFiretruckEntity()
    v = trySnapPart(v, 'body', { ...v.parts.body.slotPos })
    expect(v.parts.body.assembled).toBe(true)
    v = trySnapPart(v, 'frontDoor', { ...v.parts.frontDoor.slotPos })
    v = trySnapPart(v, 'frontRim', { ...v.parts.frontRim.slotPos })
    v = paintPart(v, 'body', '#E53935')
    v = paintPart(v, 'frontDoor', '#FFD54F')
    v = paintPart(v, 'frontRim', '#1E88E5')
    expect(v.parts.body.color).toBe('#E53935')
    expect(v.parts.frontDoor.color).toBe('#FFD54F')
    expect(v.parts.frontRim.color).toBe('#1E88E5')
    expect(v.parts.ladder.color).not.toBe('#1E88E5')
  })

  it('exports design for drive/mission persistence', () => {
    let v = createFiretruckEntity({ assembled: true })
    v = paintPart(v, 'body', '#E53935')
    v = paintPart(v, 'frontDoor', '#FFD54F')
    const design = toDesign(v)
    expect(design.vehicleId).toBe('FIRE_TRUCK_01')
    expect(design.colors.BODY).toBe('#E53935')
    expect(design.colors.FRONT_DOOR).toBe('#FFD54F')
    expect(isFullyAssembled(v)).toBe(true)
  })
})
