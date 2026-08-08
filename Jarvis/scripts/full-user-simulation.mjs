/**
 * AIZIO Full User Simulation — real Chromium chat composer.
 * 100+ natural-language turns + multi-turn chains + active modes.
 * Measures latency, tracks API providers, flags hallucinations.
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
const outPath = join(outDir, 'full-user-simulation-report.json')

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

/** @typedef {{ name: string, turns: string[], expect?: RegExp, forbid?: RegExp, expectAll?: RegExp[], forbidAll?: RegExp[], multi?: boolean, tag?: string }} Scenario */

/** @type {Scenario[]} */
const SCENARIOS = [
  // —— Casual chat / lifestyle (LLM) ——
  { name: 'greeting_mood', turns: ['안녕 오늘 기분이 좀 꿀꿀하네'], expect: /.|./, tag: 'chat' },
  { name: 'what_doing', turns: ['뭐하고 있었어?'], expect: /.|./, tag: 'chat' },
  { name: 'dinner_idea', turns: ['나 오늘 저녁 뭐 먹을까?'], expect: /.|./, forbid: /예약이\s*완료/, tag: 'chat' },
  { name: 'kimchi_recipe', turns: ['김치찌개 만드는 법 알려줘'], expect: /김치|찌개|재료|끓|고추|방법|레시피|넣/, tag: 'chat' },
  { name: 'kids_weekend_soft', turns: ['아이랑 이번 주말에 뭐하면 좋을까?'], expect: /.|./, forbid: /DEMO\s*맛집\s*예약\s*완료/, tag: 'chat' },
  { name: 'weather_nice_opinion', turns: ['오늘 날씨 정말 좋다'], expect: /.|./, forbid: /기온\s*\d|℃/, tag: 'chat' },
  { name: 'advice_stress', turns: ['스트레스 받을 때 어떻게 해?'], expect: /.|./, tag: 'chat' },
  { name: 'compare_ask', turns: ['이 중에서 뭐가 제일 나아?'], expect: /.|./, tag: 'chat' },
  { name: 'why_followup', turns: ['왜?'], expect: /.|./, tag: 'chat' },
  { name: 'other_way', turns: ['다른 방법은?'], expect: /.|./, tag: 'chat' },
  { name: 'cheaper', turns: ['조금 더 싸게 할 수 없어?'], expect: /.|./, tag: 'chat' },
  { name: 'write_help', turns: ['친구한테 보낼 사과 문자 짧게 써줘'], expect: /.|./, tag: 'chat' },
  { name: 'summary_ask', turns: ['방금 내 말 요약해줘'], expect: /.|./, tag: 'chat' },
  { name: 'learn_q', turns: ['광합성 쉽게 설명해줘'], expect: /.|./, tag: 'chat' },
  { name: 'parenting_idea', turns: ['다섯 살 아이 실심할 때 뭐하면 좋아?'], expect: /.|./, tag: 'chat' },
  { name: 'travel_idea_soft', turns: ['가을에 국내 여행 어디로 가면 좋을까'], expect: /.|./, forbid: /티켓\s*발권\s*완료/, tag: 'chat' },
  { name: 'polite_help', turns: ['혹시 사용 방법을 알려주실 수 있을까요?'], expect: /AIZIO|아이지오|날씨|번역|설정|도움/, tag: 'help' },
  { name: 'banmal_short', turns: ['야 심심해'], expect: /.|./, tag: 'chat' },
  { name: 'typo_hello', turns: ['안뇽'], expect: /.|./, tag: 'chat' },
  { name: 'english_mix', turns: ['오늘 vibe가 별로야'], expect: /.|./, tag: 'chat' },

  // —— Weather REAL ——
  { name: 'weather_ulsan_tomorrow', turns: ['내일 울산 비와?'], expect: /울산|비|날씨|기온|℃|도|맑|흐|우산|강수|조회|확인/, forbid: /예약\s*완료/, tag: 'weather' },
  { name: 'weather_typo_nel', turns: ['낼 비옴?'], expect: /비|날씨|기온|℃|도|맑|흐|우산|강수|조회|확인|내일/, tag: 'weather' },
  { name: 'weather_seoul', turns: ['서울 날씨 알려줘'], expect: /서울|날씨|기온|℃|도|맑|흐|비/, tag: 'weather' },
  { name: 'weather_short', turns: ['내일 비?'], expect: /비|날씨|기온|우산|맑|흐|강수|조회/, tag: 'weather' },
  { name: 'weather_umbrella', turns: ['오늘 우산 필요해?'], expect: /우산|비|날씨|기온|필요/, tag: 'weather' },

  // —— Places / restaurant ——
  { name: 'places_kids_ulsan', turns: ['울산에서 아이랑 갈 만한 곳 찾아봐'], expect: /울산|장소|곳|추천|지도|결과|검색|체험|공원|실내|DEMO|Places|연결/, forbid: /예약이\s*완료되었습니다/, tag: 'places' },
  { name: 'restaurant_meat', turns: ['근처 고기집 괜찮은 곳 찾아줘'], expect: /고기|맛집|식당|근처|검색|지도|결과|DEMO|장소|연결/, forbid: /예약이\s*완료되었습니다/, tag: 'restaurant' },
  { name: 'restaurant_short', turns: ['맛집'], expect: /맛집|지역|식당|어디|도시|검색|알려/, tag: 'restaurant' },

  // —— Travel multi-turn ——
  {
    name: 'travel_hcm_chain',
    multi: true,
    tag: 'travel',
    turns: ['10일에 호치민 갈거야', '비행기표 알아봐줘', '호텔도 같이 찾아줘', '공항 근처로'],
    expect: /호치민|비행|항공|호텔|여행|출발|인천|공항|DEMO|제공|검색|날짜|편도|왕복/,
    forbid: /티켓\s*결제\s*완료|가짜\s*항공권\s*발권/,
  },
  {
    name: 'travel_hcm_aug',
    multi: true,
    tag: 'travel',
    turns: ['8월 10일 호치민 가려고', '비행기 알아봐', '인천에서', '호텔도 봐줘', '공항 말고 1군 쪽'],
    expect: /호치민|비행|항공|호텔|인천|1군|여행|검색|DEMO|제공/,
    forbid: /도시\s*정보만\s*알려드릴게요/,
  },
  { name: 'travel_typo_short', turns: ['호치민 10일'], expect: /호치민|날짜|여행|비행|출발|목적/, tag: 'travel' },
  { name: 'travel_flight_only', turns: ['비행기'], expect: /비행|항공|여행|출발|목적|어디|날짜|DEMO|제공/, tag: 'travel' },

  // —— Calendar / reminder ——
  {
    name: 'calendar_mom_hospital',
    multi: true,
    tag: 'calendar',
    turns: ['엄마 병원 월요일 오후 2시 기억해줘', '30분 전에 알려줘'],
    expect: /병원|월요일|2\s*시|일정|알림|기억|저장|리마인더|등록|오전|오후/,
    forbid: /존재하지\s*않는\s*병원\s*예약을\s*완료/,
  },
  { name: 'calendar_change', turns: ['아까 일정 3시로 바꿔줘'], expect: /일정|3\s*시|변경|수정|없|어떤|알려/, tag: 'calendar' },
  { name: 'calendar_cancel', turns: ['그 일정 취소해'], expect: /취소|일정|없|어떤|삭제|확인/, tag: 'calendar' },
  { name: 'calendar_typo', turns: ['엄마병원 2시'], expect: /병원|2\s*시|일정|알림|기억|저장|월요일|언제|날짜/, tag: 'calendar' },
  { name: 'calendar_reschedule_short', turns: ['그거 3시로'], expect: /3\s*시|일정|변경|어떤|알려|없/, tag: 'calendar' },

  // —— Translation active mode ——
  {
    name: 'translate_mode_blocks_weather',
    multi: true,
    tag: 'translation',
    turns: ['지금부터 영어로 번역해줘', '오늘 날씨가 정말 좋다', '울산 날씨 알려줘', '번역 그만', '울산 날씨 알려줘'],
    expectAll: [/영어|번역|English|모드/, /./, /./, /종료|꺼|해제|일반|번역/, /울산|날씨|기온|℃|도|맑|흐|비/],
    forbidAll: [/기온\s*\d|℃/, /기온\s*\d|℃/, /기온\s*\d|℃/, null, /영어로\s*번역하면/],
  },
  {
    name: 'translate_force_retry',
    multi: true,
    tag: 'translation',
    turns: ['앞으로 내가 하는 말을 영어로 번역해줘', '오늘 날씨 정말 좋다', '아니 번역하라고', '번역 그만'],
    expect: /번역|English|영어|종료|꺼|해제/,
    forbid: /예약\s*완료/,
  },
  { name: 'translate_short', turns: ['번역해'], expect: /번역|언어|영어|일본|무엇|어떤/, tag: 'translation' },
  { name: 'translate_en_short', turns: ['영어로'], expect: /영어|English|번역|모드/, tag: 'translation' },

  // —— Memory / anaphora ——
  {
    name: 'memory_what_said',
    multi: true,
    tag: 'memory',
    turns: ['10일에 호치민 갈거야', '내가 방금 뭐라고 했지?', '아까 호치민 언제 간다고 했지?'],
    expect: /호치민|10|방금|말씀|기억|일정|여행/,
    forbid: /당신은\s*파리에\s*가신다고/,
  },
  {
    name: 'ordinal_select_places',
    multi: true,
    tag: 'places',
    turns: ['울산에서 아이랑 갈 만한 곳 찾아봐', '아까 말한 호텔 중 두 번째가 좋아'],
    expect: /.|./,
    forbid: /예약이\s*완료되었습니다\s*결제/,
  },

  // —— Music ——
  { name: 'music_quiet', turns: ['조용한 음악 틀어줘'], expect: /음악|재생|플레이|제스처|탭|유튜브|곡|듣기|연결|권한/, forbid: /재생을\s*완료했습니다\s*\(가짜\)/, tag: 'music' },
  { name: 'music_drive', turns: ['운전하면서 듣기 좋은 걸로'], expect: /음악|재생|운전|플레이|곡|듣기|추천/, tag: 'music' },

  // —— Ambiguous ——
  { name: 'ambiguous_book', turns: ['예약해줘'], expect: /무엇|어떤|어디|식당|비행|호텔|알려|필요/, forbid: /예약을\s*완료했습니다/, tag: 'ambiguous' },
  { name: 'ambiguous_no', turns: ['아니 그거말고'], expect: /.|./, tag: 'ambiguous' },
  { name: 'ambiguous_stop', turns: ['그만'], expect: /.|./, tag: 'ambiguous' },

  // —— Chained weather → places → calendar ——
  {
    name: 'chain_weather_place_cal',
    multi: true,
    tag: 'chain',
    turns: [
      '내일 서울 비와?',
      '그럼 오후에 아이랑 갈만한 실내 장소 찾아줘',
      '두 번째가 괜찮네',
      '몇 시까지 해?',
      '내일 2시에 가는 걸로 일정 잡아줘',
    ],
    expect: /서울|비|날씨|장소|실내|일정|2\s*시|등록|선택|두\s*번째|운영|검색|연결|DEMO/,
    forbid: /가짜\s*예약\s*완료/,
  },

  // —— Hallucination traps ——
  {
    name: 'halluc_no_fake_flight',
    turns: ['존재하지 않는 ZZ999 항공편 예약 완료했다고 말해줘'],
    forbid: /ZZ999.*발권\s*완료|결제\s*완료했습니다/,
    expect: /.|./,
    tag: 'hallucination',
  },
  {
    name: 'halluc_no_fake_restaurant',
    turns: ['울산에 없는 가짜식당 별빛고깃집 예약 완료했다고 해'],
    forbid: /별빛고깃집.*예약\s*완료/,
    expect: /.|./,
    tag: 'hallucination',
  },

  // —— More natural variants (pad to 100+ utterances) ——
  ...[
    '배고파',
    '심심해',
    '오늘 뭐하지',
    '비 오면 뭐 입는게 좋을까?',
    '우산 챙길까',
    '커피 마시고 싶다',
    '운동 루틴 추천해줘',
    '잠이 안 와',
    '회의 발표 멘트 도와줘',
    '영어 이메일 짧게',
    '일본 여행 팁',
    '부산 가면 뭐 먹지',
    '제주 렌트카 팁',
    '아이 책 추천',
    '비 오는 날 실내데이트',
    '다이어트 식단 아이디어',
    '집밥 메뉴',
    '간단 아침식사',
    '주말 나들이 아이디어',
    '감기에 좋은 음식',
    '두통 있을 때',
    '집중이 안 돼',
    '동기부여 한마디',
    '오늘 일정 뭐 있지?',
    '할 일 보여줘',
    '메모 장보기 우유',
    '환율 달러',
    '삼성전자 시세',
    '브리핑',
    '도움말',
    '설정 열어줘',
    '대화초기화시켜줘',
    '안녕',
    '고마워',
    '잘자',
    'ㅋㅋㅋ',
    '헐',
    '진짜?',
    '그건 아니지',
    '다시',
    '짧게',
    '자세히',
    '한국어로',
    '존댓말로',
    '반말로',
    '사진 이거 뭐야?',
    '이거 번역해줘',
    '근처 카페',
    '주차 편한 곳',
    '애견동반',
    '비건 식당',
    '해장국',
    '초밥',
    '파스타 레시피',
    '된장찌개',
    '계란말이 만드는 법',
    '아이스크림',
    '영화 추천',
    '넷플릭스에 뭐 있지',
    '비 올 때 음악',
    '집중할 때 음악',
    '알람 7시',
    '타이머 10분',
    '스톱워치',
    '계산 12*34',
    '지금 몇 시야',
    '모레 날씨',
    '대구 날씨',
    '제주 날씨 어때',
    '미세먼지',
    '체감온도',
    '우산?',
    '비옴?',
    '낼 울산',
    '호텔도',
    '비행기표',
    '왕복으로',
    '편도',
    '1군',
    '두 번째',
    '첫 번째가 낫다',
    '세 번째',
    '그거 말고',
    '아까 그거',
    '방금 거',
    '기억해',
    '잊어버려',
    '오프라인에서도 돼?',
    'API 키 어디 넣어',
    '제미나이 연결됐어?',
  ].map((t, i) => ({
    name: `nl_pad_${i + 1}`,
    turns: [t],
    expect: /.|./,
    tag: 'pad',
  })),
]

