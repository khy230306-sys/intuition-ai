/**
 * Preview headless UI probe — real-user navigation + chat smoke.
 */
import puppeteer from 'puppeteer-core'
import { writeFileSync, mkdirSync } from 'node:fs'

const PREVIEW = process.env.PREVIEW_URL || 'https://lightlab-92m8bq7.shipstatic.com'
const outDir = '/opt/cursor/artifacts'
mkdirSync(outDir, { recursive: true })

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/local/bin/chrome', '/usr/bin/google-chrome'].find(
    (p) => {
      try {
        return require('node:fs').existsSync(p)
      } catch {
        return false
      }
    },
  ) || '/usr/local/bin/google-chrome'

const findings = []
const shots = []

function note(severity, title, detail) {
  findings.push({ severity, title, detail })
}

async function dismissOverlays(page) {
  // Location gate first — real users must pick allow or skip
  await page.evaluate(() => {
    const skip = document.querySelector('[data-action="skip-location"]')
    if (skip) skip.click()
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.evaluate(() => {
    const labels = [/나중에/, /AI 없이 기본 기능/, /숨기기/, /닫기/, /확인/, /시작하기/, /건너뛰/, /오프라인으로 계속/]
    for (const re of labels) {
      const btn = [...document.querySelectorAll('button, [role="button"], a')].find((b) =>
        re.test(b.textContent || ''),
      )
      btn?.click()
    }
  })
  await new Promise((r) => setTimeout(r, 400))
}

async function shot(page, name) {
  const path = `${outDir}/qa-${name}.png`
  await page.screenshot({ path, fullPage: false })
  shots.push(path)
  return path
}

async function sendChat(page, text) {
  await page.evaluate(() => {
    if (!document.querySelector('#draft')) location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
  await dismissOverlays(page)
  await page.waitForSelector('#draft:not([disabled])', { timeout: 20000 }).catch(() => {})
  const sent = await page.evaluate((msg) => {
    const input = document.getElementById('draft')
    const form = document.getElementById('composer')
    if (!input || !form) return { ok: false, reason: 'missing-composer' }
    input.disabled = false
    input.value = msg
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.requestSubmit()
    return { ok: true }
  }, text)
  if (!sent.ok) throw new Error(sent.reason)
  await page.waitForFunction(
    (msg) =>
      [...document.querySelectorAll('.msg-bubble.user, .msg.user')].some((m) =>
        (m.textContent || '').includes(msg),
      ),
    { timeout: 15000 },
    text,
  )
  await page.waitForFunction(() => !document.querySelector('#draft')?.disabled, {
    timeout: 30000,
  })
  await new Promise((r) => setTimeout(r, 500))
}

async function lastAssistant(page) {
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant, .msg.assistant')]
    return msgs.at(-1)?.textContent || ''
  })
}

async function tabLabels(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('nav button, nav a, [data-tab], .primary-tab, .bottom-nav button')]
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 20),
  )
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
})

const page = await browser.newPage()
page.setDefaultTimeout(30000)
const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})

const report = { preview: PREVIEW, at: new Date().toISOString(), routes: {}, chats: [], findings, shots, consoleErrors }

