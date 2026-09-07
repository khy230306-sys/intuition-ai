import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = readFileSync(join(root, 'src/data/vehicleColoringTemplates.ts'), 'utf8')
const studio = readFileSync(join(root, 'src/games/ColorStudio/ColorStudio.tsx'), 'utf8')
const carPaint = readFileSync(join(root, 'src/games/CarPaint.tsx'), 'utf8')
const store = readFileSync(join(root, 'src/lib/artworkStore.ts'), 'utf8')

assert.match(carPaint, /ColorStudio/)
assert.match(store, /ssuk-vehicle-paint-artworks-v1/)
assert.match(studio, /쉬운 색칠/)
assert.match(studio, /자유 색칠/)
assert.match(studio, /숫자 따라 색칠/)
assert.match(data, /ART_REQUIRED/)
assert.doesNotMatch(data, /lineArtStatus: 'REAL'/) // no fake REAL line-art

const vCount = (data.match(/\bv\(\{/g) || []).length
const artRequiredCount = (data.match(/^\s*artRequired\(/gm) || []).length
const total = vCount + artRequiredCount
assert.ok(total >= 30, `expected >=30 vehicles, got ${total}`)
assert.ok(data.includes("lineArtStatus: 'TEMP'"))
assert.ok(data.includes('fire-truck-01'))
assert.ok(data.includes('excavator-01'))
assert.ok(data.includes('crane-01'))
assert.doesNotMatch(studio, /아래 색깔을 누르면 자동차 색이 바뀌/)

console.log(`OK vehicle-paint templates=${total} playableTemp≈${vCount} artRequired=${artRequiredCount}`)
