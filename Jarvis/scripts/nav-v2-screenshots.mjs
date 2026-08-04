/**
 * Screenshots for AIZIO Navigation v2 (internal map).
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const outDir = process.env.SHOT_DIR || '/tmp/cursor/artifacts/nav-v2-shots'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function skipLocation(page) {
  await page.waitForSelector('[data-action="skip-location"], #app', { timeout: 15000 })
  const skip = await page.$('[data-action="skip-location"]')
  if (skip) {
    await skip.click()
    await page.waitForFunction(() => !document.querySelector('.location-gate'), { timeout: 10000 }).catch(() => {})
  }
}

async function shot(page, name) {
  const path = join(outDir, name)
  await page.screenshot({ path, fullPage: false })
  console.log('shot', path)
}

async function openNav(page, base) {
  await page.goto(`${base}?nav=1&home=v2`, { waitUntil: 'networkidle0' })
  await skipLocation(page)
  await page.waitForSelector('[data-navv2="1"]', { timeout: 15000 })
  await sleep(1000)
}

async function searchNav(page, q) {
  await page.waitForSelector('#navv2-q', { timeout: 10000 })
  await page.click('#navv2-q', { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.keyboard.type(q, { delay: 40 })
  await page.keyboard.press('Enter')
  await sleep(2500)
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('build first')
  mkdirSync(outDir, { recursive: true })
  const metaPath = join(dist, 'build-meta.json')
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    meta.channel = 'preview'
    writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    let path = decodeURIComponent(url.pathname)
    if (path === '/') path = '/index.html'
    const file = join(dist, path.replace(/^\//, ''))
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404)
      res.end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => server.listen(4192, '127.0.0.1', r))
  const base = 'http://127.0.0.1:4192/'
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true })

    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.evaluate(() => localStorage.removeItem('aizio.home.variant.v1'))
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-quick-id="navigate"]', { timeout: 12000 })
    await shot(page, '01-home-v2-nav-button.png')

    await page.click('[data-quick-id="navigate"]')
    await page.waitForSelector('[data-navv2="1"]', { timeout: 12000 })
    await sleep(1500)
    await shot(page, '02-internal-map.png')

    await searchNav(page, '역삼동')
    await shot(page, '03-yeoksam-candidates.png')
    await shot(page, '04-candidate-markers.png')

    const first = await page.$('[data-navv2-pick="0"]')
    if (first) {
      await first.click()
      await sleep(800)
    }
    await shot(page, '05-place-detail.png')

    const routeBtn = await page.$('[data-navv2-action="route"]')
    if (routeBtn) {
      await routeBtn.click()
      await sleep(2000)
    }
    await shot(page, '06-driving-route.png')

    const walk = await page.$('[data-navv2-mode="walking"]')
    if (walk) {
      await walk.click()
      await sleep(2000)
    }
    await shot(page, '07-walking-route.png')

    const start = await page.$('[data-navv2-action="start"]')
    if (start) {
      await start.click()
      await sleep(1000)
    }
    await shot(page, '08-guidance-start.png')
    await shot(page, '09-next-turn.png')

    await openNav(page, base)
    await searchNav(page, '역삼동')
    await shot(page, '10-location-denied-or-no-geo.png')

    await searchNav(page, 'zzz존재하지않는장소xyz')
    await sleep(1000)
    await shot(page, '11-no-results.png')

    await page.goto(`${base}?home=v2&view=settings`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.evaluate(() => {
      const d = document.querySelector('[data-nav-settings="1"]')
      if (d instanceof HTMLDetailsElement) d.open = true
      d?.scrollIntoView?.()
    })
    await sleep(400)
    await shot(page, '12-settings-nav.png')

    await page.goto(`${base}?home=legacy`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('#draft', { timeout: 10000 })
    await page.click('#draft')
    await page.keyboard.type('역삼동', { delay: 30 })
    await page.click('.send-btn')
    await sleep(3500)
    const onNav = await page.$('[data-navv2="1"]')
    if (onNav) {
      await page.click('[data-view="chat"]')
      await sleep(800)
    }
    await shot(page, '13-chat-place-cards.png')

    await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2, isMobile: true })
    await openNav(page, base)
    await shot(page, '14-iphone-320.png')

    await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true })
    await openNav(page, base)
    await searchNav(page, '강남역')
    await shot(page, '15-android-360.png')

    console.log('done', outDir)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
