#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const importDir = join(root, 'incoming/external-production')
const contract = JSON.parse(
  readFileSync(join(importDir, 'DELIVERY_CONTRACT.json'), 'utf8'),
)

function readPngMeta(filePath) {
  const buf = readFileSync(filePath)
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf.length >= 33 &&
    buf.toString('ascii', 12, 16) === 'IHDR'
  if (!isPng) return { isPng: false, width: 0, height: 0, hasAlpha: false }
  return {
    isPng: true,
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    hasAlpha: buf[25] === 4 || buf[25] === 6,
  }
}

function parseDim(s) {
  const [w, h] = s.split('x').map(Number)
  return { w, h }
}

const results = contract.baselineMasters.map((slot) => {
  const file = join(importDir, slot.filename)
  const min = parseDim(slot.min)
  const checks = []
  const present = existsSync(file)
  checks.push({ id: 'file_present', pass: present })
  let structuralPass = present
  if (present) {
    const meta = readPngMeta(file)
    const formatOk = meta.isPng
    const resOk = meta.width >= min.w && meta.height >= min.h
    const alphaOk = !slot.transparencyRequired || meta.hasAlpha
    checks.push({ id: 'format_png', pass: formatOk, meta })
    checks.push({ id: 'resolution_min', pass: resOk })
    checks.push({ id: 'transparency', pass: alphaOk })
    checks.push({
      id: 'visual_dna_human_review',
      pass: false,
      automated: false,
      detail: 'Pending human review — not auto-approved',
    })
    structuralPass = formatOk && resOk && alphaOk
  }
  return {
    slotId: slot.id,
    filename: slot.filename,
    received: present,
    structuralPass,
    productionApproved: false,
    checks,
  }
})

const outDir = join(importDir, 'reports')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'baseline-masters.quality-gate.json'), JSON.stringify(results, null, 2))

console.log(`ASSET_DELIVERY_MODE=${contract.ASSET_DELIVERY_MODE}`)
console.log(`IMPORT_DIRECTORY=${contract.IMPORT_DIRECTORY}`)
console.log(`SUPPORTED_FORMATS=${contract.SUPPORTED_FORMATS.join(',')}`)
for (const r of results) {
  console.log(
    `${r.slotId}: received=${r.received} structuralPass=${r.structuralPass} productionApproved=false`,
  )
}
console.log(
  `BASELINE_VISUAL_APPROVED=${existsSync(join(importDir, 'BASELINE_VISUAL_APPROVED'))}`,
)
console.log('QUALITY_GATE_READY=true (waiting for files + human DNA review)')
