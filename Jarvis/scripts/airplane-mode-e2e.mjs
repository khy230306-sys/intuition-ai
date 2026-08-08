/**
 * Airplane-mode / offline-first shell test.
 * Uses Puppeteer setOfflineMode (real browser network offline — not only navigator mock).
 *
 * Flow: online load → SW ready → go offline → reload → full AIZIO UI must open.
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

async function dismiss(page) {
  await page.evaluate(() => {
    for (const re of [/나중에/, /AI 없이 기본 기능/, /숨기기/, /닫기/]) {
      ;[...document.querySelectorAll('button')]
        .find((b) => re.test(b.textContent || ''))
        ?.click()
    }
  })
  await new Promise((r) => setTimeout(r, 150))
}

async function enterApp(page) {
  for (let i = 0; i < 8; i++) {
    const skip = await page.$('[data-action="skip-location"]')
    if (skip) {
      await skip.click()
      await new Promise((r) => setTimeout(r, 200))
    } else break
  }
  await dismiss(page)
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist missing — build first')

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
  await new Promise((r) => server.listen(4220, '127.0.0.1', r))
  const base = 'http://127.0.0.1:4220/'

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions'],
    userDataDir: `/tmp/aizio-airplane-${Date.now()}`,
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem(
      'jarvis.geo.last.v1',
      JSON.stringify({ lat: 35.5384, lon: 129.3114, accuracy: 12, at: Date.now() }),
    )
    localStorage.setItem(
      'aizio_family_helper_v1',
      JSON.stringify({
        schedules: [
          {
            id: 's1',
            title: '오프라인 병원',
            date: '2099-01-02',
            time: '10:00',
            done: false,
          },
        ],
        members: [],
        tasks: [],
      }),
    )
  })

  // 1) Online install + SW
  await page.goto(base + '?source=pwa', { waitUntil: 'networkidle0', timeout: 90000 })
  await enterApp(page)
  const onlineTitle = await page.title()
  note('online_boot', /AIZIO/.test(onlineTitle), onlineTitle)

  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no-sw-api' }
    try {
      const reg = await navigator.serviceWorker.ready
      // warm shell
      await new Promise((r) => setTimeout(r, 1500))
      const keys = await caches.keys()
      let hasIndex = false
      for (const k of keys) {
        const c = await caches.open(k)
        if (await c.match('index.html', { ignoreSearch: true })) hasIndex = true
        if (await c.match('./index.html', { ignoreSearch: true })) hasIndex = true
        if (await c.match(new URL('index.html', location.origin).href, { ignoreSearch: true }))
          hasIndex = true
      }
      return {
        ok: Boolean(reg) && hasIndex,
        controlled: Boolean(navigator.serviceWorker.controller),
        caches: keys.length,
        hasIndex,
      }
    } catch (e) {
      return { ok: false, reason: String(e) }
    }
  })
  note('sw_precache_ready', swReady.ok, JSON.stringify(swReady))

  // Seed chat schedule via local storage already done; verify UI
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 15000 })
  note('online_chat', Boolean(await page.$('#draft')))

  // 2) Airplane: cut network completely
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  // Must open real app — not a blank error and not stuck forever on location gate
  await page
    .waitForFunction(
      () =>
        Boolean(document.querySelector('#draft')) ||
        Boolean(document.querySelector('[data-action="skip-location"]')) ||
        /AIZIO/.test(document.body?.innerText || ''),
      { timeout: 25000 },
    )
    .catch(() => null)

  // Offline boot should auto-enter when geo was granted previously
  for (let i = 0; i < 5; i++) {
    if (await page.$('#draft')) break
    const skip = await page.$('[data-action="skip-location"]')
    if (skip) await skip.click()
    await new Promise((r) => setTimeout(r, 200))
  }
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  let offlineChat = false
  try {
    await page.waitForSelector('#draft', { timeout: 15000 })
    offlineChat = true
  } catch {
    offlineChat = false
  }
  const offlineBody = await page.evaluate(() => ({
    title: document.title,
    hasDraft: Boolean(document.getElementById('draft')),
    hasGate: Boolean(document.querySelector('.location-gate')),
    badge: document.querySelector('[data-net-badge="1"]')?.textContent || '',
    strip: document.querySelector('[data-offline-strip="1"] strong')?.textContent || '',
    text: (document.body?.innerText || '').slice(0, 400),
  }))
  note(
    'offline_cold_boot_ui',
    offlineChat && /AIZIO/.test(offlineBody.title),
    JSON.stringify(offlineBody),
  )

  // Routes offline
  for (const hash of ['#home', '#chat', '#more']) {
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    await new Promise((r) => setTimeout(r, 350))
    const ok = await page.evaluate(() => Boolean(document.body?.innerText))
    note(`offline_route_${hash.slice(1)}`, ok)
  }

  // Local schedule via chat
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 15000 }).catch(() => null)
  if (await page.$('#draft')) {
    await page.evaluate(() => {
      const d = document.getElementById('draft')
      if (d) d.disabled = false
    })
    const before = await page.evaluate(
      () => document.querySelectorAll('.msg-bubble.assistant').length,
    )
    await page.evaluate(() => {
      const input = document.getElementById('draft')
      const form = document.getElementById('composer')
      input.value = '내 일정 보여줘'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      form.requestSubmit()
    })
    await page
      .waitForFunction(
        (n) => document.querySelectorAll('.msg-bubble.assistant').length > n,
        { timeout: 12000 },
        before,
      )
      .catch(() => null)
    const reply = await page.evaluate(() => {
      const msgs = [...document.querySelectorAll('.msg-bubble.assistant')]
      return (msgs[msgs.length - 1]?.textContent || '').trim()
    })
    note('offline_local_calendar', /일정|병원|등록|없어요/.test(reply), reply.slice(0, 160))

    // Weather must explain offline — not invent forecast
    const before2 = await page.evaluate(
      () => document.querySelectorAll('.msg-bubble.assistant').length,
    )
    await page.evaluate(() => {
      const input = document.getElementById('draft')
      const form = document.getElementById('composer')
      input.disabled = false
      input.value = '내일 울산 날씨 알려줘'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      form.requestSubmit()
    })
    await page
      .waitForFunction(
        (n) => document.querySelectorAll('.msg-bubble.assistant').length > n,
        { timeout: 12000 },
        before2,
      )
      .catch(() => null)
    const weather = await page.evaluate(() => {
      const msgs = [...document.querySelectorAll('.msg-bubble.assistant')]
      return (msgs[msgs.length - 1]?.textContent || '').trim()
    })
    note(
      'offline_weather_honest',
      /인터넷|오프라인|연결/.test(weather) && !/기온\s*\d/.test(weather),
      weather.slice(0, 160),
    )

    // My location button
    const locBtn = await page.$('[data-action="my-location"]')
    note('my_location_button_present', Boolean(locBtn))
    if (locBtn) {
      const before3 = await page.evaluate(
        () => document.querySelectorAll('.msg-bubble.assistant').length,
      )
      await locBtn.click()
      await page
        .waitForFunction(
          (n) => document.querySelectorAll('.msg-bubble.assistant').length > n,
          { timeout: 12000 },
          before3,
        )
        .catch(() => null)
      const locReply = await page.evaluate(() => {
        const msgs = [...document.querySelectorAll('.msg-bubble.assistant')]
        return (msgs[msgs.length - 1]?.textContent || '').trim()
      })
      note('my_location_works_offline', /위치|좌표|35\.|권한/.test(locReply), locReply.slice(0, 160))
    }
  } else {
    note('offline_local_calendar', false, 'no composer')
    note('offline_weather_honest', false, 'no composer')
    note('my_location_button_present', false, 'no composer')
  }

  // Multiple offline reloads
  for (let i = 0; i < 3; i++) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.evaluate(() => {
      location.hash = '#chat'
    })
    for (let j = 0; j < 4; j++) {
      if (await page.$('#draft')) break
      const skip = await page.$('[data-action="skip-location"]')
      if (skip) await skip.click()
      await new Promise((r) => setTimeout(r, 150))
    }
    const ok = Boolean(await page.$('#draft'))
    note(`offline_relaunch_${i + 1}`, ok)
  }

  // 3) Recovery online
  await page.setOfflineMode(false)
  await page.reload({ waitUntil: 'networkidle0', timeout: 90000 })
  await enterApp(page)
  const recovered = Boolean(await page.$('#draft'))
  note('online_recovery', recovered)

  const report = {
    at: new Date().toISOString(),
    pass: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
    results,
  }
  writeFileSync(join(outDir, 'airplane-mode-e2e-report.json'), JSON.stringify(report, null, 2))
  console.log('WROTE airplane-mode-e2e-report.json', report.pass, '/', results.length)
  await browser.close()
  server.close()
  if (report.fail) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
