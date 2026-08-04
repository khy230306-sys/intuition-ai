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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true })

    // 1 HOME v2 길안내 button
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.evaluate(() => {
      localStorage.removeItem('aizio.home.variant.v1')
    })
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-quick-id="navigate"]', { timeout: 12000 })
    await shot(page, '01-home-v2-nav-button.png')

    // 2 internal map default
    await page.click('[data-quick-id="navigate"]')
    await page.waitForSelector('[data-navv2="1"]', { timeout: 12000 })
    await page.waitForTimeout?.(800).catch?.(() => {})
    await new Promise((r) => setTimeout(r, 1200))
    await shot(page, '02-internal-map.png')

    // 3–5 search 역삼동
    await page.click('#navv2-q', { clickCount: 3 })
    await page.type('#navv2-q', '역삼동')
    await page.click('#navv2-search-form button[type="submit"]')
    await page.waitForFunction(() => document.body.innerText.includes('후보') || document.querySelectorAll('[data-navv2-pick]').length > 0, {
      timeout: 12000,
    })
    await new Promise((r) => setTimeout(r, 800))
    await shot(page, '03-yeoksam-candidates.png')
    await shot(page, '04-candidate-markers.png')

    const first = await page.$('[data-navv2-pick="0"]')
    if (first) await first.click()
    await new Promise((r) => setTimeout(r, 500))
    await shot(page, '05-place-detail.png')

    // 6 driving route
    const routeBtn = await page.$('[data-navv2-action="route"]')
    if (routeBtn) await routeBtn.click()
    await page.waitForFunction(() => document.body.innerText.includes('안내 시작') || document.body.innerText.includes('경로'), {
      timeout: 15000,
    }).catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
    await shot(page, '06-driving-route.png')

    // 7 walking
    const walk = await page.$('[data-navv2-mode="walking"]')
    if (walk) await walk.click()
    await new Promise((r) => setTimeout(r, 1200))
    await shot(page, '07-walking-route.png')

    // 8 start guidance
    const start = await page.$('[data-navv2-action="start"]')
    if (start) await start.click()
    await new Promise((r) => setTimeout(r, 800))
    await shot(page, '08-guidance-start.png')
    await shot(page, '09-next-turn.png')

    // 10 permission denied note — clear geolocation mock via status text path
    await openNav(page, base)
    await page.evaluate(() => {
      sessionStorage.clear()
    })
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('#navv2-q')
    await page.type('#navv2-q', '역삼동')
    await page.click('#navv2-search-form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 1000))
    await shot(page, '10-location-denied-or-no-geo.png')

    // 11 empty results
    await page.click('#navv2-q', { clickCount: 3 })
    await page.type('#navv2-q', 'zzz존재하지않는장소xyz')
    await page.click('#navv2-search-form button[type="submit"]')
    await page.waitForFunction(() => document.body.innerText.includes('없어요') || document.body.innerText.includes('결과'), {
      timeout: 8000,
    }).catch(() => {})
    await shot(page, '11-no-results.png')

    // 12 settings
    await page.goto(`${base}?home=v2&view=settings`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-nav-settings="1"]', { timeout: 10000 }).catch(() => {})
    await page.evaluate(() => {
      const d = document.querySelector('[data-nav-settings="1"]')
      if (d) d.open = true
      d?.scrollIntoView?.()
    })
    await shot(page, '12-settings-nav.png')

    // 13 chat cards
    await page.goto(`${base}?home=legacy`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('#draft, #composer', { timeout: 10000 })
    await page.click('#draft')
    await page.type('#draft', '역삼동')
    await page.click('.send-btn')
    await page.waitForFunction(() => document.querySelector('[data-navv2-chat-cards="1"]') || document.body.innerText.includes('후보'), {
      timeout: 15000,
    }).catch(() => {})
    // may navigate to navigation view — if so go back to chat with cards in session
    const onNav = await page.$('[data-navv2="1"]')
    if (onNav) {
      await page.click('[data-view="chat"]')
      await new Promise((r) => setTimeout(r, 600))
    }
    await shot(page, '13-chat-place-cards.png')

    // 14 small iPhone
    await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2, isMobile: true })
    await openNav(page, base)
    await shot(page, '14-iphone-320.png')

    // 15 Android 360
    await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true })
    await openNav(page, base)
    await page.type('#navv2-q', '강남역')
    await page.click('#navv2-search-form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 1000))
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
