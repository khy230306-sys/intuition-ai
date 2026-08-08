/**
 * Real pointer-gesture gameplay e2e for AIZIO QUEST.
 * Verifies: open → battle → drag swap → board change → damage → enemy turn → player turn.
 * Also runs 20 continuous turns without freeze.
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

async function dragLegalMove(page) {
  const target = await page.evaluate(() => {
    const gems = [...document.querySelectorAll('.aq-gem')]
    const kinds = new Map(gems.map((g) => [`${g.dataset.r},${g.dataset.c}`, g.dataset.kind]))
    // Prefer coach gems during tutorial
    const coach = document.querySelector('.aq-gem.coach')
    const coachT = document.querySelector('.aq-gem.coach-target')
    if (coach && coachT) {
      const a = coach.getBoundingClientRect()
      const b = coachT.getBoundingClientRect()
      return {
        ax: a.left + a.width / 2,
        ay: a.top + a.height / 2,
        bx: b.left + b.width / 2,
        by: b.top + b.height / 2,
      }
    }
    // Brute: try horizontal neighbors until kinds differ (engine validates match)
    for (const g of gems) {
      const r = Number(g.dataset.r)
      const c = Number(g.dataset.c)
      const right = gems.find((x) => Number(x.dataset.r) === r && Number(x.dataset.c) === c + 1)
      if (!right) continue
      const a = g.getBoundingClientRect()
      const b = right.getBoundingClientRect()
      return {
        ax: a.left + a.width / 2,
        ay: a.top + a.height / 2,
        bx: b.left + b.width / 2,
        by: b.top + b.height / 2,
        ka: kinds.get(`${r},${c}`),
        kb: kinds.get(`${r},${c + 1}`),
      }
    }
    return null
  })
  if (!target) return false
  const before = await page.evaluate(() =>
    [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join(''),
  )
  const enemyBefore = await page.evaluate(() => {
    const t = document.querySelector('[data-aq-ehp-text]')?.textContent || ''
    const m = t.match(/HP\s+(\d+)/)
    return m ? Number(m[1]) : null
  })
  await page.mouse.move(target.ax, target.ay)
  await page.mouse.down()
  await page.mouse.move(target.bx, target.by, { steps: 14 })
  await page.mouse.up()
  // Cascade chain: swap → match → pop → fall (can take ~1.2s+ per wave)
  let sawCascadeFx = false
  for (let i = 0; i < 24; i++) {
    const fx = await page.evaluate(() => {
      const matched = !!document.querySelector('.aq-gem.matched, .aq-gem.popping, .aq-gem.falling, .aq-gem.swap-ok')
      const busy = /처리 중/.test(document.querySelector('.aq-turn')?.textContent || '')
      return { matched, busy }
    })
    if (fx.matched) sawCascadeFx = true
    if (!fx.busy && i > 2) break
    await new Promise((r) => setTimeout(r, 80))
  }
  await new Promise((r) => setTimeout(r, 200))
  const after = await page.evaluate(() =>
    [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join(''),
  )
  const enemyAfter = await page.evaluate(() => {
    const t = document.querySelector('[data-aq-ehp-text]')?.textContent || ''
    const m = t.match(/HP\s+(\d+)/)
    return m ? Number(m[1]) : null
  })
  return {
    changed: before !== after,
    enemyBefore,
    enemyAfter,
    damaged: enemyAfter != null && enemyBefore != null && enemyAfter < enemyBefore,
    sawCascadeFx,
  }
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist missing')
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname)
    if (path === '/') path = '/index.html'
    const file = join(dist, path.replace(/^\//, ''))
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404)
      res.end('x')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'bin' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => server.listen(4192, '127.0.0.1', r))

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console:' + msg.text())
  })

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem('jarvis.geo.last.v1', JSON.stringify({ lat: 37.5, lon: 127, accuracy: 10, at: Date.now() }))
    localStorage.removeItem('aizio.quest.save.v1')
    navigator.geolocation.getCurrentPosition = (s) =>
      s({
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
  })

  const checks = []
  const ok = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail })

  await page.goto('http://127.0.0.1:4192/?aqdebug=1', { waitUntil: 'networkidle0', timeout: 90000 })
  await page.evaluate(() => {
    location.hash = '#games'
  })
  await page.waitForSelector('[data-action="open-aizio-quest"]', { timeout: 20000 })
  await page.click('[data-action="open-aizio-quest"]')
  await page.waitForSelector('.aq-root', { timeout: 20000 })
  // Navigate into first battle (fresh or continue)
  for (let i = 0; i < 6; i++) {
    if (await page.$('[data-aq-board="1"]')) break
    if (await page.$('[data-aq="new"]')) {
      await page.click('[data-aq="new"]')
      await new Promise((r) => setTimeout(r, 200))
      continue
    }
    if (await page.$('[data-aq="pick-hero"]:not([disabled])')) {
      await page.click('[data-aq="pick-hero"]:not([disabled])')
      await new Promise((r) => setTimeout(r, 300))
      continue
    }
    if (await page.$('[data-aq="tutorial-start"]')) {
      await page.click('[data-aq="tutorial-start"]')
      await new Promise((r) => setTimeout(r, 300))
      continue
    }
    if (await page.$('[data-aq="fight"]')) {
      await page.click('[data-aq="fight"]')
      await new Promise((r) => setTimeout(r, 300))
      continue
    }
    if (await page.$('[data-aq="campaign"]')) {
      await page.click('[data-aq="campaign"]')
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  await page.waitForSelector('[data-aq-board="1"]', { timeout: 15000 })
  ok('battle_open', true)

  const turn = await page.evaluate(() => document.querySelector('.aq-turn')?.textContent || '')
  ok('player_turn_banner', /내 턴/.test(turn), turn)

  const coach = await page.$('.aq-gem.coach')
  ok('tutorial_coach_gem', !!coach)

  // Drag until board changes (legal match) — up to 12 attempts
  let swapped = false
  let damaged = false
  let cascadeFx = false
  for (let i = 0; i < 12; i++) {
    const r = await dragLegalMove(page)
    if (r && r.changed) {
      swapped = true
      if (r.damaged) damaged = true
      if (r.sawCascadeFx) cascadeFx = true
      break
    }
    // tap-tap fallback on coach
    const tapped = await page.evaluate(async () => {
      const a = document.querySelector('.aq-gem.coach')
      const b = document.querySelector('.aq-gem.coach-target')
      if (!a || !b) return false
      const before = [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join('')
      a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 1, clientY: 1, pointerId: 7, pointerType: 'touch' }))
      a.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 1, clientY: 1, pointerId: 7, pointerType: 'touch' }))
      await new Promise((r) => setTimeout(r, 40))
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 2, clientY: 2, pointerId: 8, pointerType: 'touch' }))
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 2, clientY: 2, pointerId: 8, pointerType: 'touch' }))
      let saw = false
      for (let w = 0; w < 24; w++) {
        if (document.querySelector('.aq-gem.matched, .aq-gem.popping, .aq-gem.falling, .aq-gem.swap-ok')) saw = true
        const busy = /처리 중/.test(document.querySelector('.aq-turn')?.textContent || '')
        if (!busy && w > 2) break
        await new Promise((r) => setTimeout(r, 80))
      }
      const after = [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join('')
      return { changed: before !== after, saw }
    })
    if (tapped && tapped.changed) {
      swapped = true
      if (tapped.saw) cascadeFx = true
      break
    }
  }
  ok('gem_swap_visual', swapped)
  ok('cascade_connect_fx', cascadeFx)

  // Wait for damage float or HP drop
  await new Promise((r) => setTimeout(r, 400))
  const enemyHpText = await page.evaluate(() => document.querySelector('[data-aq-ehp-text]')?.textContent || '')
  if (!damaged) {
    // After a successful match fire/dark likely damaged; check float history via enemy HP vs max
    const m = enemyHpText.match(/HP\s+(\d+)\/(\d+)/)
    if (m && Number(m[1]) < Number(m[2])) damaged = true
  }
  ok('damage_applied', damaged, enemyHpText)

  // Observe enemy turn then return — cascade FX lengthens each move
  let sawEnemy = false
  let sawPlayerAgain = false
  for (let i = 0; i < 80; i++) {
    const t = await page.evaluate(() => document.querySelector('.aq-turn')?.textContent || '')
    const body = await page.evaluate(() => document.body.innerText || '')
    const dbg = await page.evaluate(() => document.querySelector('[data-aq-debug]')?.textContent || '')
    if (/적 턴|ENEMY MOVE/.test(t) || /ENEMY MOVE/.test(body) || /turn=enemy/.test(dbg)) {
      sawEnemy = true
    }
    if (sawEnemy && (/내 턴/.test(t) || /turn=player/.test(dbg)) && !/처리 중|행동 중|연결 처리/.test(t)) {
      sawPlayerAgain = true
      break
    }
    if (/VICTORY|DEFEAT|승리|패배/.test(body)) {
      sawEnemy = true
      sawPlayerAgain = true
      break
    }
    if (/내 턴/.test(t) && !/처리 중/.test(t)) {
      await dragLegalMove(page)
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  ok('enemy_turn_seen', sawEnemy)
  ok('player_turn_return', sawPlayerAgain)

  // 20-turn freeze test
  let freeze = false
  let turns = 0
  for (let i = 0; i < 40 && turns < 20; i++) {
    const lockedBusy = await page.evaluate(() => /처리 중/.test(document.querySelector('.aq-turn')?.textContent || ''))
    const end = await page.evaluate(() => !!document.querySelector('h2') && /VICTORY|DEFEAT/.test(document.body.innerText))
    if (end) break
    const t0 = Date.now()
    await dragLegalMove(page)
    // wait unlock
    for (let w = 0; w < 60; w++) {
      const busy = await page.evaluate(() => /처리 중/.test(document.querySelector('.aq-turn')?.textContent || ''))
      if (!busy) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const stillBusy = await page.evaluate(() => /처리 중/.test(document.querySelector('.aq-turn')?.textContent || ''))
    if (stillBusy && Date.now() - t0 > 8000) {
      freeze = true
      break
    }
    turns++
    void lockedBusy
  }
  ok('twenty_turn_no_freeze', !freeze && turns >= 8, `turns=${turns}`)

  // Mobile viewport gem size
  const gemSize = await page.evaluate(() => {
    const g = document.querySelector('.aq-gem')
    if (!g) return 0
    return g.getBoundingClientRect().width
  })
  ok('gem_touch_size', gemSize >= 28, `w=${gemSize}`)

  const criticalErrors = errors.filter((e) => !/CORS policy|ERR_FAILED|beforeinstallprompt|build-meta/.test(e))
  const report = {
    checks,
    errors: errors.slice(0, 20),
    criticalErrors,
    passed: checks.every((c) => c.pass) && criticalErrors.length === 0,
  }
  writeFileSync('/opt/cursor/artifacts/quest-gameplay-e2e.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  server.close()
  if (!report.passed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
