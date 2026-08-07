/**
 * Headless UI shell audit — bottom tabs, More hub, home quick, nav hash views.
 * Serves local dist/ (build first). Writes findings + screenshots.
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts/ui-shell-audit'
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

async function dismiss(page) {
  await page.evaluate(() => {
    document.querySelector('[data-action="skip-location"]')?.click()
  })
  await sleep(400)
  await page.evaluate(() => {
    const labels = [/나중에/, /AI 없이/, /숨기기/, /닫기/, /확인/, /시작하기/, /건너뛰/, /오프라인으로 계속/]
    for (const re of labels) {
      ;[...document.querySelectorAll('button, [role="button"]')]
        .find((b) => re.test(b.textContent || ''))
        ?.click()
    }
  })
  await sleep(300)
}

async function shot(page, name) {
  mkdirSync(outDir, { recursive: true })
  const path = join(outDir, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  return path
}

async function goHash(page, hash) {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await sleep(800)
  await dismiss(page)
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('build first: npm run build')
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
  const base = `http://127.0.0.1:${port}`

  const chrome =
    process.env.CHROME_PATH ||
    ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p))

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  page.setDefaultTimeout(20000)

  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  try {
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 })
    await dismiss(page)
    await shot(page, '00-boot')

    // —— Bottom 5 tabs ——
    // Dismiss install hint that can obscure taps
    await page.evaluate(() => {
      ;[...document.querySelectorAll('button')].find((b) => /숨기기/.test(b.textContent || ''))?.click()
    })
    await sleep(300)

    const tabs = await page.evaluate(() =>
      [...document.querySelectorAll('nav.aizio-primary-nav button, [data-primary-nav] button')]
        .map((b) => ({
          label: (b.textContent || '').replace(/\s+/g, ' ').trim(),
          view: b.getAttribute('data-view') || b.getAttribute('data-primary-tab') || '',
          disabled: b.disabled,
        }))
        .filter((t) => t.label),
    )
    note(tabs.length >= 5, 'bottom-tabs-count', `found ${tabs.length}: ${tabs.map((t) => t.label).join(' | ')}`)
    const need = ['홈', '대화', '일정', '가족', '더보기']
    for (const label of need) {
      note(
        tabs.some((t) => t.label.includes(label)),
        `tab-${label}`,
        tabs.find((t) => t.label.includes(label))?.label || 'missing',
      )
    }

    async function tapTab(label) {
      const ok = await page.evaluate((lab) => {
        const btn = [...document.querySelectorAll('nav.aizio-primary-nav button, [data-primary-nav] button')].find(
          (b) => (b.textContent || '').includes(lab),
        )
        if (!btn) return false
        btn.click()
        return true
      }, label)
      await sleep(900)
      await dismiss(page)
      await page.evaluate(() => {
        ;[...document.querySelectorAll('button')].find((b) => /숨기기/.test(b.textContent || ''))?.click()
      })
      return ok
    }

    // Home
    await tapTab('홈')
    await shot(page, '01-home')
    const homeOk = await page.evaluate(
      () =>
        !!document.querySelector('[data-view="home"], .home-v2, .home-dashboard, #home') ||
        location.hash.includes('home') ||
        !!document.querySelector('[data-quick-id], [data-quick], .quick-actions'),
    )
    note(homeOk, 'home-renders', `hash=${await page.evaluate(() => location.hash)}`)

    const quickIds = await page.evaluate(() =>
      [...document.querySelectorAll('.home-v2-quick button[data-nav-quick], .nav-home-quick button[data-nav-quick]')]
        .map((el) => el.getAttribute('data-nav-quick') || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20))
        .filter(Boolean)
        .slice(0, 12),
    )
    note(
      quickIds.length >= 3 && quickIds.some((q) => q === 'navigate' || /길안내/i.test(String(q))),
      'home-quick-actions',
      quickIds.join(', ') || 'none',
    )

    // Chat
    await tapTab('대화')
    await shot(page, '02-chat')
    const chatOk = await page.evaluate(() => !!document.querySelector('#draft') && !!document.querySelector('#composer'))
    note(chatOk, 'chat-composer', chatOk ? 'draft+composer' : 'missing composer')

    // Clear chat button visible?
    const clearBtn = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      return btns.some((b) => /초기화|삭제|지우/.test(b.textContent || ''))
    })
    note(clearBtn, 'chat-clear-control', clearBtn ? 'found' : 'no clear control in chat header')

    // Schedule
    await tapTab('일정')
    await shot(page, '03-schedule')
    const schedOk = await page.evaluate(
      () =>
        /일정|할\s*일|오늘/.test(document.body.innerText) ||
        location.hash.includes('schedule') ||
        location.hash.includes('life'),
    )
    note(schedOk, 'schedule-hub', `hash=${await page.evaluate(() => location.hash)}`)

    // Family
    await tapTab('가족')
    await shot(page, '04-family')
    const famOk = await page.evaluate(
      () =>
        /가족|멤버|일정|준비물|예방접종/.test(document.body.innerText) ||
        location.hash.includes('family'),
    )
    note(famOk, 'family-helper', `hash=${await page.evaluate(() => location.hash)}`)

    // More
    await tapTab('더보기')
    await shot(page, '05-more')
    const moreOk = await page.evaluate(
      () =>
        !!document.querySelector('#more-query, [data-more-search], .more-hub, input[placeholder*="검색"]') ||
        /길안내|여행|맛집|설정|게임/.test(document.body.innerText),
    )
    note(moreOk, 'more-hub', `hash=${await page.evaluate(() => location.hash)}`)

    // More search → open secondary views
    const moreTargets = [
      { q: '길안내', hashHint: 'navigation', expect: /길|안내|검색|지도|목적지/ },
      { q: '설정', hashHint: 'settings', expect: /설정|이름|도시|AI|키|버전/ },
      { q: '게임', hashHint: 'games', expect: /게임|아케이드|벽돌|점수/ },
      { q: '여행', hashHint: 'travel', expect: /여행|비행|호텔|준비/ },
      { q: '맛집', hashHint: 'restaurant', expect: /맛집|식당|예약|검색/ },
    ]

    for (const t of moreTargets) {
      await tapTab('더보기')
      await sleep(400)
      const typed = await page.evaluate((q) => {
        const input =
          document.querySelector('#more-query') ||
          document.querySelector('[data-more-search]') ||
          document.querySelector('.more-hub input') ||
          [...document.querySelectorAll('input')].find((i) => /검색|찾기|기능/.test(i.placeholder || ''))
        if (!input) return false
        input.focus()
        input.value = q
        input.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      }, t.q)
      await sleep(500)
      if (!typed) {
        // fallback: hash navigate
        await goHash(page, `#${t.hashHint}`)
      } else {
        const clicked = await page.evaluate((q) => {
          const items = [...document.querySelectorAll('button, a, [data-feature], [data-view], li')]
          const hit = items.find((el) => (el.textContent || '').includes(q) && el.offsetParent !== null)
          if (hit) {
            hit.click()
            return true
          }
          return false
        }, t.q)
        if (!clicked) await goHash(page, `#${t.hashHint}`)
      }
      await sleep(1000)
      await dismiss(page)
      await shot(page, `06-more-${t.hashHint}`)
      const body = await page.evaluate(() => document.body.innerText.slice(0, 800))
      const hash = await page.evaluate(() => location.hash)
      note(t.expect.test(body) || hash.includes(t.hashHint), `view-${t.hashHint}`, `hash=${hash} body≈${body.slice(0, 80).replace(/\n/g, ' ')}`)
    }

    // Navigation map canvas presence
    await goHash(page, '#navigation')
    await sleep(1500)
    await shot(page, '07-navigation')
    const navMap = await page.evaluate(() => {
      const map = document.querySelector('#navv2-map, .maplibre-map, .maplibregl-map, canvas.maplibregl-canvas')
      const search = document.querySelector('#navv2-search, input[placeholder*="장소"], input[placeholder*="검색"]')
      return {
        map: !!map,
        canvas: !!document.querySelector('canvas'),
        search: !!search,
        text: document.body.innerText.slice(0, 200),
      }
    })
    note(navMap.map || navMap.canvas || /길|안내|검색/.test(navMap.text), 'nav-map-shell', JSON.stringify(navMap))

    // Remount: leave nav → return
    await tapTab('홈')
    await sleep(600)
    await goHash(page, '#navigation')
    await sleep(1500)
    const navMap2 = await page.evaluate(() => !!document.querySelector('#navv2-map, canvas.maplibregl-canvas, canvas'))
    note(navMap2, 'nav-map-remount', navMap2 ? 'map/canvas after remount' : 'NO map after leave/return')
    await shot(page, '08-nav-remount')

    // Friends via hash
    await goHash(page, '#friends')
    await sleep(800)
    await shot(page, '09-friends')
    const friendsOk = await page.evaluate(
      () => /친구|초대|공간|멤버/.test(document.body.innerText) || location.hash.includes('friends'),
    )
    note(friendsOk, 'friends-view', `hash=${await page.evaluate(() => location.hash)}`)

    // Settings version visible
    await goHash(page, '#settings')
    await sleep(800)
    await shot(page, '10-settings')
    const ver = await page.evaluate(() => {
      const m = document.body.innerText.match(/v?\d+\.\d+\.\d+/)
      return m?.[0] || ''
    })
    note(/1\.30\./.test(ver), 'settings-version', ver || 'no version found')

    // Fatal page errors (filter noise)
    const fatal = consoleErrors.filter(
      (e) =>
        !/favicon|ResizeObserver|Failed to load resource|net::ERR|CORS policy|blocked by CORS|Access-Control/i.test(
          e,
        ),
    )
    note(fatal.length === 0, 'no-pageerror', fatal.slice(0, 5).join(' || ') || 'clean')
  } finally {
    await browser.close()
    server.close()
  }

  const report = { at: new Date().toISOString(), findings, outDir }
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2))
  const fails = findings.filter((f) => !f.ok)
  console.log('\n=== UI SHELL AUDIT ===')
  console.log(`PASS ${findings.length - fails.length} / FAIL ${fails.length}`)
  if (fails.length) {
    for (const f of fails) console.log(' -', f.id, f.detail)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
