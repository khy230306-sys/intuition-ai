/**
 * Headless Chrome integration test for voice UX.
 * Injects a FakeSpeechRecognition into the page and verifies:
 * MIC → interim caption → silence finalize → chat message.
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
  '.webmanifest': 'application/manifest+json',
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

  await new Promise((resolve) => server.listen(4177, '127.0.0.1', () => resolve()))
  const base = 'http://127.0.0.1:4177/'

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
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
    navigator.mediaDevices = navigator.mediaDevices || {}
    navigator.mediaDevices.getUserMedia = async () => ({
      getTracks: () => [{ stop() {} }],
    })

    class FakeRec {
      constructor() {
        this.lang = ''
        this.continuous = false
        this.interimResults = false
        this.maxAlternatives = 1
        this.onstart = null
        this.onresult = null
        this.onerror = null
        this.onend = null
        this.onspeechstart = null
        this.onspeechend = null
        FakeRec.instances.push(this)
        window.__fakeRecs = FakeRec.instances
      }

      start() {
        setTimeout(() => this.onstart && this.onstart(), 0)
      }
      stop() {
        setTimeout(() => this.onend && this.onend(), 0)
      }
      abort() {
        setTimeout(() => this.onend && this.onend(), 0)
      }
    }
    FakeRec.instances = []

    window.webkitSpeechRecognition = FakeRec
    window.SpeechRecognition = FakeRec
  })

  await page.goto(base, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-action="mic"]', { timeout: 15000 })

  // Empty HOME has orb + composer MIC — both must be wired (regression for querySelector-only bind).
  const micCount = await page.$$eval('[data-action="mic"]', (els) => els.length)
  if (micCount < 2) throw new Error(`expected ≥2 mic buttons on empty home, got ${micCount}`)

  await page.click('.home-v2-composer [data-action="mic"]')
  await page.waitForFunction(() => window.__fakeRecs && window.__fakeRecs.length > 0, {
    timeout: 8000,
  })
  // Stop without sending so later chat flow stays clean
  await page.click('.home-v2-composer [data-action="mic"]')

  // Settings entry may live in 메뉴 sheet on HOME v2
  const settingsBtn = await page.$('[data-view="settings"]')
  if (settingsBtn) {
    await settingsBtn.click()
  } else {
    await page.click('[data-action="home-v2-nav-more"]')
    await page.waitForSelector('[data-view="settings"]', { timeout: 5000 })
    await page.click('[data-view="settings"]')
  }
  await page.waitForSelector('[data-action="voice-test"]')
  await page.click('[data-action="voice-test"]')
  await page.waitForSelector('.msg.assistant')

  // Back to chat / home
  const chatBtn = await page.$('[data-view="chat"]')
  if (chatBtn) await chatBtn.click()
  else {
    const homeBtn = await page.$('[data-action="home-v2-nav-home"]')
    if (homeBtn) await homeBtn.click()
    else await page.click('[data-view="home"]')
  }
  await page.waitForSelector('[data-action="mic"]')
  // Prefer composer MIC when present; else first mic
  const composerMic = await page.$('.home-v2-composer [data-action="mic"], .chat-composer [data-action="mic"]')
  if (composerMic) await composerMic.click()
  else await page.click('[data-action="mic"]')

  await page.waitForFunction(() => window.__fakeRecs && window.__fakeRecs.length > 0, { timeout: 8000 })

  await page.evaluate(() => {
    const recs = window.__fakeRecs
    const rec = recs[recs.length - 1]
    if (!rec) throw new Error('no fake recognition instance')
    if (rec.onspeechstart) rec.onspeechstart()
    rec.onresult({
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: false, length: 1, 0: { transcript: '지금 몇 시야' } },
      },
    })
  })

  await page.waitForFunction(() => {
    const cap = document.getElementById('voice-caption')
    return !!cap && !cap.hidden && (cap.textContent || '').includes('몇 시')
  }, { timeout: 5000 })

  await page.evaluate(() => {
    const recs = window.__fakeRecs
    const rec = recs[recs.length - 1]
    rec.onresult({
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: true, length: 1, 0: { transcript: '지금 몇 시야' } },
      },
    })
  })

  await page.waitForFunction(
    () => {
      const msgs = [...document.querySelectorAll('.msg.user')]
      return msgs.some((m) => (m.textContent || '').includes('지금 몇 시야'))
    },
    { timeout: 8000 },
  )

  await page.waitForFunction(
    () => {
      const msgs = [...document.querySelectorAll('.msg.assistant')]
      return msgs.some((m) => (m.textContent || '').includes('지금은'))
    },
    { timeout: 8000 },
  )

  const listeningAfter = await page.$eval('[data-action="mic"]', (el) =>
    el.classList.contains('listening'),
  )
  if (listeningAfter) throw new Error('mic still listening after finalize')

  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)

  console.log('VOICE_E2E_OK')
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('VOICE_E2E_FAIL', err)
  process.exit(1)
})
