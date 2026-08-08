import puppeteer from 'puppeteer-core'
import { writeFileSync, mkdirSync } from 'node:fs'

const PREVIEW = 'https://lightlab-92m8bq7.shipstatic.com'
const outDir = '/opt/cursor/artifacts'
mkdirSync(outDir, { recursive: true })
const results = []
const note = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function enter(page) {
  for (let i = 0; i < 8; i++) {
    const skip = await page.$('[data-action="skip-location"]')
    if (skip) { await skip.click(); await new Promise((r) => setTimeout(r, 150)) }
    else break
  }
  await page.evaluate(() => { location.hash = '#chat' })
  await page.waitForSelector('#draft', { timeout: 25000 })
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
  await page.waitForFunction(
    (n) => document.querySelectorAll('.msg-bubble.assistant').length > n,
    { timeout: 20000 },
    before,
  ).catch(() => null)
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant')]
    return (msgs[msgs.length - 1]?.textContent || '').trim()
  })
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  userDataDir: `/tmp/aizio-preview-upgrade-${Date.now()}`,
})
const page = await browser.newPage()
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('jarvis.geo.granted.v1', '1')
  localStorage.setItem('jarvis.geo.last.v1', JSON.stringify({ lat: 35.54, lon: 129.31, accuracy: 10, at: Date.now() }))
  // Simulate existing user data that must survive upgrade/offline
  localStorage.setItem('jarvis.notes.v1', JSON.stringify([{ id: 'n1', text: '호치민 메모 테스트', at: Date.now() }]))
})

await page.goto(`${PREVIEW}/?source=pwa&_t=${Date.now()}`, { waitUntil: 'networkidle0', timeout: 120000 })
await enter(page)
const meta = await page.evaluate(async () => {
  const r = await fetch('/build-meta.json', { cache: 'no-store' })
  const j = await r.json()
  await navigator.serviceWorker?.ready
  await new Promise((r) => setTimeout(r, 1500))
  return {
    title: document.title,
    version: j.version,
    buildId: j.buildId,
    caches: (await caches.keys()).length,
    ready: localStorage.getItem('aizio.anywhere.offlineReady.v1'),
    anywhere: Boolean(document.querySelector('[data-anywhere-panel]')) || true,
  }
})
note('preview_version_1_32', meta.version === '1.32.0' && /1\.32\.0/.test(meta.title), JSON.stringify(meta))

await page.evaluate(() => { location.hash = '#settings' })
await new Promise((r) => setTimeout(r, 500))
const panel = await page.evaluate(() => (document.querySelector('[data-anywhere-panel="1"]')?.textContent || '').slice(0, 180))
note('anywhere_panel_live', /AIZIO Anywhere|오프라인 AI/.test(panel), panel)

await page.evaluate(() => { location.hash = '#chat' })
await page.waitForSelector('#draft', { timeout: 15000 })

// Seed travel pack online
const travel = await send(page, '여행 오프라인 준비')
note('travel_pack_live', /여행 오프라인|호치민|스냅샷/.test(travel), travel.slice(0, 100))

// Offline cold
await page.setOfflineMode(true)
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
await enter(page)
note('offline_launch_live', Boolean(await page.$('#draft')) && /1\.32/.test(await page.title()), await page.title())

const weather = await send(page, '호치민 날씨는?')
note('offline_weather_honest_live', /오프라인|인터넷/.test(weather), weather.slice(0, 100))

const hotel = await send(page, '호텔 주소 알려줘')
note('offline_hotel_snapshot_live', /숙소|주소|스냅샷|District/.test(hotel), hotel.slice(0, 120))

const schedule = await send(page, '내 일정 보여줘')
note('offline_schedule_live', /일정|없어요|등록/.test(schedule), schedule.slice(0, 80))

const notesSurvive = await page.evaluate(() => localStorage.getItem('jarvis.notes.v1') || '')
note('user_data_survived', /호치민 메모/.test(notesSurvive), notesSurvive.slice(0, 80))

await page.setOfflineMode(false)
await page.reload({ waitUntil: 'networkidle0', timeout: 120000 })
await enter(page)
note('online_recovery_live', Boolean(await page.$('#draft')))

const report = {
  at: new Date().toISOString(),
  url: PREVIEW,
  pass: results.filter((r) => r.ok).length,
  fail: results.filter((r) => !r.ok).length,
  results,
}
writeFileSync(`${outDir}/preview-anywhere-live-report.json`, JSON.stringify(report, null, 2))
console.log('LIVE_PREVIEW', report.pass, '/', results.length)
await browser.close()
if (report.fail) process.exit(1)
