/**
 * Arcade smoke: open games tab and switch through all titles.
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist missing')
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname)
    if (path === '/') path = '/index.html'
    const file = join(dist, path.replace(/^\//, ''))
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404)
      res.end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'bin' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => server.listen(4182, '127.0.0.1', () => r()))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 37.5, lon: 127, accuracy: 10, at: Date.now() }
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem('jarvis.geo.last.v1', JSON.stringify(fix))
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: 37.5,
          longitude: 127,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    }
  })

  await page.goto('http://127.0.0.1:4182/', { waitUntil: 'networkidle0' })
  await page.click('[data-view="games"]')
  await page.waitForSelector('#arcade-canvas')

  const ids = ['snake', 'breakout', 'shooter', 'flappy', 'dodge', 'pong']
  for (const id of ids) {
    await page.click(`[data-arcade="${id}"]`)
    await page.waitForFunction(
      (want) => document.querySelector(`.game-tab.active`)?.getAttribute('data-arcade') === want,
      {},
      id,
    )
    await page.waitForSelector('#arcade-canvas')
    // tap once to exercise pointer path
    const box = await page.$('#arcade-canvas')
    const rect = await box.boundingBox()
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await new Promise((r) => setTimeout(r, 120))
  }

  const titles = await page.$$eval('.game-tab', (els) => els.map((e) => e.textContent || ''))
  if (titles.length < 6) throw new Error(`expected 6 games, got ${titles.join(',')}`)
  if (errors.length) throw new Error(errors.join(' | '))
  console.log('ARCADE_E2E_OK', titles.join(','))
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('ARCADE_E2E_FAIL', err)
  process.exit(1)
})
