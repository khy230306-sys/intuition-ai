/**
 * Reproduce AIZIO QUEST gem input failure on Preview (or local dist).
 * Diagnoses overlays, pointer handlers, animLock, turn, hit-testing.
 */
import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'node:fs'

const TARGET = process.env.QUEST_URL || 'https://lightlab-92m8bq7.shipstatic.com'

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gesture-requirement-for-presentation'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror:' + String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console:' + msg.text())
  })

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem(
      'jarvis.geo.last.v1',
      JSON.stringify({ lat: 37.5, lon: 127, accuracy: 10, at: Date.now() }),
    )
    // Fresh player — no tutorial skip, forces new-game path similar to real user
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

  await page.goto(TARGET, { waitUntil: 'networkidle0', timeout: 90000 })
  await page.evaluate(() => {
    location.hash = '#games'
  })
  await page.waitForSelector('[data-action="open-aizio-quest"]', { timeout: 20000 })
  await page.click('[data-action="open-aizio-quest"]')
  await page.waitForSelector('.aq-root', { timeout: 20000 })

  // New game path
  const newBtn = await page.$('[data-aq="new"]')
  if (newBtn) await newBtn.click()
  await page.waitForSelector('[data-aq="pick-hero"], [data-aq="fight"], [data-aq="tutorial-start"]', {
    timeout: 10000,
  })
  const hero = await page.$('[data-aq="pick-hero"]:not([disabled])')
  if (hero) await hero.click()
  const tutStart = await page.$('[data-aq="tutorial-start"]')
  if (tutStart) await tutStart.click()
  else {
    const skip = await page.$('[data-aq="tutorial-skip"]')
    if (skip) await skip.click()
    const fight = await page.$('[data-aq="fight"]')
    if (fight) await fight.click()
  }
  await page.waitForSelector('[data-aq-board="1"]', { timeout: 15000 })

  const pre = await page.evaluate(() => {
    const board = document.querySelector('[data-aq-board="1"]')
    const gems = [...document.querySelectorAll('.aq-gem')]
    const turn = document.querySelector('.aq-turn')?.textContent || ''
    const float = document.querySelector('.aq-float')
    const toast = document.querySelector('.aq-toast')
    const style = board ? getComputedStyle(board) : null
    const wrap = document.querySelector('.aq-board-wrap')
    const wrapStyle = wrap ? getComputedStyle(wrap) : null
    const gem0 = gems[0]
    const gStyle = gem0 ? getComputedStyle(gem0) : null
    const rect = gem0?.getBoundingClientRect()
    const centerX = rect ? rect.left + rect.width / 2 : 0
    const centerY = rect ? rect.top + rect.height / 2 : 0
    const topEl = document.elementFromPoint(centerX, centerY)
    return {
      gemCount: gems.length,
      turn,
      boardTouchAction: style?.touchAction,
      boardPointerEvents: style?.pointerEvents,
      wrapTouchAction: wrapStyle?.touchAction,
      gemPointerEvents: gStyle?.pointerEvents,
      gemTag: gem0?.tagName,
      hasPointerDownAttr: !!gem0?.onpointerdown,
      // listeners can't be enumerated easily — check dataset
      gemDataset: gem0 ? { ...gem0.dataset } : null,
      hitTop: topEl
        ? { tag: topEl.tagName, class: topEl.className, pe: getComputedStyle(topEl).pointerEvents }
        : null,
      overlays: [...document.querySelectorAll('.aq-root *')].filter((el) => {
        const s = getComputedStyle(el)
        return (
          (s.position === 'absolute' || s.position === 'fixed') &&
          s.pointerEvents !== 'none' &&
          parseFloat(s.zIndex || '0') >= 2
        )
      }).slice(0, 12).map((el) => ({
        tag: el.tagName,
        class: el.className,
        z: getComputedStyle(el).zIndex,
        pe: getComputedStyle(el).pointerEvents,
      })),
      firstKinds: gems.slice(0, 16).map((g) => g.getAttribute('data-kind')),
    }
  })

  // Capture board snapshot before gesture
  const beforeKinds = await page.evaluate(() =>
    [...document.querySelectorAll('.aq-gem')].map((g) => `${g.dataset.r},${g.dataset.c}:${g.dataset.kind}`),
  )

  // Find two adjacent gems and drag
  const dragTarget = await page.evaluate(() => {
    const gems = [...document.querySelectorAll('.aq-gem')]
    const byPos = new Map(gems.map((g) => [`${g.dataset.r},${g.dataset.c}`, g]))
    for (const g of gems) {
      const r = Number(g.dataset.r)
      const c = Number(g.dataset.c)
      const right = byPos.get(`${r},${c + 1}`)
      if (right) {
        const a = g.getBoundingClientRect()
        const b = right.getBoundingClientRect()
        return {
          ax: a.left + a.width / 2,
          ay: a.top + a.height / 2,
          bx: b.left + b.width / 2,
          by: b.top + b.height / 2,
          from: `${r},${c}`,
          to: `${r},${c + 1}`,
          kindA: g.dataset.kind,
          kindB: right.dataset.kind,
        }
      }
    }
    return null
  })

  let mouseResult = null
  if (dragTarget) {
    await page.mouse.move(dragTarget.ax, dragTarget.ay)
    await page.mouse.down()
    await page.mouse.move(dragTarget.bx, dragTarget.by, { steps: 12 })
    await page.mouse.up()
    await new Promise((r) => setTimeout(r, 600))
    const afterKinds = await page.evaluate(() =>
      [...document.querySelectorAll('.aq-gem')].map((g) => `${g.dataset.r},${g.dataset.c}:${g.dataset.kind}`),
    )
    mouseResult = {
      dragTarget,
      changed: beforeKinds.join('|') !== afterKinds.join('|'),
      selectedAfter: await page.evaluate(() => !!document.querySelector('.aq-gem.selected')),
      turnAfter: await page.evaluate(() => document.querySelector('.aq-turn')?.textContent || ''),
      floatText: await page.evaluate(() => document.querySelector('.aq-float')?.textContent || ''),
      enemyHp: await page.evaluate(() => document.querySelector('.aq-fighter .aq-muted')?.textContent || ''),
    }
  }

  // Touch simulation
  const touchResult = await page.evaluate(async (dt) => {
    if (!dt) return { ok: false, reason: 'no target' }
    const el = document.elementFromPoint(dt.ax, dt.ay)
    if (!el) return { ok: false, reason: 'no el' }
    const before = [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join(',')
    const opts = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true }
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: dt.ax, clientY: dt.ay }))
    el.dispatchEvent(
      new PointerEvent('pointermove', { ...opts, clientX: dt.bx, clientY: dt.by }),
    )
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: dt.bx, clientY: dt.by }))
    await new Promise((r) => setTimeout(r, 500))
    const after = [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join(',')
    return { ok: true, changed: before !== after, hitTag: el.tagName, hitClass: el.className }
  }, dragTarget)

  // Tap-tap adjacent
  const tapResult = await page.evaluate(async () => {
    const gems = [...document.querySelectorAll('.aq-gem')]
    if (gems.length < 2) return { ok: false }
    const a = gems[0]
    const r = Number(a.dataset.r)
    const c = Number(a.dataset.c)
    const b = gems.find((g) => Number(g.dataset.r) === r && Number(g.dataset.c) === c + 1)
    if (!b) return { ok: false, reason: 'no adjacent' }
    const before = gems.map((g) => g.dataset.kind).join(',')
    a.click()
    await new Promise((r) => setTimeout(r, 100))
    const selected = !!document.querySelector('.aq-gem.selected')
    b.click()
    await new Promise((r) => setTimeout(r, 500))
    const after = [...document.querySelectorAll('.aq-gem')].map((g) => g.dataset.kind).join(',')
    return { ok: true, selectedAfterFirst: selected, changed: before !== after }
  })

  // Probe if listeners exist by checking getEventListeners if available (chrome only via CDP)
  const client = await page.createCDPSession()
  const gemObj = await page.evaluateHandle(() => document.querySelector('.aq-gem'))
  let listenerInfo = null
  try {
    const { object } = await client.send('Runtime.describeObject', {})
    void object
  } catch {
    /* ignore */
  }
  try {
    const node = await client.send('DOM.describeNode', {
      objectId: gemObj.remoteObject().objectId,
    })
    const { listeners } = await client.send('DOMDebugger.getEventListeners', {
      objectId: gemObj.remoteObject().objectId,
    })
    listenerInfo = {
      nodeName: node.node.nodeName,
      listeners: listeners.map((l) => ({ type: l.type, passive: l.passive, once: l.once })),
    }
  } catch (e) {
    listenerInfo = { error: String(e) }
  }

  const report = {
    target: TARGET,
    pre,
    mouseResult,
    touchResult,
    tapResult,
    listenerInfo,
    errors: errors.slice(0, 30),
    diagnosis: {
      boardExists: pre.gemCount === 64 || pre.gemCount === 49,
      hitIsGem: pre.hitTop?.class?.includes?.('aq-gem') || pre.hitTop?.tag === 'BUTTON',
      hasPointerListeners: (listenerInfo?.listeners || []).some((l) => l.type.startsWith('pointer')),
      mouseChangedBoard: mouseResult?.changed,
      touchChangedBoard: touchResult?.changed,
      tapChangedBoard: tapResult?.changed,
    },
  }
  writeFileSync('/opt/cursor/artifacts/quest-input-repro.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
