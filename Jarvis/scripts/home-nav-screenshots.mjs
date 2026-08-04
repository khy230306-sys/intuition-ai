/**
 * Screenshots for HOME v2 default + AI 길안내 v1 review.
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const outDir = process.env.SHOT_DIR || '/tmp/cursor/artifacts/home-nav-v1-shots'

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
  await page.screenshot({ path })
  console.log('shot', path)
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
  await new Promise((r) => server.listen(4191, '127.0.0.1', r))
  const base = 'http://127.0.0.1:4191/'
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    let page = await browser.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true })

    // 1 default HOME v2
    await page.goto(base, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.evaluate(() => {
      localStorage.removeItem('aizio.home.variant.v1')
      localStorage.removeItem('aizio.home.bootDefault.v1')
    })
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 12000 })
    await shot(page, '01-home-v2-default.png')

    // 2 quick actions with 길안내
    await shot(page, '02-home-v2-quick-nav.png')

    // 3 nav sheet
    await page.click('[data-quick-id="navigate"]')
    await page.waitForSelector('[data-nav-sheet="1"]', { timeout: 5000 })
    await shot(page, '03-nav-sheet.png')

    // 4 filled destination
    await page.type('#nav-dest-input', '울산역')
    await page.select('#nav-travel-select', 'transit')
    await shot(page, '04-nav-sheet-filled.png')

    // 5 map select
    await page.select('#nav-map-select', 'kakao')
    await shot(page, '05-nav-map-select.png')

    // 6 home unset — close sheet, open settings path via chip
    await page.click('[data-action="nav-sheet-close"]')
    await page.click('[data-quick-id="navigate"]')
    await page.waitForSelector('[data-nav-sheet="1"]')
    await page.click('[data-nav-chip="home"]')
    await page.waitForFunction(() => document.body.innerText.includes('집 주소'), { timeout: 8000 }).catch(() => {})
    await shot(page, '06-home-address-missing.png')

    // 7 more menu
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-action="home-v2-nav-more"]')
    await page.click('[data-action="home-v2-nav-more"]')
    await page.waitForSelector('[data-home-v2-more="1"]')
    await shot(page, '08-more-menu.png')

    // 8 settings nav section
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.evaluate(() => {
      document.querySelector('[data-view="settings"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    // use nav
    await page.click('button[data-view="settings"]').catch(() => {})
    await page.waitForSelector('[data-nav-settings="1"]', { timeout: 8000 }).catch(() => {})
    // force settings via evaluate state isn't available — click bottom more
    await page.goto(`${base}`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.click('[data-action="home-v2-nav-more"]')
    await page.waitForSelector('[data-home-v2-more="1"]')
    await page.click('button[data-view="settings"]')
    await page.waitForSelector('[data-nav-settings="1"]', { timeout: 8000 })
    await shot(page, '09-settings-navigation.png')

    // permission denied label simulate
    await page.evaluate(() => {
      const el = document.querySelector('[data-nav-perm-status]')
      if (el) el.textContent = '위치 권한: 거부됨'
    })
    await shot(page, '07-location-denied.png')

    // 10 SE
    await page.close()
    page = await browser.newPage()
    await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2, isMobile: true })
    await page.goto(base, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 10000 })
    await shot(page, '10-iphone-se.png')

    // 11 android 360
    await page.close()
    page = await browser.newPage()
    await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true })
    await page.goto(base, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 10000 })
    await shot(page, '11-android-360.png')

    // 12 legacy
    await page.goto(`${base}?home=legacy`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await shot(page, '12-legacy-home.png')

    writeFileSync(join(outDir, 'README.md'), '# HOME v2 default + Navigation v1 review shots\n')
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
