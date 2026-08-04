/**
 * Capture HOME v2 review screenshots into /tmp/cursor/artifacts.
 * Requires: npm run build && google-chrome
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const outDir = process.env.SHOT_DIR || '/tmp/cursor/artifacts/home-v2-shots'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}

async function skipLocation(page) {
  await page.waitForSelector('[data-action="skip-location"], #app', { timeout: 15000 })
  const skip = await page.$('[data-action="skip-location"]')
  if (skip) {
    await skip.click()
    await page.waitForFunction(() => !document.querySelector('.location-gate'), { timeout: 10000 })
  }
}

async function seedData(page) {
  await page.evaluate(() => {
    const now = Date.now()
    localStorage.setItem(
      'jarvis.reminders',
      JSON.stringify([
        { id: 'r1', text: '병원 예약', done: false, whenAt: now + 3600_000 },
        { id: 'r2', text: '엄마에게 전화', done: false, whenAt: now + 7200_000 },
        { id: 'r3', text: '오후 3시 회의', done: false, whenAt: now + 10800_000 },
      ]),
    )
    localStorage.setItem(
      'jarvis.alarms',
      JSON.stringify([
        { id: 'a1', body: '오후 회의', whenAt: now + 5400_000, fired: false },
      ]),
    )
    localStorage.setItem('aizio.home.variant.v1', 'v2')
    localStorage.setItem(
      'jarvis.settings',
      JSON.stringify({
        ...JSON.parse(localStorage.getItem('jarvis.settings') || '{}'),
        displayName: '성규',
        city: '서울',
      }),
    )
  })
}

async function shot(page, name, opts = {}) {
  const path = join(outDir, name)
  await page.screenshot({ path, fullPage: !!opts.fullPage })
  console.log('shot', path)
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('run npm run build first')
  mkdirSync(outDir, { recursive: true })

  // Ensure preview channel meta for design lab
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
  await new Promise((r) => server.listen(4188, '127.0.0.1', r))
  const base = 'http://127.0.0.1:4188/'

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=430,932'],
  })

  try {
    // 1) HOME v2 default (iPhone-ish)
    let page = await browser.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true })
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await seedData(page)
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 10000 })
    await shot(page, '01-home-v2-default.png')

    // 2) listening state (visual only)
    await page.evaluate(() => {
      document.querySelector('[data-home-v2-orb]')?.classList.add('listening')
      const wrap = document.querySelector('.home-v2-voice')
      if (wrap) wrap.dataset.voiceState = 'listening'
      const p = document.querySelector('[data-home-v2-prompt]')
      if (p) {
        p.textContent = '듣고 있습니다…'
        p.classList.add('live')
      }
    })
    await shot(page, '02-home-v2-listening.png')

    // 3) smart card with schedule (already seeded)
    await page.evaluate(() => {
      document.querySelector('[data-home-v2-orb]')?.classList.remove('listening')
      const wrap = document.querySelector('.home-v2-voice')
      if (wrap) wrap.dataset.voiceState = 'idle'
    })
    await shot(page, '03-home-v2-schedule-card.png')

    // 4) messages smart card — inject unread via DOM title swap if needed
    await page.evaluate(() => {
      const card = document.querySelector('.home-v2-smart-card')
      if (card) {
        card.querySelector('.home-v2-card-head strong').textContent = '새로운 메시지'
        const ul = card.querySelector('.home-v2-card-list') || document.createElement('ul')
        ul.className = 'home-v2-card-list'
        ul.innerHTML = '<li>가족방 · 새 메시지 2개</li><li>우리 ❤️ · 새 메시지 1개</li>'
        const empty = card.querySelector('.home-v2-card-empty')
        if (empty) empty.replaceWith(ul)
        else if (!card.querySelector('.home-v2-card-list')) card.appendChild(ul)
      }
    })
    await shot(page, '04-home-v2-messages-card.png')

    // 5) more menu
    await page.click('[data-action="home-v2-nav-more"]')
    await page.waitForSelector('[data-home-v2-more="1"]', { timeout: 5000 })
    await shot(page, '05-home-v2-more-menu.png')

    // 6) small iPhone SE
    await page.close()
    page = await browser.newPage()
    await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2, isMobile: true })
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await seedData(page)
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 10000 })
    await shot(page, '06-home-v2-iphone-se.png')

    // 7) Android 360
    await page.close()
    page = await browser.newPage()
    await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true })
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await seedData(page)
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 10000 })
    await shot(page, '07-home-v2-android-360.png')

    // before/after
    await page.close()
    page = await browser.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true })
    await page.goto(`${base}?home=legacy`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await shot(page, '08-home-legacy.png')
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('[data-home-v2="1"]', { timeout: 10000 })
    await shot(page, '09-home-v2-compare.png')

    writeFileSync(
      join(outDir, 'README.md'),
      `# HOME v2 review screenshots\n\nGenerated for design review. Not production.\n`,
    )
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
