import { describe, expect, it } from 'vitest'
import {
  ASSET_DELIVERY_MODE,
  BASELINE_VISUAL_APPROVED,
  IMPORT_DIRECTORY,
  SUPPORTED_FORMATS,
} from './mode'
import { getAssetProviderStatus } from '../factory/provider'
import {
  BASELINE_MASTER_SLOTS,
  FIRETRUCK_PART_SLOTS,
  REQUIRED_BASELINE_FILENAMES,
  REQUIRED_PART_FILENAMES,
} from './slots'
import { runBaselineMasterGates } from './qualityGate'
import { isWorkshopPlayable } from '../registry'

describe('EXTERNAL_PRODUCTION_ART delivery path', () => {
  it('keeps provider NOT_CONFIGURED and delivery mode external', () => {
    expect(ASSET_DELIVERY_MODE).toBe('EXTERNAL_PRODUCTION_ART')
    expect(getAssetProviderStatus().status).toBe('NOT_CONFIGURED')
    expect(BASELINE_VISUAL_APPROVED).toBe(false)
    expect(IMPORT_DIRECTORY).toBe('incoming/external-production')
    expect(SUPPORTED_FORMATS).toContain('png')
  })

  it('defines exact baseline filenames and part filenames', () => {
    expect(REQUIRED_BASELINE_FILENAMES).toEqual([
      'SSUKSSUK_CHARACTER_BASE.png',
      'FIRE_TRUCK_01_MASTER.png',
      'CAR_WORKSHOP_MASTER.png',
    ])
    expect(FIRETRUCK_PART_SLOTS).toHaveLength(15)
    expect(REQUIRED_PART_FILENAMES).toContain('FIRETRUCK_BODY.png')
    expect(REQUIRED_PART_FILENAMES).toContain('FIRETRUCK_SHADOW.png')
    expect(BASELINE_MASTER_SLOTS.every((s) => s.filename.endsWith('.png'))).toBe(true)
  })

  it('does not auto-approve or unlock play when files are missing', () => {
    const gates = runBaselineMasterGates()
    expect(gates).toHaveLength(3)
    expect(gates.every((g) => g.productionApproved === false)).toBe(true)
    expect(gates.every((g) => g.received === false)).toBe(true)
    expect(isWorkshopPlayable()).toBe(false)
  })

  it('requires transparency on character + firetruck master + all parts', () => {
    expect(BASELINE_MASTER_SLOTS.find((s) => s.id === 'SSUKSSUK_CHARACTER_BASE')?.transparencyRequired).toBe(
      true,
    )
    expect(BASELINE_MASTER_SLOTS.find((s) => s.id === 'FIRE_TRUCK_01_MASTER')?.transparencyRequired).toBe(
      true,
    )
    expect(FIRETRUCK_PART_SLOTS.every((s) => s.transparencyRequired)).toBe(true)
  })
})
