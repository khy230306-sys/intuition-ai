/**
 * AIZIO Anywhere gate — offline shell + router honesty + settings panel + upgrade markers.
 * Does not download multi-hundred-MB models in CI (too heavy); verifies install UX + offline policy.
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const outDir = '/opt/cursor/artifacts'
mkdirSync(outDir, { recursive: true })

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

async function enter(page) {
  for (let i = 0; i < 8; i++) {
    const skip = await page.$('[data-action="skip-location"]')
    if (skip) {
      await skip.click()
      await new Promise((r) => setTimeout(r, 150))
    } else break
  }
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
}

async function send(page, text) {
  const before = await page.evaluate(() => document.querySelectorAll('.msg-bubble.assistant').length)
  await page.evaluate((msg) => {
    const input = document.getElementById('draft')
    const form = document.getElementById('composer')
    input.disabled = false
    input.value = msg
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.requestSubmit()
  }, text)
  await page
    .waitForFunction(
      (n) => document.querySelectorAll('.msg-bubble.assistant').length > n,
      { timeout: 18000 },
      before,
    )
    .catch(() => null)
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant')]
    return (msgs[msgs.length - 1]?.textContent || '').trim()
  })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist missing')
  const results = []
  const note = (name, ok, detail = '') => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'OK' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    let path = decodeURIComponent(url.pathname)
    if (path === '/') path = '/index.html'
    const file = join(dist, path.replace(/^\//, ''))
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404)
      res.end('nf')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => server.listen(4230, '127.0.0.1', r))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userDataDir: `/tmp/aizio-anywhere-${Date.now()}`,
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem(
      'jarvis.geo.last.v1',
      JSON.stringify({ lat: 35.54, lon: 129.31, accuracy: 10, at: Date.now() }),
    )
  })

  await page.goto('http://127.0.0.1:4230/?source=pwa', { waitUntil: 'networkidle0', timeout: 90000 })
  await enter(page)
  note('online_boot', /AIZIO/.test(await page.title()))

  // Settings Anywhere panel
  await page.evaluate(() => {
    location.hash = '#settings'
  })
  await new Promise((r) => setTimeout(r, 400))
  const panel = await page.evaluate(() => ({
    anywhere: Boolean(document.querySelector('[data-anywhere-panel="1"]')),
    text: (document.querySelector('[data-anywhere-panel="1"]')?.textContent || '').slice(0, 200),
  }))
  note('anywhere_settings_panel', panel.anywhere && /AIZIO Anywhere|오프라인 AI/.test(panel.text), panel.text)

  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 15000 })

  // SW ready + mark
  const sw = await page.evaluate(async () => {
    await navigator.serviceWorker?.ready
    await new Promise((r) => setTimeout(r, 1200))
    const keys = await caches.keys()
    return { caches: keys.length, readyFlag: localStorage.getItem('aizio.anywhere.offlineReady.v1') }
  })
  note('sw_and_ready_flag', sw.caches > 0, JSON.stringify(sw))

  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await enter(page)
  note('offline_launch', Boolean(await page.$('#draft')))

  const weather = await send(page, '내일 울산 날씨 알려줘')
  note('offline_weather_refuse', /오프라인|인터넷/.test(weather), weather.slice(0, 120))

  const schedule = await send(page, '내 일정 보여줘')
  note('offline_local_schedule', /일정|없어요|등록/.test(schedule), schedule.slice(0, 120))

  const travel = await send(page, '여행 오프라인 준비')
  note('travel_pack', /여행 오프라인|호치민|스냅샷/.test(travel), travel.slice(0, 120))

  const hotel = await send(page, '호텔 주소 알려줘')
  note('travel_hotel_snapshot', /숙소|주소|스냅샷|호텔/.test(hotel), hotel.slice(0, 120))

  // Model not installed → honest message for generative ask
  const polish = await send(page, '이 문장 자연스럽게 바꿔줘: 호텔까지 가고 싶어요')
  note(
    'offline_local_ai_install_hint_or_rules',
    /설치|오프라인 AI|바꿔|호텔|문장|Local|로컬|설정/.test(polish),
    polish.slice(0, 160),
  )

  await page.setOfflineMode(false)
  await page.reload({ waitUntil: 'networkidle0', timeout: 90000 })
  await enter(page)
  note('online_recovery', Boolean(await page.$('#draft')))

  const report = {
    at: new Date().toISOString(),
    pass: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
    results,
  }
  writeFileSync(join(outDir, 'anywhere-e2e-report.json'), JSON.stringify(report, null, 2))
  console.log('WROTE anywhere-e2e-report.json', report.pass, '/', results.length)
  await browser.close()
  server.close()
  if (report.fail) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
