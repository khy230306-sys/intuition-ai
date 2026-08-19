import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const outDir = '/opt/cursor/artifacts/screenshots'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle' })
await page.screenshot({ path: `${outDir}/01-constitution-select.png`, fullPage: true })

const requiredBadges = await page.locator('.asset-required-badge').count()
const brand = await page.locator('.brand').innerText()
const triad = await page.locator('.triad-pill').count()

// Must NOT enter fake playable assemble with temp SVG
await page.locator('button.vehicle-card').first().click()
await page.waitForTimeout(300)
const assemble = await page.locator('h2', { hasText: '조립' }).isVisible().catch(() => false)

await page.screenshot({ path: `${outDir}/02-asset-required-gate.png`, fullPage: true })

console.log({
  brand,
  requiredBadges,
  triad,
  assembleEntered: assemble,
  pageErrors: errors,
})

if (!brand.includes('쑥쑥놀이터')) throw new Error('brand missing')
if (requiredBadges < 3) throw new Error('expected ASSET_REQUIRED badges')
if (assemble) throw new Error('constitution violation: entered assemble without approved assets')
if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)

await browser.close()
console.log('e2e constitution gate OK')
