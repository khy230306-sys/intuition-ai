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

async function dismissOverlays(page) {
  await page.evaluate(() => {
    const labels = [/나중에/, /AI 없이 기본 기능/, /숨기기/]
    for (const re of labels) {
      const btn = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''))
      btn?.click()
    }
  })
  await new Promise((r) => setTimeout(r, 250))
}

async function ensureChatComposer(page) {
  await page.evaluate(() => {
    if (!document.querySelector('#draft')) location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 15000 })
  await dismissOverlays(page)
  await page.waitForSelector('#draft:not([disabled])', { timeout: 15000 })
}

async function sendChat(page, text) {
  await ensureChatComposer(page)
  const sent = await page.evaluate((msg) => {
    const input = document.getElementById('draft')
    const form = document.getElementById('composer')
    if (!input || !form) return { ok: false, reason: 'missing-composer' }
    input.disabled = false
    input.focus()
    input.value = msg
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.requestSubmit()
    return { ok: true }
  }, text)
  if (!sent.ok) throw new Error(`sendChat failed: ${sent.reason}`)
  await page.waitForFunction(
    (msg) =>
      [...document.querySelectorAll('.msg-bubble.user, .msg.user')].some((m) =>
        (m.textContent || '').includes(msg),
      ),
    { timeout: 12000 },
    text,
  )
  await page.waitForFunction(
    () => {
      const busy = document.querySelector('#draft')?.disabled
      return !busy
    },
    { timeout: 25000 },
  )
  await new Promise((r) => setTimeout(r, 350))
}

async function lastAssistant(page) {
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant, .msg.assistant')]
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

  const context = browser.defaultBrowserContext()
  await context.overridePermissions(base, ['geolocation', 'notifications'])
  await page.setGeolocation({ latitude: 37.5665, longitude: 126.978, accuracy: 12 })

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 37.5665, lon: 126.978, accuracy: 12, at: Date.now() }
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem('jarvis.geo.last.v1', JSON.stringify(fix))
    const ok = (success) => {
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
    navigator.geolocation.getCurrentPosition = (success) => ok(success)
    navigator.geolocation.watchPosition = (success) => {
      ok(success)
      return 1
    }
    const originalQuery = navigator.permissions?.query?.bind(navigator.permissions)
    if (navigator.permissions) {
      navigator.permissions.query = (desc) => {
        if (desc && desc.name === 'geolocation') {
          return Promise.resolve({ state: 'granted', onchange: null })
        }
        return originalQuery ? originalQuery(desc) : Promise.resolve({ state: 'granted', onchange: null })
      }
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
  for (let i = 0; i < 25; i++) {
    const state = await page.evaluate(() => ({
      draft: Boolean(document.querySelector('#draft')),
      homeAsk: Boolean(document.querySelector('#home-ask-input')),
      skip: Boolean(document.querySelector('[data-action="skip-location"]')),
    }))
    if (state.draft || state.homeAsk) break
    if (state.skip) {
      await page.click('[data-action="skip-location"]')
      await new Promise((r) => setTimeout(r, 400))
      continue
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 15000 })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /나중에|AI 없이 기본 기능/.test(b.textContent || ''),
    )
    btn?.click()
  })
  await page.waitForSelector('#draft:not([disabled])', { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 400))

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
