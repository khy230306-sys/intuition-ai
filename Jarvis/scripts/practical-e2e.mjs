/**
 * Headless Chrome execution test for practical features:
 * FX · market hours · one-line expense · local alarm
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

async function sendChat(page, text) {
  await page.waitForSelector('#draft:not([disabled])', { timeout: 10000 })
  await page.click('#draft', { clickCount: 3 })
  await page.type('#draft', text)
  await page.click('button.primary-btn[type="submit"]')
  await page.waitForFunction(
    (msg) => {
      const users = [...document.querySelectorAll('.msg.user')]
      return users.some((m) => (m.textContent || '').includes(msg))
    },
    { timeout: 8000 },
    text,
  )
  await page.waitForFunction(
    () => {
      const busy = document.querySelector('#draft')?.disabled
      return !busy
    },
    { timeout: 20000 },
  )
}

async function lastAssistant(page) {
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg.assistant')]
    const last = msgs[msgs.length - 1]
    return last ? last.textContent || '' : ''
  })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error('dist/ missing — run npm run build first')
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

  await new Promise((resolve) => server.listen(4178, '127.0.0.1', () => resolve()))
  const base = 'http://127.0.0.1:4178/'

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
  })

  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 37.5665, lon: 126.978, accuracy: 12, at: Date.now() }
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
    navigator.geolocation.watchPosition = (success) => {
      navigator.geolocation.getCurrentPosition(success)
      return 1
    }
    class FakeNotification {
      static permission = 'granted'
      static async requestPermission() {
        return 'granted'
      }
      constructor(title, opts) {
        window.__lastNotification = { title, body: opts && opts.body }
      }
      close() {}
    }
    window.Notification = FakeNotification
  })

  await page.goto(base, { waitUntil: 'networkidle0' })
  await page.waitForSelector('#draft', { timeout: 15000 })

  const checks = []

  await sendChat(page, '장시간')
  let reply = await lastAssistant(page)
  checks.push(['장시간', /KRX|개장|장전|장후|휴장/.test(reply), reply.slice(0, 120)])

  await sendChat(page, '100달러 환율')
  reply = await lastAssistant(page)
  checks.push(['환율', /원|USD|달러/.test(reply), reply.slice(0, 120)])

  await sendChat(page, '커피 4500')
  reply = await lastAssistant(page)
  checks.push(['지출', /4,500|지출|카페/.test(reply), reply.slice(0, 120)])

  await sendChat(page, '알림 1분 뒤 실행테스트')
  reply = await lastAssistant(page)
  checks.push(['알림예약', /알림 예약|실행테스트/.test(reply), reply.slice(0, 120)])

  const failed = checks.filter((c) => !c[1])
  for (const [name, ok, sample] of checks) {
    console.log(`${ok ? 'OK' : 'FAIL'} ${name}: ${sample.replace(/\s+/g, ' ')}`)
  }

  if (failed.length) {
    throw new Error(`practical checks failed: ${failed.map((f) => f[0]).join(', ')}`)
  }
  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)

  console.log('PRACTICAL_E2E_OK')
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('PRACTICAL_E2E_FAIL', err)
  process.exit(1)
})
