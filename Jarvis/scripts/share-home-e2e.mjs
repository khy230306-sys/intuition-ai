/**
 * E2E: home widget + app share QR modal
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
  await new Promise((r) => server.listen(4179, '127.0.0.1', () => r()))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 37.5665, lon: 126.978, accuracy: 12, at: Date.now() }
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem('jarvis.geo.last.v1', JSON.stringify(fix))
    localStorage.setItem(
      'jarvis_reminders_v1',
      JSON.stringify([
        { id: 'r1', text: '약 먹기', done: false, createdAt: Date.now(), when: '오늘', whenAt: Date.now() + 3600000 },
        { id: 'r2', text: '운동하기', done: false, createdAt: Date.now() },
      ]),
    )
    localStorage.setItem(
      'jarvis_expenses_v1',
      JSON.stringify([{ id: 'e1', amount: 4500, category: '카페', note: '커피', createdAt: Date.now() }]),
    )
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: fix.lat,
          longitude: fix.lon,
          accuracy: fix.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    }
  })

  await page.goto('http://127.0.0.1:4179/', { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-home-widget]', { timeout: 15000 })

  const widgetText = await page.$eval('[data-home-widget]', (el) => el.textContent || '')
  if (!/할 일|오늘 지출|4,500|약 먹기/.test(widgetText)) {
    throw new Error(`home widget missing expected content: ${widgetText}`)
  }

  await page.click('[data-action="open-share-app"]')
  await page.waitForSelector('.share-modal .share-qr svg', { timeout: 10000 })
  const hint = await page.$eval('.share-hint', (el) => el.textContent || '')
  if (!/http/.test(hint)) throw new Error(`share hint missing url: ${hint}`)

  await page.click('[data-action="close-share"]')
  await page.waitForFunction(() => !document.querySelector('.share-modal'))

  await page.click('[data-view="settings"]')
  await page.waitForSelector('[data-action="share-backup-native"]')
  await page.click('[data-action="open-share-backup"]')
  await page.waitForSelector('.share-modal .share-qr svg', { timeout: 10000 })

  if (errors.length) throw new Error(errors.join(' | '))
  console.log('SHARE_HOME_E2E_OK')
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('SHARE_HOME_E2E_FAIL', err)
  process.exit(1)
})
