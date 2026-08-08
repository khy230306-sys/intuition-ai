/**
 * Critical re-verify after hardening fixes (Chromium chat composer).
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

const CASES = [
  {
    name: 'translate_blocks_weather_query',
    turns: ['지금부터 영어로 번역해줘', '울산 날씨 알려줘', '번역 그만', '울산 날씨 알려줘'],
    check: (replies) => {
      if (!/번역|영어/.test(replies[0])) return 'start miss'
      if (/open-meteo|℃|기온\s*\d/.test(replies[1])) return 'weather leaked in translate mode'
      if (!/종료|꺼|해제|번역/.test(replies[2])) return 'end miss'
      if (!/울산|날씨|℃|기온|비|맑|흐/.test(replies[3])) return 'weather after end miss'
      return null
    },
  },
  {
    name: 'weather_typo',
    turns: ['낼 비옴?'],
    check: (r) => (/비|날씨|기온|우산|맑|흐|강수/.test(r[0]) ? null : 'weather miss'),
  },
  {
    name: 'music_ko',
    turns: ['조용한 음악 틀어줘'],
    check: (r) => (/Found calm music/.test(r[0]) ? 'english copy' : /음악|재생|YouTube|유튜브/.test(r[0]) ? null : 'music miss'),
  },
  {
    name: 'calendar_cancel_ko',
    turns: ['그 일정 취소해'],
    check: (r) => (/필요한 정보:\s*title/.test(r[0]) ? 'raw title' : /일정|취소|제목|날짜|어떤/.test(r[0]) ? null : 'cancel miss'),
  },
  {
    name: 'help_usage',
    turns: ['혹시 사용 방법을 알려주실 수 있을까요?'],
    check: (r) => (/날씨|번역|설정|도움|사용|AIZIO|아이지오/.test(r[0]) ? null : 'help miss'),
  },
  {
    name: 'chain_hours_not_clock',
    turns: ['울산에서 아이랑 갈 만한 곳 찾아봐', '두 번째가 괜찮네', '몇 시까지 해?'],
    check: (r) => {
      if (/지금은\s*20\d{2}/.test(r[2])) return 'wall clock leak'
      if (!/영업|시간|지도|포함되어\s*있지|선택/.test(r[2])) return 'hours reply weak'
      return null
    },
  },
  {
    name: 'settings_then_chat',
    turns: ['설정 열어줘', '안녕'],
    check: (r) => {
      if (!/설정/.test(r[0] || '')) return 'settings text empty'
      if (!(r[1] || '').trim()) return 'chat after settings empty'
      return null
    },
  },
]

async function dismissOverlays(page) {
  await page.evaluate(() => {
    for (const re of [/나중에/, /AI 없이 기본 기능/, /숨기기/]) {
      const btn = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''))
      btn?.click()
    }
  })
  await new Promise((r) => setTimeout(r, 200))
}

async function ensureChat(page) {
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
  await dismissOverlays(page)
  await page.waitForSelector('#draft:not([disabled])', { timeout: 20000 })
}

async function sendChat(page, text) {
  await ensureChat(page)
  const before = await page.evaluate(
    () => document.querySelectorAll('.msg-bubble.assistant, .msg.assistant').length,
  )
  await page.evaluate((msg) => {
    const input = document.getElementById('draft')
    const form = document.getElementById('composer')
    input.disabled = false
    input.value = msg
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.requestSubmit()
  }, text)
  await page.waitForFunction(
    (msg) =>
      [...document.querySelectorAll('.msg-bubble.user, .msg.user')].some((m) =>
        (m.textContent || '').includes(msg),
      ),
    { timeout: 15000 },
    text,
  )
  try {
    await page.waitForFunction(
      (n) => document.querySelectorAll('.msg-bubble.assistant, .msg.assistant').length > n,
      { timeout: 45000 },
      before,
    )
  } catch {
    /* */
  }
  try {
    await page.waitForFunction(() => !document.querySelector('#draft')?.disabled, { timeout: 45000 })
  } catch {
    await page.evaluate(() => {
      const d = document.getElementById('draft')
      if (d) d.disabled = false
    })
  }
  await new Promise((r) => setTimeout(r, 300))
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant, .msg.assistant')]
    return (msgs[msgs.length - 1]?.textContent || '').trim()
  })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('no dist')
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
  await new Promise((r) => server.listen(4201, '127.0.0.1', r))
  const base = 'http://127.0.0.1:4201/'
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  const api = { gemini: 0, openai: 0, fail: 0 }
  page.on('response', (res) => {
    const u = res.url()
    const ok = res.status() >= 200 && res.status() < 400
    if (/generativelanguage\.googleapis|gemini/i.test(u)) ok ? api.gemini++ : api.fail++
    if (/api\.openai\.com/i.test(u)) ok ? api.openai++ : api.fail++
  })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('jarvis.geo.granted.v1', '1')
    localStorage.setItem(
      'jarvis.geo.last.v1',
      JSON.stringify({ lat: 35.5384, lon: 129.3114, accuracy: 12, at: Date.now() }),
    )
  })
  await page.goto(base, { waitUntil: 'networkidle0', timeout: 90000 })
  for (let i = 0; i < 20; i++) {
    const skip = await page.$('[data-action="skip-location"]')
    if (skip) {
      await skip.click()
      await new Promise((r) => setTimeout(r, 300))
    } else break
  }
  await ensureChat(page)

  const results = []
  for (const c of CASES) {
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (/interpret|travel_session|restaurant_session|aizio_engine|action_agent/i.test(k)) {
          localStorage.removeItem(k)
        }
      }
    })
    await ensureChat(page)
    const replies = []
    let err = null
    try {
      for (const t of c.turns) replies.push(await sendChat(page, t))
      err = c.check(replies)
    } catch (e) {
      err = String(e?.message || e)
    }
    const ok = !err
    results.push({
      name: c.name,
      ok,
      err,
      samples: replies.map((a) => a.slice(0, 180)),
    })
    console.log(`${ok ? 'OK' : 'FAIL'} ${c.name}${err ? ' — ' + err : ''}`)
  }

  const report = {
    at: new Date().toISOString(),
    api,
    pass: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
    results,
  }
  writeFileSync(join(outDir, 'critical-user-reverify.json'), JSON.stringify(report, null, 2))
  console.log('WROTE critical-user-reverify.json', report.pass, '/', results.length, api)
  await browser.close()
  server.close()
  if (report.fail) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
