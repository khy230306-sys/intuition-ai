import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const outDir = '/opt/cursor/artifacts/screenshots'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle' })
await page.screenshot({ path: `${outDir}/01-select.png`, fullPage: true })

const ready = page.locator('button.vehicle-card.ready')
await ready.waitFor({ state: 'visible', timeout: 5000 })
await ready.click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/02-after-select.png`, fullPage: true })

const assembleTitle = page.locator('h2', { hasText: '조립' })
const onAssemble = await assembleTitle.isVisible().catch(() => false)
if (!onAssemble) {
  console.error('FAILED: did not enter assemble after clicking firetruck')
  console.error('errors:', errors)
  await browser.close()
  process.exit(1)
}

// Drag each unassembled part toward its slot using data-part centers approx via mouse on SVG.
const svg = page.locator('.assemble-canvas svg.stage-svg')
const box = await svg.boundingBox()
if (!box) throw new Error('assemble svg missing')

async function dragPartToward(index, tx, ty) {
  // Parts are scattered; perform several drags from tray-ish positions into slot region.
  const starts = [
    [0.18, 0.22],
    [0.48, 0.18],
    [0.74, 0.16],
    [0.18, 0.48],
    [0.48, 0.45],
    [0.76, 0.43],
    [0.3, 0.72],
    [0.62, 0.72],
  ]
  const [sx, sy] = starts[index % starts.length]
  await page.mouse.move(box.x + box.width * sx, box.y + box.height * sy)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * tx, box.y + box.height * ty, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(120)
}

// Slot positions roughly in upper/mid of tray viewBox (420x300)
const slots = [
  [0.4, 0.48],
  [0.7, 0.46],
  [0.76, 0.36],
  [0.88, 0.54],
  [0.36, 0.3],
  [0.71, 0.24],
  [0.29, 0.64],
  [0.74, 0.64],
]

for (let i = 0; i < 8; i++) {
  await dragPartToward(i, slots[i][0], slots[i][1])
}
await page.screenshot({ path: `${outDir}/03-assemble.png`, fullPage: true })

// If not auto-advanced, click paint button when available
const paintBtn = page.getByRole('button', { name: '색칠하러 가기' })
if (await paintBtn.isVisible().catch(() => false)) {
  await paintBtn.click()
}

// Force assemble via evaluating entity if still stuck (diagnostic fallback path in test only)
if (!(await page.locator('h2', { hasText: '부분 색칠' }).isVisible().catch(() => false))) {
  console.log('Assemble incomplete via drag — checking chips')
  const chipsOn = await page.locator('.part-legend .chip.on').count()
  console.log('assembled chips:', chipsOn)
}

// Wait for paint or try again with denser snaps near known slot coords
if (!(await page.locator('h2', { hasText: '부분 색칠' }).isVisible().catch(() => false))) {
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 8; i++) {
      await dragPartToward(i, slots[i][0], slots[i][1])
    }
  }
  if (await paintBtn.isVisible().catch(() => false)) await paintBtn.click()
}

await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/04-paint-or-assemble.png`, fullPage: true })

if (await page.locator('h2', { hasText: '부분 색칠' }).isVisible().catch(() => false)) {
  const swatches = page.locator('.swatch')
  await swatches.nth(2).click()
  await page.locator('.part-legend button.chip').nth(0).click()
  await swatches.nth(6).click()
  await page.locator('.part-legend button.chip').nth(6).click()
  await page.screenshot({ path: `${outDir}/05-paint.png`, fullPage: true })
  await page.getByRole('button', { name: '운전하러 가기' }).click()
  await page.waitForTimeout(300)
  const drive = page.locator('.drive-canvas')
  const db = await drive.boundingBox()
  if (db) {
    await page.mouse.move(db.x + 80, db.y + db.height - 80)
    await page.mouse.down()
    await page.mouse.move(db.x + db.width * 0.5, db.y + db.height * 0.6, { steps: 10 })
    await page.mouse.up()
  }
  await page.screenshot({ path: `${outDir}/06-drive.png`, fullPage: true })
  await page.getByRole('button', { name: /미션 시작/ }).click()
  await page.waitForTimeout(300)
  const mission = page.locator('.drive-canvas.mission')
  const mb = await mission.boundingBox()
  if (mb) {
    await page.mouse.move(mb.x + 90, mb.y + mb.height - 90)
    await page.mouse.down()
    await page.mouse.move(mb.x + mb.width * 0.78, mb.y + mb.height * 0.32, { steps: 16 })
    await page.mouse.up()
  }
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${outDir}/07-mission-reward.png`, fullPage: true })
}

console.log('page errors:', errors)
console.log('final heading:', await page.locator('h2').first().innerText().catch(() => 'none'))
await browser.close()
