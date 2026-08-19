#!/usr/bin/env node
/**
 * Explicit human approve for baseline masters.
 * Refuses if structural gate failed or human checklist not confirmed via --i-reviewed-dna
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const importDir = join(root, 'incoming/external-production')
const reportPath = join(importDir, 'reports', 'baseline-masters.quality-gate.json')

if (!process.argv.includes('--i-reviewed-dna')) {
  console.error(
    'Refusing approve. Re-run with --i-reviewed-dna after Style Master DNA / crop / lighting review.',
  )
  process.exit(1)
}

if (!existsSync(reportPath)) {
  console.error('Run npm run assets:gate first.')
  process.exit(1)
}

const results = JSON.parse(readFileSync(reportPath, 'utf8'))
if (!results.every((r) => r.structuralPass)) {
  console.error('Structural Quality Gate incomplete — cannot approve.')
  process.exit(1)
}

writeFileSync(
  join(importDir, 'BASELINE_VISUAL_APPROVED'),
  `BASELINE_VISUAL_APPROVED=TRUE\napprovedAt=${new Date().toISOString()}\nmode=EXTERNAL_PRODUCTION_ART\n`,
)
console.log('BASELINE_VISUAL_APPROVED=TRUE')
console.log('Next: drop FIRETRUCK_* part PNGs (transparent). Play loop still ASSET_REQUIRED until Registry APPROVED.')
