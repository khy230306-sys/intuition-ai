#!/usr/bin/env node
/** Stage structurally-passed masters into public/assets/staging/external (still not APPROVED). */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const importDir = join(root, 'incoming/external-production')
const reportPath = join(importDir, 'reports', 'baseline-masters.quality-gate.json')
const staging = join(root, 'public/assets/staging/external')

if (!existsSync(reportPath)) {
  console.error('Run npm run assets:gate first.')
  process.exit(1)
}

const results = JSON.parse(readFileSync(reportPath, 'utf8'))
mkdirSync(staging, { recursive: true })
mkdirSync(join(importDir, 'reports'), { recursive: true })

for (const r of results) {
  if (!r.structuralPass) {
    console.log(`SKIP ${r.slotId} structuralPass=false`)
    continue
  }
  const src = join(importDir, r.filename)
  const dest = join(staging, r.filename)
  copyFileSync(src, dest)
  const record = {
    slotId: r.slotId,
    filename: r.filename,
    stagedPath: `public/assets/staging/external/${r.filename}`,
    productionApproved: false,
    importedAt: Date.now(),
  }
  writeFileSync(join(importDir, 'reports', `${r.slotId}.import.json`), JSON.stringify(record, null, 2))
  console.log(`STAGED ${r.slotId} → ${record.stagedPath} (productionApproved=false)`)
}

console.log('REGISTRY_IMPORT_READY path exercised — Registry APPROVED not granted.')
