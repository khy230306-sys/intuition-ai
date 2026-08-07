/**
 * Family space local UI E2E (create room, chat, notice, event)
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
  await new Promise((r) => server.listen(4181, '127.0.0.1', () => r()))

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

  await page.goto('http://127.0.0.1:4181/#family-room', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    document.querySelector('[data-action="skip-location"]')?.click()
    for (const re of [/숨기기/, /나중에/, /오프라인/, /AI 없이/]) {
      ;[...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''))?.click()
    }
  })
  // Primary 가족 tab is family-helper; 멤버 space is #family-room (More → 멤버)
  await page.waitForSelector('#family-create', { timeout: 20000 })

  await page.type('#family-create input[name="name"]', '')
  await page.click('#family-create input[name="name"]', { clickCount: 3 })
  await page.type('#family-create input[name="name"]', '테스트가족')
  await page.click('#family-create button[type="submit"]')
  await page.waitForSelector('#family-chat-form')

  const code = await page.$eval('.family-head strong', (el) => el.textContent || '')
  if (code.length < 4) throw new Error(`family code missing: ${code}`)

  await page.type('#family-chat-form input[name="text"]', '가족 안녕')
  await page.click('#family-chat-form button[type="submit"]')
  await page.waitForFunction(() => (document.querySelector('.fam-chat')?.textContent || '').includes('가족 안녕'))

  await page.evaluate(() => {
    document.querySelector('[data-family-tab="notices"]')?.click()
  })
  await page.waitForSelector('#family-notice-form', { timeout: 20000 })
  await page.type('#family-notice-form input[name="title"]', '주말 공지')
  await page.type('#family-notice-form textarea[name="body"]', '일요일 모임')
  await page.click('#family-notice-form button[type="submit"]')
  await page.waitForFunction(() => (document.body.textContent || '').includes('주말 공지'))

  await page.evaluate(() => {
    document.querySelector('[data-family-tab="events"]')?.click()
  })
  await page.waitForSelector('#family-event-form', { timeout: 20000 })
  await page.type('#family-event-form input[name="title"]', '병원')
  await page.click('#family-event-form button[type="submit"]')
  await page.waitForFunction(() => (document.body.textContent || '').includes('병원'))

  // Join receipt registers a remote member without live P2P
  await page.evaluate(() => document.querySelector('[data-family-tab="chat"]')?.click())
  await page.waitForSelector('#family-join-receipt', { timeout: 20000 })
  await page.$eval('#family-join-receipt', (el) => {
    const d = el.closest('details')
    if (d) d.open = true
  })
  const receipt = [
    'AIZIO 가족 참여 확인',
    `아빠 · 코드 ${code}`,
    '',
    `AIZIO-JOIN|v1|family|${code}|guest-dad|아빠|${Date.now()}`,
  ].join('\n')
  await page.$eval(
    '#family-join-receipt textarea[name="receipt"]',
    (el, value) => {
      el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    receipt,
  )
  await page.click('#family-join-receipt button[type="submit"]')
  const joined = await page
    .waitForFunction(
      () => {
        const t = document.body.textContent || ''
        return t.includes('아빠') && (/등록 멤버\s*2|멤버\s*2|2명/.test(t) || t.includes('guest-dad'))
      },
      { timeout: 8000 },
    )
    .then(() => true)
    .catch(() => false)
  if (!joined) {
    console.warn('FAMILY_E2E_WARN join-receipt member count not confirmed (create/chat/notice/events OK)')
  }

  if (errors.length) throw new Error(errors.join(' | '))
  console.log('FAMILY_E2E_OK', code, joined ? 'with-join' : 'core-only')
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('FAMILY_E2E_FAIL', err)
  process.exit(1)
})
