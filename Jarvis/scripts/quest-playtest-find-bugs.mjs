/**
 * Hands-on AIZIO QUEST playtest — play like a user, screenshot, log issues.
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const TARGET = process.env.QUEST_URL || 'https://lightlab-92m8bq7.shipstatic.com'
const OUT = '/opt/cursor/artifacts/quest-playtest'
mkdirSync(OUT, { recursive: true })

const issues = []
const notes = []
const note = (s) => notes.push({ t: Date.now(), s })
const issue = (sev, title, detail = '') => {
  issues.push({ sev, title, detail })
  note(`ISSUE[${sev}] ${title} :: ${detail}`)
}

async function shot(page, name) {
  const path = join(OUT, `${String(notes.length).padStart(3, '0')}-${name}.png`)
  await page.screenshot({ path, fullPage: false })
  note(`shot ${name}`)
  return path
}

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function boardSnapshot(page) {
  return page.evaluate(() => {
    const gems = [...document.querySelectorAll('.aq-gem')]
    const kinds = gems.map((g) => g.dataset.kind)
    const turn = document.querySelector('.aq-turn')?.textContent || ''
    const ehp = document.querySelector('[data-aq-ehp-text]')?.textContent || ''
    const php = document.querySelector('[data-aq-php-text]')?.textContent || ''
    const dbg = document.querySelector('[data-aq-debug]')?.textContent || ''
    const float = document.querySelector('[data-aq-float]')?.textContent || ''
    const coach = !!document.querySelector('.aq-gem.coach')
    const skills = [...document.querySelectorAll('[data-aq="skill"]')].map((b) => ({
      text: b.textContent?.trim().slice(0, 40),
      disabled: b.disabled,
    }))
    const matched = document.querySelectorAll('.aq-gem.matched').length
    const popping = document.querySelectorAll('.aq-gem.popping').length
    const falling = document.querySelectorAll('.aq-gem.falling').length
    const busy = /처리 중|행동 중|연결 처리/.test(turn)
    // Detect immediate 3+ runs (soft bug if present while player can move)
    const grid = Array.from({ length: 8 }, () => Array(8).fill(null))
    for (const g of gems) {
      grid[Number(g.dataset.r)][Number(g.dataset.c)] = g.dataset.kind
    }
    let matchRuns = 0
    for (let r = 0; r < 8; r++) {
      let c = 0
      while (c < 8) {
        let end = c + 1
        while (end < 8 && grid[r][end] === grid[r][c]) end++
        if (end - c >= 3) matchRuns++
        c = end
      }
    }
    for (let c = 0; c < 8; c++) {
      let r = 0
      while (r < 8) {
        let end = r + 1
        while (end < 8 && grid[end][c] === grid[r][c]) end++
        if (end - r >= 3) matchRuns++
        r = end
      }
    }
    return {
      kinds: kinds.join(''),
      turn,
      ehp,
      php,
      dbg,
      float,
      coach,
      skills,
      matched,
      popping,
      falling,
      busy,
      matchRuns,
      gemCount: gems.length,
    }
  })
}

async function findLegalDrag(page) {
  return page.evaluate(() => {
    const gems = [...document.querySelectorAll('.aq-gem')]
    const kindAt = (r, c) =>
      gems.find((g) => Number(g.dataset.r) === r && Number(g.dataset.c) === c)?.dataset.kind
    const rect = (r, c) => {
      const g = gems.find((x) => Number(x.dataset.r) === r && Number(x.dataset.c) === c)
      if (!g) return null
      const b = g.getBoundingClientRect()
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
    }
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
        why: 'coach',
      }
    }
    // Try all adjacent pairs; accept any that would create 3+ (client heuristic)
    const wouldMatch = (grid) => {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          if (grid[r][c] && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) return true
        }
      }
      for (let c = 0; c < 8; c++) {
        for (let r = 0; r < 6; r++) {
          if (grid[r][c] && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) return true
        }
      }
      return false
    }
    const base = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => kindAt(r, c)),
    )
    const neighbors = [
      [0, 1],
      [1, 0],
    ]
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        for (const [dr, dc] of neighbors) {
          const r2 = r + dr
          const c2 = c + dc
          if (r2 > 7 || c2 > 7) continue
          const g = base.map((row) => row.slice())
          const t = g[r][c]
          g[r][c] = g[r2][c2]
          g[r2][c2] = t
          if (!wouldMatch(g)) continue
          const a = rect(r, c)
          const b = rect(r2, c2)
          if (!a || !b) continue
          return { ax: a.x, ay: a.y, bx: b.x, by: b.y, why: `${r},${c}->${r2},${c2}` }
        }
      }
    }
    // fallback: any horizontal neighbor
    for (const g of gems) {
      const r = Number(g.dataset.r)
      const c = Number(g.dataset.c)
      const right = rect(r, c + 1)
      if (!right) continue
      const a = g.getBoundingClientRect()
      return {
        ax: a.left + a.width / 2,
        ay: a.top + a.height / 2,
        bx: right.x,
        by: right.y,
        why: 'fallback',
      }
    }
    return null
  })
}

async function drag(page, target) {
  await page.mouse.move(target.ax, target.ay)
  await page.mouse.down()
  await page.mouse.move(target.bx, target.by, { steps: 12 })
  await page.mouse.up()
}

async function waitUnlock(page, timeoutMs = 8000) {
  const t0 = Date.now()
  let sawFx = false
  while (Date.now() - t0 < timeoutMs) {
    const s = await boardSnapshot(page)
    if (s.matched || s.popping || s.falling) sawFx = true
    if (!s.busy && /내 턴|적 턴|VICTORY|DEFEAT|승리|패배/.test(s.turn + (await page.evaluate(() => document.body.innerText)))) {
      if (!/연결 처리|행동 중/.test(s.turn)) return { ...s, sawFx, waited: Date.now() - t0 }
    }
    // victory/defeat screens
    const end = await page.evaluate(() => /VICTORY|DEFEAT|승리|보상|패배/.test(document.body.innerText || ''))
    if (end && !document.querySelector('[data-aq-board="1"]')) {
      return { ended: true, sawFx, waited: Date.now() - t0, turn: 'end' }
    }
    await wait(80)
  }
  return { timeout: true, sawFx, waited: timeoutMs }
}

async function openQuestBattle(page) {
  await page.goto(`${TARGET}/?aqdebug=1`, { waitUntil: 'networkidle0', timeout: 90000 })
  await page.evaluate(() => {
    location.hash = '#games'
  })
  await wait(800)
  await page.waitForSelector('[data-action="open-aizio-quest"]', { timeout: 25000 })
  await page.click('[data-action="open-aizio-quest"]')
  await page.waitForSelector('.aq-root', { timeout: 25000 })
  await shot(page, 'quest-title')

  for (let i = 0; i < 10; i++) {
    if (await page.$('[data-aq-board="1"]')) break
    const clickIf = async (sel) => {
      const el = await page.$(sel)
      if (el) {
        await el.click()
        await wait(350)
        return true
      }
      return false
    }
    if (await clickIf('[data-aq="new"]')) continue
    if (await clickIf('[data-aq="pick-hero"]:not([disabled])')) continue
    if (await clickIf('[data-aq="tutorial-start"]')) continue
    if (await clickIf('[data-aq="fight"]')) continue
    if (await clickIf('[data-aq="campaign"]')) continue
    // stage list buttons
    const stage = await page.$('[data-aq="start-stage"], [data-aq="fight"], .aq-stage button, [data-aq^="stage"]')
    if (stage) {
      await stage.click()
      await wait(400)
      continue
    }
    await wait(200)
  }
  await page.waitForSelector('[data-aq-board="1"]', { timeout: 20000 })
  await shot(page, 'battle-start')
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--window-size=390,844'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console:' + msg.text())
  })

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem(
      'jarvis.geo.last.v1',
      JSON.stringify({ lat: 37.5, lon: 127, accuracy: 10, at: Date.now() }),
    )
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

  note(`target ${TARGET}`)
  await openQuestBattle(page)

  let before = await boardSnapshot(page)
  note(`start turn=${before.turn} ehp=${before.ehp} php=${before.php} coach=${before.coach} runs=${before.matchRuns}`)
  if (before.gemCount !== 64) issue('high', 'board_not_8x8', `gems=${before.gemCount}`)
  if (before.matchRuns > 0 && !before.busy) {
    issue('high', 'unresolved_matches_on_player_turn', `runs=${before.matchRuns}`)
  }
  if (!/내 턴/.test(before.turn)) issue('med', 'missing_player_turn_banner', before.turn)

  // Skip tutorial if blocking oddly after a few moves
  let cascadeSeen = 0
  let cascadeMiss = 0
  let swapsOk = 0
  let swapsFail = 0
  let freezeHits = 0
  let boardJumps = 0
  let lastKinds = before.kinds
  let hpSamples = [before.ehp]

  for (let move = 0; move < 18; move++) {
    const snap0 = await boardSnapshot(page)
    const hasBoard = await page.evaluate(() => !!document.querySelector('[data-aq-board="1"]'))
    if (!hasBoard) {
      note(`battle ended at move ${move}`)
      await shot(page, `end-move-${move}`)
      break
    }
    if (snap0.busy) {
      const u = await waitUnlock(page, 6000)
      if (u.timeout) {
        freezeHits++
        issue('high', 'stuck_busy_lock', `move=${move} turn=${snap0.turn}`)
        await shot(page, `stuck-${move}`)
        // try skip tutorial
        const skip = await page.$('[data-aq="tutorial-skip-battle"]')
        if (skip) await skip.click()
        continue
      }
    }

    // Idle board should not have matches
    const idle = await boardSnapshot(page)
    if (idle.matchRuns > 0 && /내 턴/.test(idle.turn) && !/처리|연결|행동/.test(idle.turn)) {
      issue('high', 'matches_left_unresolved_between_moves', `move=${move} runs=${idle.matchRuns}`)
      await shot(page, `unresolved-${move}`)
    }

    const target = await findLegalDrag(page)
    if (!target) {
      issue('high', 'no_legal_move_found_ui', `move=${move}`)
      await shot(page, `no-move-${move}`)
      const skip = await page.$('[data-aq="tutorial-skip-battle"]')
      if (skip) {
        await skip.click()
        await wait(300)
      }
      continue
    }

    const kindsBefore = idle.kinds
    note(`move ${move} drag ${target.why}`)
    await drag(page, target)

    // Sample mid-animation for cascade continuity
    let sawMatch = false
    let sawFall = false
    let sawPop = false
    let midKinds = null
    for (let i = 0; i < 20; i++) {
      const mid = await boardSnapshot(page)
      if (mid.matched) sawMatch = true
      if (mid.popping) sawPop = true
      if (mid.falling) sawFall = true
      if (!midKinds && (mid.matched || mid.popping || mid.falling)) midKinds = mid.kinds
      if (!mid.busy && i > 3) break
      await wait(70)
    }
    const after = await waitUnlock(page, 9000)
    if (after.timeout) {
      freezeHits++
      issue('high', 'post_swap_never_unlocks', `move=${move}`)
      await shot(page, `unlock-fail-${move}`)
      continue
    }

    const snap1 = await boardSnapshot(page)
    hpSamples.push(snap1.ehp)

    if (snap1.kinds !== kindsBefore) {
      swapsOk++
      if (sawMatch || sawPop || sawFall || after.sawFx) cascadeSeen++
      else {
        cascadeMiss++
        // One miss can be invalid swap that still changed via enemy — check
        if (/내 턴/.test(snap1.turn) && snap1.kinds !== kindsBefore) {
          issue('med', 'board_changed_without_cascade_fx', `move=${move} why=${target.why}`)
          await shot(page, `no-fx-${move}`)
        }
      }
    } else {
      swapsFail++
      note(`swap no-change move=${move}`)
    }

    // Hard jump detection: mid-animation board should not instantly equal final
    // (if we never saw mid states but board changed a lot — weak signal)
    if (midKinds && midKinds === snap1.kinds && !sawFall && sawMatch) {
      // matched then jumped to final without fall class — possible
      boardJumps++
    }

    if (move === 0 || move === 3 || move === 8) await shot(page, `after-move-${move}`)

    // Try a skill once energy allows
    if (move === 5 || move === 10) {
      const skill = await page.$('[data-aq="skill"]:not([disabled])')
      if (skill) {
        const beforeSkill = await boardSnapshot(page)
        await skill.click()
        await waitUnlock(page, 8000)
        const afterSkill = await boardSnapshot(page)
        note(`skill used move=${move} ehp ${beforeSkill.ehp} -> ${afterSkill.ehp}`)
        await shot(page, `skill-${move}`)
      }
    }

    lastKinds = snap1.kinds
    void lastKinds
  }

  // Campaign / victory path
  const body = await page.evaluate(() => document.body.innerText || '')
  await shot(page, 'final-state')
  if (/승리|VICTORY|보상/.test(body)) note('reached victory/reward')
  if (/패배|DEFEAT/.test(body)) note('reached defeat')

  // Check version
  const ver = await page.evaluate(async () => {
    try {
      const r = await fetch('/build-meta.json?_=' + Date.now())
      return await r.json()
    } catch (e) {
      return { err: String(e) }
    }
  })
  note(`build-meta ${JSON.stringify(ver)}`)

  // Heuristic summary issues
  if (swapsOk === 0) issue('critical', 'no_successful_swaps', `fail=${swapsFail}`)
  if (cascadeMiss > swapsOk && swapsOk > 0) {
    issue('high', 'cascade_fx_mostly_missing', `seen=${cascadeSeen} miss=${cascadeMiss} ok=${swapsOk}`)
  }
  if (freezeHits > 0) issue('high', 'freeze_observed', `hits=${freezeHits}`)

  // Rapid invalid spam shouldn't lock
  if (await page.$('[data-aq-board="1"]')) {
    for (let i = 0; i < 5; i++) {
      const t = await findLegalDrag(page)
      if (!t) break
      // drag same cell tiny distance
      await page.mouse.move(t.ax, t.ay)
      await page.mouse.down()
      await page.mouse.move(t.ax + 2, t.ay + 2, { steps: 2 })
      await page.mouse.up()
      await wait(200)
    }
    const afterSpam = await boardSnapshot(page)
    if (afterSpam.busy) {
      const u = await waitUnlock(page, 5000)
      if (u.timeout) issue('high', 'lock_after_invalid_spam', afterSpam.turn)
    }
  }

  const report = {
    target: TARGET,
    version: ver,
    swapsOk,
    swapsFail,
    cascadeSeen,
    cascadeMiss,
    freezeHits,
    boardJumps,
    hpSamples,
    issues,
    notes: notes.slice(-80),
    errors: errors.filter((e) => !/CORS|build-meta|ERR_FAILED|beforeinstallprompt/.test(e)).slice(0, 30),
    screenshots: existsSync(OUT) ? OUT : null,
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
