/**
 * Headless probe of AIZIO Navigation v2 — chat + UI flows.
 * Prints structured findings (PASS/FAIL) and writes screenshots.
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts/nav-live-probe'
const findings = []

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function note(ok, id, detail) {
  findings.push({ ok, id, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}: ${detail}`)
}

async function skipLocation(page) {
  await page.waitForSelector('#app', { timeout: 20000 })
  const skip = await page.$('[data-action="skip-location"]')
  if (skip) {
    await skip.click()
    await page.waitForFunction(() => !document.querySelector('.location-gate'), { timeout: 10000 }).catch(() => {})
  }
  await page.evaluate(() => {
    for (const re of [/숨기기/, /나중에/, /AI 없이/, /오프라인으로 계속/, /건너뛰/]) {
      ;[...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''))?.click()
    }
  })
  await sleep(300)
}

async function shot(page, name) {
  mkdirSync(outDir, { recursive: true })
  const path = join(outDir, name)
  await page.screenshot({ path, fullPage: false })
  return path
}

async function ensureChat(page) {
  await page.evaluate(() => {
    location.hash = '#chat'
    document.querySelector('nav.aizio-primary-nav button[data-view="chat"]')?.click()
  })
  await sleep(600)
  await skipLocation(page)
  await page.waitForSelector('#draft', { timeout: 15000 })
}

async function sendChat(page, text) {
  if (!(await page.$('#draft'))) await ensureChat(page)
  await page.waitForSelector('#draft', { timeout: 10000 })
  await page.click('#draft', { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.keyboard.type(text, { delay: 25 })
  const send = (await page.$('.send-btn, button[type="submit"]')) || null
  if (send) await send.click()
  else await page.keyboard.press('Enter')
  await sleep(4000)
}

async function lastAssistantText(page) {
  return page.evaluate(() => {
    const msgs = [
      ...document.querySelectorAll(
        '.msg-bubble.assistant, .msg.assistant, .bubble.assistant, [data-role="assistant"]',
      ),
    ]
    const last = msgs[msgs.length - 1]
    return (last?.textContent || '').trim()
  })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('build first')
  mkdirSync(outDir, { recursive: true })

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
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}/`

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  })

  const pageErrors = []
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true })
    // Fake Seoul GPS
    const client = await page.createCDPSession()
    await client.send('Emulation.setGeolocationOverride', {
      latitude: 37.501,
      longitude: 127.039,
      accuracy: 20,
    })
    await page.evaluateOnNewDocument(() => {
      const fix = { coords: { latitude: 37.501, longitude: 127.039, accuracy: 20 }, timestamp: Date.now() }
      navigator.geolocation.getCurrentPosition = (ok) => ok(fix)
      navigator.geolocation.watchPosition = (ok) => {
        ok(fix)
        return 1
      }
      navigator.permissions = {
        query: async () => ({ state: 'granted', onchange: null }),
      }
    })
    page.on('pageerror', (e) => pageErrors.push(String(e.message || e)))
    page.on('console', (m) => {
      if (m.type() === 'error') pageErrors.push(`console: ${m.text()}`)
    })

    // —— 1) HOME quick → nav screen ——
    await page.goto(`${base}?home=v2`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.waitForSelector('.home-v2-quick, .nav-home-quick, nav.aizio-primary-nav', { timeout: 20000 })

    let navQuick = await page.$('[data-nav-quick="navigate"], [data-quick-id="navigate"]')
    if (!navQuick) {
      // Wait one paint — install/location overlays can delay quick row
      await sleep(800)
      await skipLocation(page)
      navQuick = await page.$('[data-nav-quick="navigate"], [data-quick-id="navigate"]')
    }
    note(!!navQuick, 'home-nav-quick', navQuick ? '길안내 quick present' : 'missing 길안내 quick')
    if (navQuick) {
      await navQuick.click()
      await sleep(1500)
    } else {
      await page.evaluate(() => {
        location.hash = '#navigation'
      })
      await sleep(1200)
      await skipLocation(page)
    }
    {
      const onNav = await page.$('[data-navv2="1"], #navv2-map, #navv2-q')
      note(!!onNav, 'open-nav-from-home', onNav ? 'nav screen opened' : 'nav screen missing')
      await shot(page, '01-nav-from-home.png')
    }

    // —— 2) Search 역삼동 on UI ——
    if (!(await page.$('#navv2-q'))) {
      await page.evaluate(() => {
        location.hash = '#navigation'
      })
      await sleep(1200)
      await skipLocation(page)
    }
    if (await page.$('#navv2-q')) {
      await page.click('#navv2-q', { clickCount: 3 })
      await page.keyboard.type('역삼동', { delay: 30 })
      await page.keyboard.press('Enter')
      await sleep(3000)
      const picks = await page.$$('[data-navv2-pick]')
      note(picks.length > 0, 'ui-search-yeoksam', `${picks.length} candidates`)
      await shot(page, '02-ui-search.png')
      if (picks[0]) {
        await picks[0].click()
        await sleep(800)
        const routeBtn = await page.$('[data-navv2-action="route"]')
        note(!!routeBtn, 'ui-place-detail-route-btn', routeBtn ? 'route button present' : 'no route button after pick')
        await shot(page, '03-place-detail.png')
        if (routeBtn) {
          await routeBtn.click()
          await sleep(2500)
          const start = await page.$('[data-navv2-action="start"]')
          note(!!start, 'ui-route-preview', start ? 'start guidance available' : 'no start after route')
          await shot(page, '04-route-preview.png')
          if (start) {
            await start.click()
            await sleep(1500)
            const guiding = await page.evaluate(() => {
              const t = document.body.innerText
              return /안내|다음|미터|m |목적지/.test(t)
            })
            note(guiding, 'ui-guidance-start', guiding ? 'guiding UI text present' : 'guiding UI unclear')
            await shot(page, '05-guiding.png')
          }
        }
      }
    } else {
      note(false, 'ui-search-box', 'missing #navv2-q')
    }

    // —— 3) Chat flow: 길안내 → place → select → start ——
    await page.goto(`${base}?home=v2#chat`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.removeItem('jarvis_chat_v1')
    })
    await page.reload({ waitUntil: 'networkidle0' })
    await skipLocation(page)

    // Ensure chat view via primary nav + hash
    await page.evaluate(() => {
      location.hash = '#chat'
      const btn =
        document.querySelector('nav.aizio-primary-nav button[data-view="chat"]') ||
        document.querySelector('[data-view="chat"]') ||
        document.querySelector('[data-action="home-v2-nav-chat"]')
      btn?.click?.()
    })
    await sleep(1000)
    await skipLocation(page)
    await page.waitForSelector('#draft', { timeout: 15000 }).catch(() => {})

    if (!(await page.$('#draft'))) {
      note(false, 'chat-composer', 'composer for chat nav test')
    }

    if (await page.$('#draft')) {
      // Direct place ask — bare 「길안내」 may switch to the nav screen and unmount #draft
      await sendChat(page, '역삼동으로 안내해줘')
      let reply = await lastAssistantText(page)
      // If view switched to navigation, reopen chat to read the last bubble
      if (!reply) {
        await ensureChat(page)
        reply = await lastAssistantText(page)
      }
      const hasCandidates = /역삼|장소|후보|1\.|번|안내|검색/.test(reply)
      note(hasCandidates, 'chat-place-search', reply.slice(0, 160) || '(empty)')
      await shot(page, '07-chat-yeoksam.png')

      // Cards?
      const cards = await page.$$('[data-nav-card], [data-action="navv2-pick"], .nav-place-card, [data-navv2-chat-pick]')
      note(true, 'chat-cards-count', `${cards.length} place cards in DOM`)

      await ensureChat(page)
      await sendChat(page, '1번')
      reply = await lastAssistantText(page)
      if (!reply) {
        await ensureChat(page)
        reply = await lastAssistantText(page)
      }
      note(/선택|안내|자동차|걸어서|지도|경로/.test(reply), 'chat-select-1', reply.slice(0, 160) || '(empty)')
      await shot(page, '08-chat-select.png')

      await ensureChat(page)
      await sendChat(page, '자동차로')
      reply = await lastAssistantText(page)
      if (!reply) {
        await ensureChat(page)
        reply = await lastAssistantText(page)
      }
      const routed = /경로|거리|안내 시작|지도|안내/.test(reply)
      note(routed, 'chat-route-driving', reply.slice(0, 160) || '(empty)')
      await shot(page, '09-chat-route.png')

      // Did nav open?
      await sleep(1000)
      const navOpen = !!(await page.$('[data-navv2="1"]'))
      note(navOpen, 'chat-route-opens-nav', navOpen ? 'navigation view opened' : 'still on chat (may be OK if openNav false until start)')

      await sendChat(page, '안내 시작')
      reply = await lastAssistantText(page)
      note(/안내|경로|따라|미터|m/.test(reply) || !!(await page.$('[data-navv2="1"]')), 'chat-start-guidance', reply.slice(0, 160) || 'nav ui')
      await shot(page, '10-chat-start.png')

      // Bare place without 안내
      await page.evaluate(() => sessionStorage.clear())
      await sendChat(page, '강남역 길찾기')
      reply = await lastAssistantText(page)
      note(/강남|장소|후보|검색|결과|지도/.test(reply), 'chat-gilchatgi', reply.slice(0, 160) || '(empty)')
      await shot(page, '11-chat-gilchatgi.png')

      // Nearby
      await sendChat(page, '근처 약국')
      reply = await lastAssistantText(page)
      note(/약국|장소|후보|찾|지도|카카오/.test(reply), 'chat-nearby-pharmacy', reply.slice(0, 160) || '(empty)')
      await shot(page, '12-chat-pharmacy.png')

      // Empty result
      await sendChat(page, 'zzz존재하지않는장소xyz로 안내해줘')
      reply = await lastAssistantText(page)
      note(/못|없|찾아|카카오|T맵|검색어/.test(reply), 'chat-no-results', reply.slice(0, 160) || '(empty)')
      await shot(page, '13-chat-no-results.png')
    }

    // —— 4) Hash deep link ——
    await page.goto(`${base}#navigation?q=${encodeURIComponent('덕신 소공원')}`, { waitUntil: 'networkidle0' })
    await skipLocation(page)
    await sleep(2500)
    const deepNav = await page.$('[data-navv2="1"]')
    note(!!deepNav, 'hash-deep-link', deepNav ? 'opened via #navigation?q=' : 'deep link failed')
    await shot(page, '14-deep-link.png')

    // Map canvas present?
    const mapEl = await page.$('.maplibregl-canvas, #navv2-map, [data-navv2-map]')
    note(!!mapEl, 'map-canvas', mapEl ? 'map element present' : 'map canvas missing')

    writeFileSync(join(outDir, 'findings.json'), JSON.stringify({ findings, pageErrors: pageErrors.slice(0, 40) }, null, 2))
    console.log('\n=== SUMMARY ===')
    console.log(`PASS ${findings.filter((f) => f.ok).length} / FAIL ${findings.filter((f) => !f.ok).length}`)
    if (pageErrors.length) {
      console.log('PAGE ERRORS:')
      for (const e of pageErrors.slice(0, 15)) console.log(' -', e)
    }
  } finally {
    await browser.close()
    server.close()
  }

  const fails = findings.filter((f) => !f.ok)
  if (fails.length) process.exitCode = 2
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
