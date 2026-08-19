/**
 * Quality Gate for external production art.
 * Receipt ≠ APPROVED. Visual DNA checks require human review checklist + file validation.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { IMPORT_DIRECTORY, type DeliverySlotId } from './mode'
import { readPngMeta, scanForSuspiciousText } from './pngMeta'
import { ALL_DELIVERY_SLOTS, type DeliverySlot } from './slots'

export type GateCheckId =
  | 'file_present'
  | 'format_png'
  | 'resolution_min'
  | 'transparency'
  | 'no_suspicious_watermark_strings'
  | 'filename_contract'
  | 'visual_dna_human_review'
  | 'not_style_master_crop_human_review'
  | 'perspective_lighting_human_review'

export type GateCheck = {
  id: GateCheckId
  pass: boolean
  automated: boolean
  detail: string
}

export type QualityGateResult = {
  slotId: DeliverySlotId
  filename: string
  received: boolean
  /** Automated structural checks only — never flips Registry to APPROVED alone */
  structuralPass: boolean
  /** Full production approval requires structuralPass + all human checks signed */
  productionApproved: false
  checks: GateCheck[]
  next: string
}

export function importRoot(cwd = process.cwd()): string {
  return join(cwd, IMPORT_DIRECTORY)
}

export function runQualityGateForSlot(
  slot: DeliverySlot,
  cwd = process.cwd(),
): QualityGateResult {
  const path = join(importRoot(cwd), slot.filename)
  const checks: GateCheck[] = []

  const present = existsSync(path)
  checks.push({
    id: 'file_present',
    pass: present,
    automated: true,
    detail: present ? `Found ${path}` : `Missing ${path}`,
  })

  checks.push({
    id: 'filename_contract',
    pass: true,
    automated: true,
    detail: `Expected exact name: ${slot.filename}`,
  })

  if (!present) {
    return finalize(slot, false, checks)
  }

  const meta = readPngMeta(path)
  checks.push({
    id: 'format_png',
    pass: meta.isPng,
    automated: true,
    detail: meta.isPng ? `PNG ${meta.width}x${meta.height} colorType=${meta.colorType}` : 'Not a valid PNG',
  })

  const resOk = meta.width >= slot.minWidth && meta.height >= slot.minHeight
  checks.push({
    id: 'resolution_min',
    pass: resOk,
    automated: true,
    detail: resOk
      ? `${meta.width}x${meta.height} >= ${slot.minWidth}x${slot.minHeight} (recommended ${slot.recommendedWidth}x${slot.recommendedHeight})`
      : `${meta.width}x${meta.height} below minimum ${slot.minWidth}x${slot.minHeight}`,
  })

  if (slot.transparencyRequired) {
    checks.push({
      id: 'transparency',
      pass: meta.hasAlphaChannel,
      automated: true,
      detail: meta.hasAlphaChannel
        ? 'Alpha channel present (colorType 4/6)'
        : 'Transparency required but alpha channel missing',
    })
  } else {
    checks.push({
      id: 'transparency',
      pass: true,
      automated: true,
      detail: 'Opaque background allowed for this slot',
    })
  }

  const suspicious = scanForSuspiciousText(path)
  checks.push({
    id: 'no_suspicious_watermark_strings',
    pass: suspicious.length === 0,
    automated: true,
    detail:
      suspicious.length === 0
        ? 'No common watermark/stock strings detected in file bytes'
        : `Suspicious markers: ${suspicious.join(', ')}`,
  })

  // Human visual checks — always pending false until signed off via approve script
  for (const id of [
    'visual_dna_human_review',
    'not_style_master_crop_human_review',
    'perspective_lighting_human_review',
  ] as const) {
    checks.push({
      id,
      pass: false,
      automated: false,
      detail:
        'Requires human Quality Gate against Style Master DNA (VSM-2026-08-12). Not auto-approved on receipt.',
    })
  }

  const structuralPass = checks.filter((c) => c.automated).every((c) => c.pass)
  return finalize(slot, structuralPass, checks)
}

function finalize(
  slot: DeliverySlot,
  structuralPass: boolean,
  checks: GateCheck[],
): QualityGateResult {
  return {
    slotId: slot.id,
    filename: slot.filename,
    received: checks.some((c) => c.id === 'file_present' && c.pass),
    structuralPass,
    productionApproved: false,
    checks,
    next: structuralPass
      ? 'Run human visual DNA review, then scripts/approve-external-art.mjs — never skip gate'
      : 'Fix file issues and re-drop into incoming/external-production/',
  }
}

export function runBaselineMasterGates(cwd = process.cwd()): QualityGateResult[] {
  return ALL_DELIVERY_SLOTS.filter((s) => s.phase === 'baseline_masters').map((s) =>
    runQualityGateForSlot(s, cwd),
  )
}

export function baselineMastersStructurallyReady(results = runBaselineMasterGates()): boolean {
  return results.length === 3 && results.every((r) => r.structuralPass)
}

/** Explicit flag — only true after human approve writes status file. */
export function readBaselineVisualApproved(cwd = process.cwd()): boolean {
  return existsSync(join(importRoot(cwd), 'BASELINE_VISUAL_APPROVED'))
}

export function slotById(id: DeliverySlotId): DeliverySlot {
  const slot = ALL_DELIVERY_SLOTS.find((s) => s.id === id)
  if (!slot) throw new Error(`Unknown delivery slot ${id}`)
  return slot
}
