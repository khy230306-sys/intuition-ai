/**
 * Verify invite modal copy buttons work and show visible status (not hidden under modal).
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
  await new Promise((r) => server.listen(4193, '127.0.0.1', () => r()))

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

  await page.goto('http://127.0.0.1:4193/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    window.__copied = []
    const orig = document.execCommand.bind(document)
    document.execCommand = (cmd, ...rest) => {
      if (cmd === 'copy') {
        const ta = document.querySelector('textarea')
        const sel = window.getSelection()?.toString()
        window.__copied.push(sel || ta?.value || '')
      }
      return orig(cmd, ...rest)
    }
  })

  await page.click('[data-view="friends"]')
  await page.waitForSelector('#friends-create')
  await page.click('#friends-create button[type="submit"]')
  await page.waitForSelector('[data-action="friends-invite"]')
  await page.click('[data-action="friends-invite"]')
  await page.waitForSelector('[data-action="copy-invite-code"]')
  await page.waitForSelector('[data-action="copy-invite-link"]')
  await page.waitForSelector('[data-share-status]')
  await page.waitForSelector('.invite-copy-box')
  await page.waitForFunction(() => (document.body.textContent || '').includes('v1.7.3'))

  const code = await page.$eval('[data-invite-select="code"]', (el) => el.value || '')
  if (code.length < 4) throw new Error('invite code missing')

  // Flash must sit above modal
  const z = await page.evaluate(() => {
    const flash = document.getElementById('flash')
    const modal = document.querySelector('.share-modal')
    return {
      flash: Number(getComputedStyle(flash).zIndex),
      modal: Number(getComputedStyle(modal).zIndex),
    }
  })
  if (!(z.flash > z.modal)) throw new Error(`flash z-index ${z.flash} must be > modal ${z.modal}`)

  await page.click('[data-action="copy-invite-code"]')
  await page.waitForFunction(
    (want) => (document.querySelector('[data-share-status]')?.textContent || '').includes(want),
    {},
    code,
  )
  const status1 = await page.$eval('[data-share-status]', (el) => el.textContent || '')
  if (!status1.includes('복사')) throw new Error(`code copy status missing: ${status1}`)
  const flash1 = await page.$eval('#flash', (el) => ({
    text: el.textContent || '',
    show: el.classList.contains('show'),
  }))
  if (!flash1.show || !flash1.text.includes(code)) {
    throw new Error(`flash not visible after code copy: ${JSON.stringify(flash1)}`)
  }

  await page.click('[data-action="copy-invite-text"]')
  await page.waitForFunction(() =>
    (document.querySelector('[data-share-status]')?.textContent || '').includes('초대 문구'),
  )
  const status2 = await page.$eval('[data-share-status]', (el) => el.textContent || '')
  if (!status2.includes('초대 문구')) throw new Error(`text copy status missing: ${status2}`)

  await page.click('[data-action="copy-invite-link"]')
  await page.waitForFunction(() =>
    (document.querySelector('[data-share-status]')?.textContent || '').includes('링크'),
  )
  const status3 = await page.$eval('[data-share-status]', (el) => el.textContent || '')

  const box = await page.$eval('.invite-copy-box', (el) => el.value || '')
  if (!box.includes(code) || !box.includes('friends=')) {
    throw new Error(`invite copy box incomplete: ${box.slice(0, 80)}`)
  }

  const copied = await page.evaluate(() => window.__copied)
  if (!copied.some((c) => String(c).includes(code))) {
    throw new Error(`execCommand copy never received code: ${JSON.stringify(copied)}`)
  }

  if (errors.length) throw new Error(errors.join(' | '))
  console.log('INVITE_COPY_E2E_OK', { code, status1, status2, status3, z })
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('INVITE_COPY_E2E_FAIL', err)
  process.exit(1)
})
