/**
 * Friends space local UI E2E (create room, chat, notice, event)
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
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => server.listen(4183, '127.0.0.1', () => r()))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

  await page.goto('http://127.0.0.1:4183/', { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-view="friends"]')
  await page.click('[data-view="friends"]')
  await page.waitForSelector('#friends-create')

  await page.type('#friends-create input[name="name"]', '')
  await page.click('#friends-create input[name="name"]', { clickCount: 3 })
  await page.type('#friends-create input[name="name"]', '테스트친구')
  await page.click('#friends-create button[type="submit"]')
  await page.waitForSelector('#friends-chat-form')

  const code = await page.$eval('.friends-head strong', (el) => el.textContent || '')
  if (code.length < 4) throw new Error(`friends code missing: ${code}`)

  await page.click('[data-action="friends-invite"]')
  await page.waitForSelector('.share-modal')
  await page.waitForSelector('.invite-code-value')
  const shown = await page.$eval('.invite-code-value', (el) => el.textContent || '')
  if (shown !== code) throw new Error(`invite modal code mismatch: ${shown} vs ${code}`)
  await page.waitForSelector('[data-action="copy-invite-code"]')
  await page.waitForSelector('[data-action="share-invite-native"]')
  await page.click('[data-action="close-share"]')
  await page.waitForFunction(() => !document.querySelector('.share-modal'))

  await page.type('#friends-chat-form input[name="text"]', '친구 안녕')
  await page.click('#friends-chat-form button[type="submit"]')
  await page.waitForFunction(() => (document.querySelector('.friends-chat')?.textContent || '').includes('친구 안녕'))

  await page.click('[data-friends-tab="notices"]')
  await page.waitForSelector('#friends-notice-form')
  await page.type('#friends-notice-form input[name="title"]', '주말 공지')
  await page.type('#friends-notice-form textarea[name="body"]', '일요일 모임')
  await page.click('#friends-notice-form button[type="submit"]')
  await page.waitForFunction(() => (document.body.textContent || '').includes('주말 공지'))

  await page.click('[data-friends-tab="events"]')
  await page.waitForSelector('#friends-event-form')
  await page.type('#friends-event-form input[name="title"]', '병원')
  await page.click('#friends-event-form button[type="submit"]')
  await page.waitForFunction(() => (document.body.textContent || '').includes('병원'))

  if (errors.length) throw new Error(errors.join(' | '))
  console.log('FRIENDS_E2E_OK', code)
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('FRIENDS_E2E_FAIL', err)
  process.exit(1)
})
