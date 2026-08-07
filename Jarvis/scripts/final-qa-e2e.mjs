/**
 * Final QA — manual-guide commands + wrong-answer traps in headless Chrome.
 * Verifies chat replies match expected domains (not off-topic routing).
 */
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const outPath = '/opt/cursor/artifacts/final-qa-report.json'

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

/** @type {{ name: string, input: string, expect: RegExp, forbid?: RegExp }[]} */
const CASES = [
  // User guide / 도움말 examples
  { name: '날씨', input: '오늘 날씨 알려줘', expect: /날씨|기온|℃|도|맑|흐림|비|습도|미세/ },
  { name: '브리핑', input: '브리핑', expect: /브리핑|오늘|날씨|할\s*일|일정|알림|Brief|목표/ },
  { name: '할일추가', input: '할 일 장보기 추가', expect: /할\s*일|장보기|추가|등록|목록|장바구니/ },
  { name: '알림', input: '알림 30분 뒤 약', expect: /알림|예약|30\s*분|약|저장/ },
  { name: '시세', input: '삼성전자 시세', expect: /삼성|시세|원|주가|005930|KRX|불러|시세|가격|실패|네트워크/ },
  { name: '번역', input: '일본어로 번역해 안녕하세요', expect: /こんにちは|翻訳|일본|번역|안녕|모드/ },
  { name: '번역종료', input: '번역 종료', expect: /종료|꺼|해제|일반|잠금/ },
  { name: '가이드', input: '사용 설명서', expect: /AIZIO|아이지오|날씨|설정|도움말/ },
  { name: '도움말', input: '도움말', expect: /날씨|할\s*일|알림|번역|설정/ },
  // Practical
  { name: '장시간', input: '장시간', expect: /KRX|개장|장전|장후|휴장/ },
  { name: '환율', input: '100달러 환율', expect: /원|USD|달러/ },
  { name: '지출', input: '커피 4500', expect: /4,?500|지출|카페|커피/ },
  // Wrong-answer traps (must NOT go to wrong domain)
  {
    name: '번역중_날씨금지',
    input: '영어로 말해줘',
    expect: /영어|English|번역|통역|해석|모드/,
    forbid: /오늘\s*날씨|기온\s*\d|℃/,
  },
  { name: '영어번역종료', input: '번역 종료', expect: /종료|꺼|해제|일반|잠금/ },
  {
    name: '맛집_일반채팅금지',
    input: '근처 맛집 찾아줘',
    expect: /맛집|음식|식당|레스토랑|근처|검색|지도|결과|Demo|데모|장소|몇\s*명|인원|예약/,
    forbid: /죄송|모르겠|일반\s*대화만/,
  },
  {
    name: '여행_의도',
    input: '제주도 비행기 예약해줘',
    expect: /제주|비행|항공|여행|예약|일정|Demo|데모|티켓|편도|왕복/,
    forbid: /오늘\s*날씨만/,
  },
  {
    name: 'how-to_예약오인금지',
    input: '비행기 예약하는 방법 알려줘',
    expect: /방법|예약|항공|절차|팁|안내|도움|하는\s*법|어떻게/,
    forbid: /예약이\s*완료|결제\s*완료|티켓\s*발권|편도인가요|왕복인가요/,
  },
]

async function dismissOverlays(page) {
  await page.evaluate(() => {
    const labels = [/나중에/, /AI 없이 기본 기능/, /숨기기/]
    for (const re of labels) {
      const btn = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''))
      btn?.click()
    }
  })
  await new Promise((r) => setTimeout(r, 250))
}

async function ensureChatComposer(page) {
  await page.evaluate(() => {
    if (!document.querySelector('#draft')) location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 15000 })
  await dismissOverlays(page)
  await page.waitForSelector('#draft:not([disabled])', { timeout: 15000 })
}

