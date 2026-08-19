/**
 * Registry import path — copies gated art into public/ and records pending approval.
 * Does NOT set status APPROVED. Play loop stays ASSET_REQUIRED until approve step.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { IMPORT_DIRECTORY } from './mode'
import type { QualityGateResult } from './qualityGate'
import type { DeliverySlot } from './slots'

export type ImportRecord = {
  slotId: string
  filename: string
  stagedPath: string
  registryAssetId: string
  structuralPass: boolean
  productionApproved: false
  importedAt: number
}

const STAGING_REL = 'public/assets/staging/external'

export function stagingPathFor(slot: DeliverySlot, cwd = process.cwd()): string {
  return join(cwd, STAGING_REL, slot.filename)
}

/**
 * Stage a file that already passed structural Quality Gate.
 * Registry runtime status remains ASSET_REQUIRED until human approve.
 */
export function stageForRegistry(
  slot: DeliverySlot,
  gate: QualityGateResult,
  cwd = process.cwd(),
): ImportRecord {
  if (!gate.structuralPass) {
    throw new Error(`Refuse staging ${slot.id}: structural Quality Gate failed`)
  }
  const src = join(cwd, IMPORT_DIRECTORY, slot.filename)
  if (!existsSync(src)) throw new Error(`Missing source ${src}`)

  const dest = stagingPathFor(slot, cwd)
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)

  const record: ImportRecord = {
    slotId: slot.id,
    filename: slot.filename,
    stagedPath: `${STAGING_REL}/${slot.filename}`,
    registryAssetId: slot.registryAssetId,
    structuralPass: true,
    productionApproved: false,
    importedAt: Date.now(),
  }

  const logDir = join(cwd, IMPORT_DIRECTORY, 'reports')
  mkdirSync(logDir, { recursive: true })
  writeFileSync(join(logDir, `${slot.id}.import.json`), JSON.stringify(record, null, 2))

  return record
}

export function loadImportRecord(slotId: string, cwd = process.cwd()): ImportRecord | null {
  const p = join(cwd, IMPORT_DIRECTORY, 'reports', `${slotId}.import.json`)
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf8')) as ImportRecord
}