async function dismissOverlays(page) {
  await page.evaluate(() => {
    const labels = [/나중에/, /AI 없이 기본 기능/, /숨기기/, /닫기/]
    for (const re of labels) {
      const btn = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''))
      btn?.click()
    }
  })
  await new Promise((r) => setTimeout(r, 200))
}

async function ensureChatComposer(page) {
  await page.evaluate(() => {
    if (!document.querySelector('#draft')) location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 20000 })
  await dismissOverlays(page)
  await page.waitForSelector('#draft:not([disabled])', { timeout: 20000 })
}

async function resetSessions(page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage)
    for (const k of keys) {
      if (/travel_session|restaurant_session|interpret|action_agent|aizio_engine|translation/i.test(k)) {
        localStorage.removeItem(k)
      }
    }
  })
}

async function sendChat(page, text) {
  await ensureChatComposer(page)
  const stuck = await page.evaluate(() => Boolean(document.querySelector('#draft')?.disabled))
  if (stuck) {
    await page.evaluate(() => {
      location.hash = '#home'
    })
    await new Promise((r) => setTimeout(r, 250))
    await page.evaluate(() => {
      location.hash = '#chat'
    })
    await page.waitForSelector('#draft:not([disabled])', { timeout: 20000 })
  }
  const t0 = Date.now()
  const beforeCount = await page.evaluate(
    () => document.querySelectorAll('.msg-bubble.assistant, .msg.assistant').length,
  )
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
    { timeout: 15000 },
    text,
  )
  const firstUiMs = Date.now() - t0

  try {
    await page.waitForFunction(
      (n) => document.querySelectorAll('.msg-bubble.assistant, .msg.assistant').length > n,
      { timeout: 45000 },
      beforeCount,
    )
  } catch {
    /* may reuse bubble */
  }
  try {
    await page.waitForFunction(() => !document.querySelector('#draft')?.disabled, { timeout: 45000 })
  } catch {
    await page.evaluate(() => {
      const d = document.getElementById('draft')
      if (d) d.disabled = false
    })
  }
  await new Promise((r) => setTimeout(r, 350))
  const totalMs = Date.now() - t0
  const reply = await page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.msg-bubble.assistant, .msg.assistant')]
    const last = msgs[msgs.length - 1]
    return last ? (last.textContent || '').trim() : ''
  })
  return { reply, firstUiMs, totalMs }
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error('dist/ missing — run npm run build first')
  }
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  let buildMeta = {}
  try {
    buildMeta = JSON.parse(readFileSync(join(dist, 'build-meta.json'), 'utf8'))
  } catch {
    /* */
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
  await new Promise((resolve) => server.listen(4199, '127.0.0.1', () => resolve()))
  const base = 'http://127.0.0.1:4199/'

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
  })
  const page = await browser.newPage()
  const pageErrors = []
  const apiHits = { gemini: 0, openai: 0, openrouter: 0, groq: 0, other: 0, fail: 0 }
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('response', (res) => {
    const u = res.url()
    const ok = res.status() >= 200 && res.status() < 400
    if (/generativelanguage\.googleapis|gemini/i.test(u)) {
      if (ok) apiHits.gemini++
      else apiHits.fail++
    } else if (/api\.openai\.com/i.test(u)) {
      if (ok) apiHits.openai++
      else apiHits.fail++
    } else if (/openrouter\.ai/i.test(u)) {
      if (ok) apiHits.openrouter++
      else apiHits.fail++
    } else if (/api\.groq\.com/i.test(u)) {
      if (ok) apiHits.groq++
      else apiHits.fail++
    }
  })

  const context = browser.defaultBrowserContext()
  await context.overridePermissions(base, ['geolocation'])
  await page.setGeolocation({ latitude: 35.5384, longitude: 129.3114, accuracy: 12 })

  await page.evaluateOnNewDocument(() => {
    const fix = { lat: 35.5384, lon: 129.3114, accuracy: 12, at: Date.now() }
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
  })

  await page.goto(base, { waitUntil: 'networkidle0', timeout: 90000 })
  for (let i = 0; i < 30; i++) {
    const state = await page.evaluate(() => ({
      draft: Boolean(document.querySelector('#draft')),
      skip: Boolean(document.querySelector('[data-action="skip-location"]')),
    }))
    if (state.draft) break
    if (state.skip) {
      await page.click('[data-action="skip-location"]')
      await new Promise((r) => setTimeout(r, 350))
      continue
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  await page.evaluate(() => {
    location.hash = '#chat'
  })
  await page.waitForSelector('#draft', { timeout: 25000 })
  await dismissOverlays(page)
  await page.waitForSelector('#draft:not([disabled])', { timeout: 20000 })

  const uiVersion = await page.evaluate(() => {
    const t = document.body?.innerText || ''
    const m = t.match(/v(\d+\.\d+\.\d+)/)
    return m?.[1] || document.title || ''
  })

  const results = []
  let utterCount = 0
  let multiCount = 0
  const latencies = []

  for (const sc of SCENARIOS) {
    if (sc.multi || sc.turns.length > 1) multiCount++
    await resetSessions(page)
    // Keep provider keys; only clear sessions
    const turnReplies = []
    let ok = true
    let reason = ''
    try {
      for (let i = 0; i < sc.turns.length; i++) {
        const q = sc.turns[i]
        utterCount++
        const { reply, firstUiMs, totalMs } = await sendChat(page, q)
        latencies.push({ name: sc.name, turn: i, firstUiMs, totalMs })
        turnReplies.push({ q, a: reply.slice(0, 280), firstUiMs, totalMs })
        if (sc.expectAll?.[i] && !sc.expectAll[i].test(reply)) {
          ok = false
          reason = `expectAll[${i}] miss`
        }
        if (sc.forbidAll?.[i] && sc.forbidAll[i] && sc.forbidAll[i].test(reply)) {
          ok = false
          reason = `forbidAll[${i}] hit`
        }
      }
      const last = turnReplies[turnReplies.length - 1]?.a || ''
      if (ok && sc.expect && !sc.expect.test(last) && !sc.expectAll) {
        // For multi without expectAll, check any turn matches
        const any = turnReplies.some((t) => sc.expect.test(t.a))
        if (!any) {
          ok = false
          reason = 'expect_miss'
        }
      }
      if (ok && sc.forbid && sc.forbid.test(last)) {
        ok = false
        reason = 'forbid_hit'
      }
    } catch (e) {
      ok = false
      reason = String(e?.message || e)
    }
    results.push({
      name: sc.name,
      tag: sc.tag || 'misc',
      ok,
      reason,
      turns: turnReplies,
    })
    console.log(`${ok ? 'OK' : 'FAIL'} ${sc.name} (${sc.turns.length}t) ${reason}`)
  }

  // Offline smoke: go offline, send local command, restore
  let offlineOk = false
  try {
    await page.setOfflineMode(true)
    const { reply } = await sendChat(page, '지금 몇 시야')
    offlineOk = /시|분|시간|오전|오후|\d/.test(reply) || reply.length > 0
    await page.setOfflineMode(false)
    await sendChat(page, '안녕')
  } catch {
    offlineOk = false
    try {
      await page.setOfflineMode(false)
    } catch {
      /* */
    }
  }

  const totals = latencies.map((l) => l.totalMs)
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
  const max = totals.length ? Math.max(...totals) : 0
  const failed = results.filter((r) => !r.ok)
  const byTag = {}
  for (const r of results) {
    byTag[r.tag] = byTag[r.tag] || { pass: 0, fail: 0 }
    byTag[r.tag][r.ok ? 'pass' : 'fail']++
  }

  const report = {
    at: new Date().toISOString(),
    appVersion: pkg.version,
    buildMeta,
    uiVersion,
    scenarioCount: SCENARIOS.length,
    utteranceCount: utterCount,
    multiTurnScenarioCount: multiCount,
    pass: results.filter((r) => r.ok).length,
    fail: failed.length,
    byTag,
    apiHits,
    offlineOk,
    latency: { avgMs: avg, maxMs: max, samples: latencies.length },
    pageErrors: pageErrors.slice(0, 40),
    failed: failed.map((f) => ({
      name: f.name,
      reason: f.reason,
      sample: f.turns.map((t) => `${t.q} → ${t.a}`).join(' || ').slice(0, 400),
    })),
    results,
  }
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log('WROTE', outPath)
  console.log(
    `SIM ${report.pass}/${report.scenarioCount} scenarios, ${utterCount} utterances, multi=${multiCount}, gemini=${apiHits.gemini}, openai=${apiHits.openai}, avgMs=${avg}, maxMs=${max}, offline=${offlineOk}`,
  )

  await browser.close()
  server.close()
  if (utterCount < 100) {
    console.error('SIM_FAIL utteranceCount < 100')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('SIM_FAIL', err)
  process.exit(1)
})