async function sendChat(page, text) {
  await ensureChatComposer(page)
  // If previous turn left composer stuck busy, soft-recover via hash remount
  const stuck = await page.evaluate(() => Boolean(document.querySelector('#draft')?.disabled))
  if (stuck) {
    await page.evaluate(() => {
      location.hash = '#home'
    })
    await new Promise((r) => setTimeout(r, 300))
    await page.evaluate(() => {
      location.hash = '#chat'
    })
    await page.waitForSelector('#draft:not([disabled])', { timeout: 15000 })
  }
  const sent = await page.evaluate((msg) => {
    const input = document.getElementById('draft')
    const form = document.getElementById('composer')
    if (!input || !form) return { ok: false, reason: 'missing-composer' }
    input.disabled = false
    input.focus()
    input.value = msg
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.requestSubmit()
    return { ok: true }
  }, text)
  if (!sent.ok) throw new Error(`sendChat failed: ${sent.reason}`)
  await page.waitForFunction(
    (msg) =>
      [...document.querySelectorAll('.msg-bubble.user, .msg.user')].some((m) =>
        (m.textContent || '').includes(msg),
      ),
    { timeout: 12000 },
    text,
  )
  try {
    await page.waitForFunction(() => !document.querySelector('#draft')?.disabled, { timeout: 20000 })
  } catch {
    // stuck busy — force enable for next case; reply may still be present
    await page.evaluate(() => {
      const d = document.getElementById('draft')
      if (d) d.disabled = false
    })
  }
  await new Promise((r) => setTimeout(r, 500))
}

