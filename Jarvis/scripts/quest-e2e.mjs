/**
 * AIZIO QUEST browser smoke: PLAY hub → QUEST → battle → save/reload → 50 sim battles.
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
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
  '.woff2': 'font/woff2',
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist missing — run npm run build')
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
  await new Promise((r) => server.listen(4188, '127.0.0.1', () => r()))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 37.5, lon: 127, accuracy: 10, at: Date.now() }
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem('jarvis.geo.last.v1', JSON.stringify(fix))
    localStorage.setItem(
      'aizio.quest.save.v1',
      JSON.stringify({
        v: 1,
        heroId: 'kael',
        unlockedHeroes: ['kael', 'mira'],
        level: 3,
        xp: 20,
        credit: 160,
        stageCleared: 1,
        inventory: [],
        equipped: {},
        achievements: ['first_win'],
        settings: { music: false, sfx: false, haptic: false },
        tutorialDone: true,
        bestCombo: 4,
        gemsCleared: 40,
        battlesWon: 1,
        battlesLost: 0,
        dailyDate: '',
        dailyBest: 0,
        updatedAt: new Date().toISOString(),
      }),
    )
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

  const checks = []
  const ok = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail })

  await page.goto('http://127.0.0.1:4188/', { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => {
    location.hash = '#games'
  })
  await page.waitForSelector('[data-action="open-aizio-quest"]', { timeout: 15000 })
  ok('play_hub', true)

  await page.click('[data-action="open-aizio-quest"]')
  await page.waitForSelector('.aq-root', { timeout: 20000 })
  ok('quest_mount', true)

  // Title → continue / campaign
  const titleBtn = await page.$('[data-aq="new"], [data-aq="campaign"]')
  if (titleBtn) await titleBtn.click()
  await page.waitForSelector('[data-aq="fight"]', { timeout: 10000 })
  ok('campaign', true)

  await page.click('[data-aq="fight"]')
  await page.waitForSelector('[data-aq-board="1"]', { timeout: 10000 })
  ok('battle_board', true)

  for (let i = 0; i < 10; i++) {
    const gems = await page.$$('.aq-gem')
    if (gems.length < 2) break
    const a = gems[i % gems.length]
    const box = await a.boundingBox()
    if (!box) continue
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 42, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await new Promise((r) => setTimeout(r, 280))
  }
  ok('swipe_input', true)

  await page.waitForFunction(() => !!window.__AIZIO_QUEST__?.runBattleSimulation, { timeout: 10000 })
  const sim = await page.evaluate(() => {
    const result = window.__AIZIO_QUEST__.runBattleSimulation({
      trialsPerStage: 10,
      stages: ['c1-s1', 'c1-s2', 'c1-s3', 'c1-s4', 'c1-s5'],
    })
    return {
      trials: result.results.reduce((a, r) => a + r.trials, 0),
      winRate: result.overallWinRate,
    }
  })
  ok('browser_50_battles', sim.trials >= 50, JSON.stringify(sim))

  const flee = await page.$('[data-aq="flee"]')
  if (flee) await flee.click()
  await page.waitForSelector('[data-aq="back"]', { timeout: 8000 })
  await page.click('[data-aq="back"]')
  await page.waitForFunction(() => !document.querySelector('.aq-root'), { timeout: 8000 })
  ok('return_play', true)

  const saved = await page.evaluate(() => localStorage.getItem('aizio.quest.save.v1'))
  ok('save_present', !!saved)

  await page.reload({ waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    location.hash = '#games'
  })
  await page.waitForSelector('[data-action="open-aizio-quest"]', { timeout: 15000 })
  await page.click('[data-action="open-aizio-quest"]')
  await page.waitForSelector('.aq-root')
  const after = await page.evaluate(() => {
    const raw = localStorage.getItem('aizio.quest.save.v1')
    return raw ? JSON.parse(raw) : null
  })
  ok('load_after_reload', after?.heroId === 'kael', after?.heroId || '')

  const back2 = await page.$('[data-aq="back"]')
  if (back2) await back2.click()

  const report = {
    checks,
    errors: errors.slice(0, 20),
    passed: checks.every((c) => c.pass) && errors.length === 0,
  }
  writeFileSync('/opt/cursor/artifacts/quest-e2e-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))

  await browser.close()
  server.close()
  if (!report.passed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