try {
  await page.goto(PREVIEW + '/?qa=' + Date.now(), { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForSelector('[data-action="skip-location"], #draft, .app-shell', { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))

  // Hard skip location gate (real first-run UX)
  const skipped = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="skip-location"]')
    if (!btn) return false
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    return true
  })
  if (skipped) {
    await page.waitForFunction(() => !document.querySelector('.location-gate'), { timeout: 15000 })
  }
  await dismissOverlays(page)
  await new Promise((r) => setTimeout(r, 800))
  await shot(page, '01-home')

  const meta = await page.evaluate(async () => {
    try {
      const r = await fetch('./build-meta.json')
      return await r.json()
    } catch (e) {
      return { error: String(e) }
    }
  })
  report.meta = meta
  if (meta.version !== '1.29.5') {
    note('high', 'Preview version mismatch', JSON.stringify(meta))
  }

  // Boot / shell
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '')
  if (/시작 오류|boot error|Something went wrong/i.test(bodyText)) {
    note('critical', 'Boot error on Preview', bodyText.slice(0, 200))
  }
  report.tabs = await tabLabels(page)
  if (!report.tabs.length) {
    note('medium', 'Bottom tabs not found with common selectors', 'May use different DOM')
  }

  // Hash routes
  for (const hash of ['#home', '#chat', '#schedule', '#family', '#more', '#navigation']) {
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    await new Promise((r) => setTimeout(r, 800))
    await dismissOverlays(page)
    const info = await page.evaluate(() => ({
      hash: location.hash,
      title: document.title,
      h1: document.querySelector('h1,h2,.screen-title,.view-title')?.textContent?.trim() || '',
      hasDraft: Boolean(document.querySelector('#draft')),
      bodySnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 180),
    }))
    report.routes[hash] = info
    await shot(page, `route-${hash.replace('#', '')}`)
    if (!info.bodySnippet || info.bodySnippet.length < 5) {
      note('high', `Empty view for ${hash}`, JSON.stringify(info))
    }
  }

  // Chat journeys on device-like UI
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
  await dismissOverlays(page)

  const chatCases = [
    {
      name: '나트랑맛집',
      q: '나트랑 맛집좀 찾아줘',
      expect: /DEMO|맛집|식당|음식/,
      forbid: /몇 명이서 가시나요|인원을 숫자로/,
    },
    {
      name: '리스트만',
      q: '그냥 맛집 리스트만줘',
      forbid: /인원을 숫자로 알려/,
    },
    { name: '초기화', q: '대화초기화시켜줘', expect: /초기화|지웠|종료/ },
    {
      name: '여행',
      q: '제주도 비행기 알아봐줘',
      expect: /제주|비행|항공|여행|날짜|DEMO|편도|왕복|제공/,
    },
    { name: '리셋2', q: '대화 초기화', expect: /초기화|지웠/ },
    { name: '날씨', q: '오늘 날씨 알려줘', expect: /날씨|기온|℃|도|맑|흐림|비|습도|위치|조회/ },
    { name: '환율', q: '100달러 환율', expect: /원|USD|달러/ },
    { name: '도움말', q: '도움말', expect: /날씨|할\s*일|번역|설정|AIZIO|아이지오|알림/ },
  ]

  for (const c of chatCases) {
    try {
      await sendChat(page, c.q)
      const a = await lastAssistant(page)
      const row = { name: c.name, q: c.q, a: a.slice(0, 300), ok: true }
      if (c.expect && !c.expect.test(a)) {
        row.ok = false
        row.fail = 'expect'
        note('high', `UI chat expect fail: ${c.name}`, `Q=${c.q} A=${a.slice(0, 160)}`)
      }
      if (c.forbid && c.forbid.test(a)) {
        row.ok = false
        row.fail = 'forbid'
        note('critical', `UI chat forbid hit: ${c.name}`, `Q=${c.q} A=${a.slice(0, 160)}`)
      }
      report.chats.push(row)
      await shot(page, `chat-${c.name}`)
    } catch (e) {
      report.chats.push({ name: c.name, q: c.q, ok: false, error: String(e) })
      note('high', `UI chat error: ${c.name}`, String(e))
    }
  }

  // More catalog peek
  await page.evaluate(() => {
    location.hash = '#more'
  })
  await new Promise((r) => setTimeout(r, 1000))
  await dismissOverlays(page)
  const moreItems = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, [data-view], .feature-card, .catalog-item')]
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 1 && t.length < 40)
      .slice(0, 40),
  )
  report.moreItems = moreItems
  await shot(page, 'more')

  if (consoleErrors.length > 5) {
    note('medium', 'Many console errors on Preview', consoleErrors.slice(0, 8).join(' | '))
  }
} catch (e) {
  note('critical', 'Preview probe crashed', String(e))
  report.crash = String(e)
  try {
    await shot(page, 'crash')
  } catch {
    /* */
  }
}

await browser.close()
writeFileSync(`${outDir}/preview-ui-qa-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ findings: findings.length, chats: report.chats, findingsDetail: findings }, null, 2))
console.log('Wrote', `${outDir}/preview-ui-qa-report.json`)