async function lastAssistant(page) {
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant, .msg.assistant')]
    const last = msgs[msgs.length - 1]
    return last ? (last.textContent || '').trim() : ''
  })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error('dist/ missing — run npm run build first')
  }

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

  await new Promise((resolve) => server.listen(4188, '127.0.0.1', () => resolve()))
  const base = 'http://127.0.0.1:4188/'

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
  })

  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  const context = browser.defaultBrowserContext()
  await context.overridePermissions(base, ['geolocation'])
  await page.setGeolocation({ latitude: 37.5665, longitude: 126.978, accuracy: 12 })

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 37.5665, lon: 126.978, accuracy: 12, at: Date.now() }
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem('jarvis.geo.last.v1', JSON.stringify(fix))
    const ok = (success) => {
      success({
        coords: {
          latitude: fix.lat,
          longitude: fix.lon,
          accuracy: fix.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    }
    navigator.geolocation.getCurrentPosition = (success) => ok(success)
    navigator.geolocation.watchPosition = (success) => {
      ok(success)
      return 1
    }
    const originalQuery = navigator.permissions?.query?.bind(navigator.permissions)
    if (navigator.permissions) {
      navigator.permissions.query = (desc) => {
        if (desc && desc.name === 'geolocation') {
          return Promise.resolve({ state: 'granted', onchange: null })
        }
        return originalQuery ? originalQuery(desc) : Promise.resolve({ state: 'granted', onchange: null })
      }
    }
  })

  await page.goto(base, { waitUntil: 'networkidle0', timeout: 60000 })
  // Location gate → home (#home-ask-input) → chat (#draft)
  for (let i = 0; i < 25; i++) {
    const state = await page.evaluate(() => ({
      draft: Boolean(document.querySelector('#draft')),
      homeAsk: Boolean(document.querySelector('#home-ask-input')),
      skip: Boolean(document.querySelector('[data-action="skip-location"]')),
      wizardLater: Boolean(
        [...document.querySelectorAll('button')].some((b) => /나중에|AI 없이/.test(b.textContent || '')),
      ),
    }))
    if (state.draft) break
    if (state.skip) {
      await page.click('[data-action="skip-location"]')
      await new Promise((r) => setTimeout(r, 400))
      continue
    }
    if (state.homeAsk || state.wizardLater) break
    await new Promise((r) => setTimeout(r, 300))
  }
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
  // Dismiss AI connect wizard if present
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /나중에|AI 없이 기본 기능/.test(b.textContent || ''),
    )
    btn?.click()
  })
  await page.waitForSelector('#draft:not([disabled])', { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 400))

  const bootOk = await page.evaluate(() => {
    const app = document.getElementById('app')
    return Boolean(
      app &&
        (app.querySelector('#draft') ||
          app.querySelector('.home-v2-unified') ||
          app.querySelector('[data-boot-ready]')),
    )
  })

  const results = []
  for (const c of CASES) {
    let reply = ''
    let ok = false
    let reason = ''
    try {
      // Isolate how-to from active travel booking session
      if (c.name === 'how-to_예약오인금지') {
        await page.evaluate(() => {
          localStorage.removeItem('aizio_travel_session_v1')
          localStorage.removeItem('aizio_restaurant_session_v1')
        })
        await page.reload({ waitUntil: 'networkidle0' })
        await page.evaluate(() => {
          location.hash = '#chat'
        })
        await page.waitForSelector('#draft', { timeout: 15000 })
        await dismissOverlays(page)
      }
      await sendChat(page, c.input)
      reply = await lastAssistant(page)
      const expectOk = c.expect.test(reply)
      const forbidHit = c.forbid ? c.forbid.test(reply) : false
      ok = expectOk && !forbidHit
      if (!expectOk) reason = 'expect_miss'
      else if (forbidHit) reason = 'forbid_hit'
    } catch (e) {
      reason = String(e?.message || e)
      ok = false
    }
    results.push({
      name: c.name,
      input: c.input,
      ok,
      reason,
      sample: reply.replace(/\s+/g, ' ').slice(0, 160),
    })
    console.log(`${ok ? 'OK' : 'FAIL'} ${c.name}: ${reply.replace(/\s+/g, ' ').slice(0, 120)}`)
  }

  // Settings / API key UI presence (no secret save required)
  let settingsOk = false
  try {
    await page.evaluate(() => {
      location.hash = '#more'
    })
    await page.waitForFunction(
      () => /설정\s*·\s*AI|설정/.test(document.body?.innerText || ''),
      { timeout: 10000 },
    )
    await page.evaluate(() => {
      const btn = document.querySelector('[data-view="settings"]')
      if (btn instanceof HTMLElement) btn.click()
    })
    await page.waitForFunction(
      () => /Hybrid|OpenRouter|OpenAI|연결\s*테스트|Provider|API\s*키/.test(document.body?.innerText || ''),
      { timeout: 12000 },
    )
    settingsOk = await page.evaluate(() => {
      const t = document.body?.innerText || ''
      return /Hybrid|OpenRouter|OpenAI|연결\s*테스트|API|Provider/.test(t)
    })
  } catch (e) {
    settingsOk = false
  }
  results.push({ name: '설정_API키UI', input: '#settings', ok: settingsOk, reason: settingsOk ? '' : 'missing', sample: '' })
  console.log(`${settingsOk ? 'OK' : 'FAIL'} 설정_API키UI`)

  const failed = results.filter((r) => !r.ok)
  const report = {
    at: new Date().toISOString(),
    bootOk,
    total: results.length,
    pass: results.filter((r) => r.ok).length,
    fail: failed.length,
    pageErrors,
    failed: failed.map((f) => ({ name: f.name, input: f.input, reason: f.reason, sample: f.sample })),
    results,
  }
  try {
    writeFileSync(outPath, JSON.stringify(report, null, 2))
    console.log('WROTE', outPath)
  } catch {
    /* ignore */
  }

  await browser.close()
  server.close()

  if (!bootOk) throw new Error('boot failed')
  if (failed.length) {
    console.error('FINAL_QA_FAIL', failed.map((f) => f.name).join(', '))
    process.exit(1)
  }
  if (pageErrors.length) {
    console.error('FINAL_QA_PAGE_ERRORS', pageErrors.join(' | '))
    process.exit(1)
  }
  console.log(`FINAL_QA_OK ${report.pass}/${report.total}`)
}

main().catch((err) => {
  console.error('FINAL_QA_FAIL', err)
  process.exit(1)
})
