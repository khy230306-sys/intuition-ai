/** Quick Color Studio data/store checks (node) */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = readFileSync(join(root, 'src/data/colorStudio.ts'), 'utf8')
const studio = readFileSync(join(root, 'src/games/ColorStudio/ColorStudio.tsx'), 'utf8')
const carPaint = readFileSync(join(root, 'src/games/CarPaint.tsx'), 'utf8')
const store = readFileSync(join(root, 'src/lib/artworkStore.ts'), 'utf8')

assert.match(carPaint, /ColorStudio/)
assert.match(store, /ssuk-color-studio-artworks-v1/)
assert.match(studio, /recordCreativeStarted/)
assert.match(studio, /쉬운 색칠/)
assert.match(studio, /자유 색칠/)
assert.match(data, /quality: 'ready'/)

const readyCount = (data.match(/^\s*quality: 'ready',$/gm) || []).length
assert.ok(readyCount >= 8 && readyCount <= 20, `expected 8–20 ready templates, got ${readyCount}`)
assert.ok((data.match(/STUDIO_COLORS/g) || []).length >= 1)
assert.match(data, /crayon/)
assert.match(data, /bucket/)

// Ensure old hue-tint path is no longer the CarPaint entry
assert.doesNotMatch(carPaint, /ColorBook/)

console.log(`OK color-studio checks readyTemplates≈${readyCount}`)
