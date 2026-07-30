/**
 * Real two-device invite join: create on A, join via deep-link + paste on B.
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

function seedGeo(page) {
  return page.evaluateOnNewDocument(() => {
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
  await new Promise((r) => server.listen(4191, '127.0.0.1', () => r()))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const errors = []

  // —— Device A: create friends room + invite QR URL ——
  const ctxA = await browser.createBrowserContext()
  const pageA = await ctxA.newPage()
  pageA.on('pageerror', (e) => errors.push('A:' + String(e)))
  await seedGeo(pageA)
  await pageA.goto('http://127.0.0.1:4191/', { waitUntil: 'networkidle0' })
  await pageA.click('[data-view="friends"]')
  await pageA.waitForSelector('#friends-create')
  await pageA.click('#friends-create input[name="name"]', { clickCount: 3 })
  await pageA.type('#friends-create input[name="name"]', '테스트방')
  await pageA.click('#friends-create input[name="member"]', { clickCount: 3 })
  await pageA.type('#friends-create input[name="member"]', 'Alice')
  await pageA.click('#friends-create button[type="submit"]')
  await pageA.waitForSelector('#friends-chat-form')
  const code = await pageA.$eval('.friends-head strong', (el) => el.textContent || '')
  if (code.length < 4) throw new Error('create code missing')

  await pageA.type('#friends-chat-form input[name="text"]', 'Alice hello')
  await pageA.click('#friends-chat-form button[type="submit"]')
  await pageA.waitForFunction(() => (document.querySelector('.friends-chat')?.textContent || '').includes('Alice hello'))

  await pageA.click('[data-action="friends-invite"]')
  await pageA.waitForSelector('[data-invite-select="code"]')
  await pageA.waitForFunction(() => (document.body.textContent || '').includes('v1.6.11'))
  const inviteHint = await pageA.$eval('.share-hint', (el) => el.textContent || '')
  if (!inviteHint.includes(`friends=${code}`)) {
    throw new Error(`invite QR/deep-link missing friends=CODE: ${inviteHint}`)
  }
  const hasSvg = await pageA.$eval('.share-qr', (el) => !!el.querySelector('svg'))
  if (!hasSvg) throw new Error('invite QR svg missing')
  await pageA.click('[data-action="close-share"]')

  // —— Device B: deep-link auto join ——
  const ctxB = await browser.createBrowserContext()
  const pageB = await ctxB.newPage()
  pageB.on('pageerror', (e) => errors.push('B:' + String(e)))
  await seedGeo(pageB)
  await pageB.goto(`http://127.0.0.1:4191/?friends=${code}`, { waitUntil: 'networkidle0' })
  await pageB.waitForSelector('#friends-chat-form', { timeout: 8000 })
  const joined = await pageB.$eval('.friends-head strong', (el) => el.textContent || '')
  if (joined !== code) throw new Error(`deep-link join code mismatch ${joined} vs ${code}`)

  // —— Device B already in a room: conflict invite must offer switch ——
  await pageB.click('[data-action="friends-leave"]')
  await pageB.waitForSelector('#friends-create', { timeout: 8000 })
  await pageB.click('#friends-create button[type="submit"]')
  await pageB.waitForSelector('#friends-chat-form')
  const other = await pageB.$eval('.friends-head strong', (el) => el.textContent || '')
  if (other === code) throw new Error('expected a different room after recreate')
  await pageB.goto(`http://127.0.0.1:4191/?friends=${code}`, { waitUntil: 'networkidle0' })
  await pageB.waitForSelector('[data-action="switch-friends-invite"]', { timeout: 8000 })
  const stillOther = await pageB.$eval('.friends-head strong', (el) => el.textContent || '')
  if (stillOther !== other) throw new Error('conflict should keep current room until switch')
  await pageB.click('[data-action="switch-friends-invite"]')
  await pageB.waitForFunction(
    (expected) => (document.querySelector('.friends-head strong')?.textContent || '') === expected,
    { timeout: 8000 },
    code,
  )

  // Leave and re-join via pasted invite text (old broken path)
  await pageB.waitForSelector('[data-action="friends-leave"]')
  await pageB.click('[data-action="friends-leave"]')
  await pageB.waitForSelector('#friends-join', { timeout: 8000 })
  await pageB.waitForSelector('#friends-join input[name="code"]')
  await pageB.waitForSelector('#friends-join input[name="member"]')
  const paste = `JARVIS 친구 공간 초대\n이름: 테스트방\n코드: ${code}\n\nhttps://example.com/?friends=${code}`
  await pageB.$eval(
    '#friends-join input[name="code"]',
    (el, value) => {
      el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    paste,
  )
  await pageB.$eval('#friends-join input[name="member"]', (el) => {
    el.value = 'Bob'
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await pageB.click('#friends-join button[type="submit"]')
  await pageB.waitForSelector('#friends-chat-form', { timeout: 8000 })
  const joined2 = await pageB.$eval('.friends-head strong', (el) => el.textContent || '')
  if (joined2 !== code) throw new Error(`paste join wrong code ${joined2}`)

  // Family deep-link smoke
  const ctxC = await browser.createBrowserContext()
  const pageC = await ctxC.newPage()
  await seedGeo(pageC)
  await pageC.goto('http://127.0.0.1:4191/', { waitUntil: 'networkidle0' })
  await pageC.click('[data-view="family"]')
  await pageC.waitForSelector('#family-create')
  await pageC.click('#family-create button[type="submit"]')
  await pageC.waitForSelector('#family-chat-form')
  const famCode = await pageC.$eval('.family-head strong', (el) => el.textContent || '')
  await pageC.click('[data-action="family-invite"]')
  await pageC.waitForSelector('[data-invite-select="code"]')
  const famHint = await pageC.$eval('.share-hint', (el) => el.textContent || '')
  if (!famHint.includes(`family=${famCode}`)) throw new Error(`family deep-link missing: ${famHint}`)

  const ctxD = await browser.createBrowserContext()
  const pageD = await ctxD.newPage()
  await seedGeo(pageD)
  await pageD.goto(`http://127.0.0.1:4191/?family=${famCode}`, { waitUntil: 'networkidle0' })
  await pageD.waitForSelector('#family-chat-form', { timeout: 8000 })

  if (errors.length) throw new Error(errors.join(' | '))
  console.log('INVITE_JOIN_E2E_OK', { friends: code, family: famCode })
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('INVITE_JOIN_E2E_FAIL', err)
  process.exit(1)
})
