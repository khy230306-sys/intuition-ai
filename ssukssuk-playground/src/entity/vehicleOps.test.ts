import { describe, expect, it } from 'vitest'
import { createFiretruckEntity, isFullyAssembled } from './createFiretruck'
import { paintPart, trySnapPart, completeMission, startMission } from './vehicleOps'

describe('firetruck vehicle entity', () => {
  it('starts disassembled except shadow', () => {
    const v = createFiretruckEntity()
    expect(v.parts.shadow.assembled).toBe(true)
    expect(v.parts.body.assembled).toBe(false)
    expect(isFullyAssembled(v)).toBe(false)
  })

  it('snaps body when near slot', () => {
    const v = createFiretruckEntity()
    const next = trySnapPart(v, 'body', { ...v.parts.body.slotPos })
    expect(next.parts.body.assembled).toBe(true)
  })

  it('paints parts independently (not whole-vehicle hue)', () => {
    let v = createFiretruckEntity({ assembled: true })
    v = paintPart(v, 'body', '#E53935')
    v = paintPart(v, 'door', '#FFD54F')
    v = paintPart(v, 'frontWheel', '#1E88E5')
    expect(v.parts.body.color).toBe('#E53935')
    expect(v.parts.door.color).toBe('#FFD54F')
    expect(v.parts.frontWheel.color).toBe('#1E88E5')
    expect(v.parts.ladder.color).not.toBe('#1E88E5')
  })

  it('mission completes after start', () => {
    let v = createFiretruckEntity({ assembled: true })
    v = startMission(v)
    expect(v.missionState).toBe('active')
    v = completeMission(v)
    expect(v.missionState).toBe('complete')
    expect(v.animation).toBe('celebrate')
  })
})
