import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const outDir = '/opt/cursor/artifacts/screenshots'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle' })
await page.screenshot({ path: `${outDir}/proto01-shell.png`, fullPage: true })

const brand = await page.locator('.brand').innerText()
const proto = await page.locator('h2', { hasText: 'Prototype 01' }).innerText()
const requiredBadges = await page.locator('.asset-required-badge').count()
const assemble = await page.locator('h2', { hasText: '조립' }).isVisible().catch(() => false)

console.log({ brand, proto, requiredBadges, assembleEntered: assemble, pageErrors: errors })

if (!brand.includes('쑥쑥놀이터')) throw new Error('brand missing')
if (!proto.includes('BLOCKED')) throw new Error('Prototype 01 must report BLOCKED without assets')
if (requiredBadges < 3) throw new Error('expected ASSET_REQUIRED badges')
if (assemble) throw new Error('must not enter assemble without approved assets')
if (errors.length) throw new Error(errors.join('; '))

await browser.close()
console.log('e2e prototype gate OK')
