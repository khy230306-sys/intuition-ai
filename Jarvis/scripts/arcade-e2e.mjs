/**
 * Arcade smoke: open games tab and switch through all titles.
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
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'bin' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => server.listen(4182, '127.0.0.1', () => r()))

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

  await page.goto('http://127.0.0.1:4182/', { waitUntil: 'networkidle0' })
  await page.click('[data-view="games"]')
  await page.waitForSelector('[data-action="open-classic-arcade"]')
  await page.click('[data-action="open-classic-arcade"]')
  await page.waitForSelector('#arcade-canvas')
  await page.waitForSelector('[data-arcade-rank="1"]')
  await page.waitForSelector('[data-action="share-arcade-score"]')
  await page.waitForSelector('[data-action="open-arcade-import"]')

  // Seed a best so share modal can open
  await page.evaluate(() => {
    localStorage.setItem(
      'jarvis.arcade.best.v1',
      JSON.stringify({ breakout: 12, shooter: null, flappy: null, slide: null, gyeokpa: null, dash: null }),
    )
    localStorage.setItem(
      'jarvis.arcade.bestLevel.v1',
      JSON.stringify({ breakout: 2, shooter: null, flappy: null, slide: null, gyeokpa: null, dash: null }),
    )
  })
  await page.click('[data-arcade="breakout"]')
  await page.click('[data-action="share-arcade-score"]')
  await page.waitForSelector('.share-modal')
  await page.waitForSelector('[data-action="copy-arcade-score"]')
  await page.click('[data-action="close-share"]')

  await page.click('[data-action="open-arcade-import"]')
  await page.waitForSelector('#arcade-import-form')
  const friendCode =
    'AIZIO-ARCADE|v1|breakout|99|6|친구테스트|friend-e2e|1700000000000'
  await page.$eval('#arcade-import-form textarea', (el, code) => {
    el.value = code
  }, friendCode)
  await page.click('#arcade-import-form button[type="submit"]')
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('.arcade-rank-row')]
    return rows.some((r) => (r.textContent || '').includes('친구테스트'))
  })

  // Real Kakao-style share body (full message, not bare pipe) — previously failed
  await page.click('[data-action="open-arcade-import"]')
  await page.waitForSelector('#arcade-import-form')
  const kakaoBody = `AIZIO 아케이드 기록 · 플래피
나 · Lv.6 · SCORE 25

친구 기기 게임 탭 → 친구 기록 받기 에 붙여넣기
AIZIO-ARCADE|v1|flappy|25|6|나|ef4cd28c-e755-43fd-8568-0dcf771d4ef7|1785390605583`
  await page.$eval(
    '#arcade-import-form textarea',
    (el, code) => {
      el.value = code
    },
    kakaoBody,
  )
  await page.click('#arcade-import-form button[type="submit"]')
  await page.waitForFunction(() => {
    const active = document.querySelector('.game-tab.active')?.getAttribute('data-arcade')
    const rows = [...document.querySelectorAll('.arcade-rank-row')]
    return (
      active === 'flappy' &&
      rows.some((r) => (r.textContent || '').includes('Lv.6') && (r.textContent || '').includes('25'))
    )
  })

  // Space shooter tab shows missile-evolve hint
  await page.click('[data-arcade="shooter"]')
  await page.waitForFunction(
    () => document.querySelector('.game-tab.active')?.getAttribute('data-arcade') === 'shooter',
  )
  await page.waitForFunction(() => (document.body.textContent || '').includes('미사일 진화'))

  const ids = ['breakout', 'shooter', 'flappy', 'slide', 'gyeokpa', 'dash']
  for (const id of ids) {
    await page.click(`[data-arcade="${id}"]`)
    await page.waitForFunction(
      (want) => document.querySelector(`.game-tab.active`)?.getAttribute('data-arcade') === want,
      {},
      id,
    )
    await page.waitForSelector('#arcade-canvas')
    // tap once to exercise pointer path
    const box = await page.$('#arcade-canvas')
    const rect = await box.boundingBox()
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await new Promise((r) => setTimeout(r, 120))
  }

  const titles = await page.$$eval('.game-tab', (els) => els.map((e) => e.textContent || ''))
  if (titles.length !== 8) throw new Error(`expected 8 games, got ${titles.join(',')}`)
  if (!titles.some((t) => t.includes('스윽'))) throw new Error('slide (스윽) missing from tabs')
  if (!titles.some((t) => t.includes('스페이스2'))) throw new Error('gyeokpa (스페이스2) missing from tabs')
  if (!titles.some((t) => t.includes('지오대시'))) throw new Error('dash (지오대시) missing from tabs')
  if (titles.some((t) => t.includes('스네이크'))) throw new Error('snake should be removed')
  for (const goneTitle of ['과일받기', '두더지', '차피하기']) {
    if (titles.some((t) => t.includes(goneTitle))) throw new Error(`removed game still present: ${goneTitle}`)
  }
  const idsOnPage = await page.$$eval('.game-tab', (els) => els.map((e) => e.getAttribute('data-arcade')))
  for (const gone of ['catch', 'mole', 'lanes', 'zigzag', 'stack', 'taprush']) {
    if (idsOnPage.includes(gone)) throw new Error(`old game still present: ${gone}`)
  }
  if (errors.length) throw new Error(errors.join(' | '))
  console.log('ARCADE_E2E_OK', titles.join(','))
  await browser.close()
  server.close()
}

main().catch((err) => {
  console.error('ARCADE_E2E_FAIL', err)
  process.exit(1)
})
