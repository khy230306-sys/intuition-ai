/**
 * Real-user exploratory QA — drives think() like a person using AIZIO.
 * Reports gaps, wrong-domain replies, loops, and dead ends.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = '/opt/cursor/artifacts'
mkdirSync(outDir, { recursive: true })

// Minimal DOM storage for Node/vitest-less run via tsx/vite-node
const store = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  },
})
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    onLine: true,
    language: 'ko-KR',
    geolocation: {
      getCurrentPosition: (_ok, err) => {
        err?.({ code: 1, message: 'denied' })
      },
    },
    userAgent: 'AIZIO-RealUserQA/1.0',
  },
})
if (!globalThis.window) globalThis.window = globalThis
if (!globalThis.document) {
  globalThis.document = {
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    body: { appendChild() {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
  }
}

const { think } = await import('../src/brain.ts')
const { resetActionAgentForTests } = await import('../src/actionAgent/index.ts')
const { clearTravelSession } = await import('../src/travelAgent/session.ts')
const { clearRestaurantSession } = await import('../src/restaurantAgent/session.ts')
const { endTranslationSession } = await import('../src/commandRouter/session.ts')
const { clearInterpretMode } = await import('../src/translateBrain.ts')
const { clearChat } = await import('../src/storage.ts')

function resetAll() {
  store.clear()
  resetActionAgentForTests()
  clearTravelSession()
  clearRestaurantSession()
  clearInterpretMode()
  endTranslationSession()
  try {
    clearChat()
  } catch {
    /* */
  }
}

/** @type {{ id: string, severity: string, title: string, detail: string, turns?: any[] }[]} */
const findings = []
/** @type {{ name: string, ok: boolean, turns: {q:string,a:string}[], note?: string }[]} */
const journeys = []

function note(severity, title, detail, turns) {
  findings.push({ id: `F${findings.length + 1}`, severity, title, detail, turns })
}

async function say(text) {
  const r = await think(text)
  return {
    q: text,
    a: (r.text || '').trim(),
    view: r.view,
    clearChat: r.clearChat,
    raw: r,
  }
}

async function runJourney(name, steps, check) {
  resetAll()
  const turns = []
  try {
    for (const step of steps) {
      const t = await say(typeof step === 'string' ? step : step.q)
      turns.push(t)
      if (typeof step === 'object' && step.expect && !step.expect.test(t.a)) {
        journeys.push({
          name,
          ok: false,
          turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
          note: `expect miss on 「${t.q}」 → ${t.a.slice(0, 120)}`,
        })
        return { ok: false, turns }
      }
      if (typeof step === 'object' && step.forbid && step.forbid.test(t.a)) {
        journeys.push({
          name,
          ok: false,
          turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
          note: `forbid hit on 「${t.q}」`,
        })
        return { ok: false, turns }
      }
    }
    if (check) {
      const c = check(turns)
      if (c && !c.ok) {
        journeys.push({
          name,
          ok: false,
          turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
          note: c.note,
        })
        return { ok: false, turns }
      }
    }
    journeys.push({
      name,
      ok: true,
      turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
    })
    return { ok: true, turns }
  } catch (e) {
    journeys.push({
      name,
      ok: false,
      turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
      note: String(e),
    })
    return { ok: false, turns }
  }
}

console.log('=== Real-user exploratory QA ===\n')

// --- Journeys ---
await runJourney(
  '맛집 리스트 browse (나트랑)',
  [
    { q: '나트랑 맛집좀 찾아줘', expect: /DEMO|맛집|식당/, forbid: /몇 명이서|인원을 숫자/ },
  ],
  (turns) => {
    if (/몇 명이서|인원을 숫자/.test(turns[0].a))
      return { ok: false, note: 'party-size trap still present' }
    return { ok: true }
  },
)

await runJourney('맛집 → 리스트만 탈출', [
  { q: '오늘 저녁 가족들이랑 외식하려고', expect: /지역/ },
  { q: '나트랑' },
  { q: '그냥 맛집 리스트만줘', forbid: /인원을 숫자로 알려/ },
])

await runJourney('여행 멀티턴 + 이어말하기', [
  { q: '여행 준비 좀 도와줘', expect: /날짜|출발|목적/ },
  { q: '8월10 호치민으로갈꺼야', forbid: /도시 정보|시차|인구/ },
  { q: '부산에서 출발', forbid: /도시 정보/ },
  { q: '왕복이야 14일 돌아와' },
])

await runJourney('여행 중 글로벌 리셋', [
  { q: '제주도 비행기 알아봐줘' },
  { q: '대화초기화시켜줘', expect: /초기화/, forbid: /제공자가 연결되지|항공 검색에 필요한/ },
  { q: '안녕', forbid: /제공자가 연결되지|항공 검색/ },
])

await runJourney('번역 모드 중 날씨 금지', [
  { q: '영어로 번역해줘', expect: /영어|번역/ },
  { q: '오늘 날씨 어때?', forbid: /기온|℃|습도|맑음|비\s*올/ },
  { q: '번역 종료', expect: /종료/ },
])

await runJourney('날씨 (키 없이)', [
  { q: '오늘 날씨 알려줘', expect: /날씨|기온|℃|도|맑|흐림|비|습도|DEMO|조회|확인|위치/ },
])

await runJourney('브리핑', [{ q: '브리핑', expect: /브리핑|오늘|할\s*일|일정|알림|목표|Brief/ }])

await runJourney('할일', [
  { q: '할 일 장보기 추가', expect: /할\s*일|장보기|추가|등록|목록/ },
])

await runJourney('알림', [
  { q: '알림 30분 뒤 약', expect: /알림|예약|30|약|저장/ },
])

await runJourney('환율', [{ q: '100달러 환율', expect: /원|USD|달러/ }])

await runJourney('지출 한줄', [{ q: '커피 4500', expect: /4,?500|지출|카페|커피/ }])

await runJourney('시세', [
  {
    q: '삼성전자 시세',
    expect: /삼성|시세|원|주가|005930|KRX|불러|가격|실패|네트워크|스냅|DEMO|조회/,
  },
])

await runJourney('장시간', [{ q: '장시간', expect: /KRX|개장|장전|장후|휴장|장\s*시/ }])

await runJourney('how-to 예약 ≠ 예약 시작', [
  {
    q: '비행기 예약하는 방법 알려줘',
    expect: /방법|절차|팁|안내|하는\s*법|어떻게|항공/,
    forbid: /편도인가요|왕복인가요|예약이 완료|결제 완료/,
  },
])

await runJourney('길안내', [
  { q: '역삼동으로 안내해줘', expect: /역삼|길|안내|지도|검색|결과|장소|선택|네비|Navigation|경로/ },
])

await runJourney('음악', [
  { q: '잔잔한 음악 틀어줘', expect: /음악|유튜브|재생|플레이|열|검색|곡/ },
])

await runJourney('도움말', [{ q: '도움말', expect: /날씨|할\s*일|알림|번역|설정|AIZIO|아이지오/ }])

await runJourney('도시정보 vs 여행 혼동', [
  { q: '호치민 알려줘' },
  { q: '거기로 비행기표 알아봐줘', forbid: /도시 정보만/ },
])

await runJourney('맛집 후 여행 전환', [
  { q: '울산 삼산 맛집' },
  { q: '제주도 비행기 찾아줘', expect: /제주|비행|항공|여행|날짜|DEMO|편도|왕복|제공/ },
])

await runJourney('짧은 대답 컨텍스트', [
  { q: '여행 준비해줘' },
  { q: '도쿄' },
  { q: '다음주 금요일' },
])

await runJourney('취소/그만 단독 (번역 아닐 때)', [
  { q: '취소' },
  { q: '그만' },
])

await runJourney('AI 없는 잡담', [
  { q: '오늘 기분이 어때?', forbid: /제공자가 연결되지 않아 실제 목록/ },
])

await runJourney('근처 맛집 (위치 권한 없음)', [
  { q: '근처 맛집 찾아줘' },
])

await runJourney('호텔만', [
  { q: '오사카 호텔 찾아줘' },
])

await runJourney('캘린더 생성 요청', [
  { q: '내일 오후 3시 회의 일정 추가해줘' },
])

await runJourney('주차 위치', [
  { q: '주차 위치 기억해줘 B2 15번' },
  { q: '내가 주차한 곳 알려줘' },
])

// Analyze journeys for patterns
for (const j of journeys) {
  if (!j.ok) {
    note('high', `여정 실패: ${j.name}`, j.note || 'expect/forbid', j.turns)
  }
}

// Heuristic scans across successful+failed turns
for (const j of journeys) {
  for (const t of j.turns) {
    if (/음성을 잘 듣지 못했어요/.test(t.a)) {
      note('high', '의미 있는 발화가 음성 실패로 떨어짐', `「${t.q}」→ ${t.a.slice(0, 80)}`, [
        t,
      ])
    }
    if (/AI가 연결되지 않았습니다|AI 키가 없어|LOCAL_NO_AI|기본 기능만/.test(t.a) && /기분|잡담|어때/.test(t.q)) {
      note(
        'medium',
        'AI 키 없이 잡담 시 차가운 거부감',
        `「${t.q}」→ ${t.a.slice(0, 120)}`,
        [t],
      )
    }
    if (/제공자가 연결되지|NEEDS_PROVIDER|제공자 연결 필요/.test(t.a)) {
      note(
        'medium',
        'Provider 미연결로 실사용 막힘',
        `여정 ${j.name}: 「${t.q}」→ ${t.a.slice(0, 140)}`,
        [t],
      )
    }
    if (/DEMO/.test(t.a) && /(예약|결제|확정)/.test(t.a) && !/DEMO|데모|실제/.test(t.a)) {
      note('high', 'DEMO인데 실제 확정처럼 들릴 수 있음', t.a.slice(0, 160), [t])
    }
  }
}

// Specific deep probes
resetAll()
{
  const turns = []
  turns.push(await say('나트랑 맛집좀 찾아줘'))
  turns.push(await say('그냥 맛집 리스트만줘'))
  // If first already listed, second might re-search or confuse
  if (/몇 명이서|인원을 숫자/.test(turns[0].a)) {
    note('critical', '나트랑 맛집 still asks party', turns[0].a, turns)
  }
  if (
    turns[0].a.includes('DEMO') &&
    /몇 명이서|인원을 숫자|어느 지역/.test(turns[1].a)
  ) {
    note(
      'medium',
      '리스트 받은 뒤 「리스트만」 재요청이 다시 슬롯질문으로 감',
      turns[1].a.slice(0, 160),
      turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
    )
  }
}

resetAll()
{
  const turns = []
  for (const q of [
    '여행 준비해줘',
    '8월10일',
    '호치민',
    '부산',
    '왕복',
    '8월14일',
    '1명',
  ]) {
    turns.push(await say(q))
  }
  const last = turns[turns.length - 1].a
  if (/제공자|연결되지|DEMO|항공|비행/.test(last)) {
    /* expected end states */
  } else if (/음성을 잘|모르겠/.test(last)) {
    note('high', '여행 슬롯 다 채운 뒤에도 애매한 응답', last.slice(0, 160), turns)
  }
  // Check if mid-turn lost context to city info
  for (const t of turns) {
    if (/【도시 정보】|시차는|인구는/.test(t.a) && !/항공|비행|여행/.test(t.a)) {
      note('critical', '여행 중 도시정보로 이탈', `「${t.q}」`, [
        { q: t.q, a: t.a.slice(0, 200) },
      ])
    }
  }
  journeys.push({
    name: '여행 슬롯 완전 채우기',
    ok: !turns.some((t) => /【도시 정보】/.test(t.a) && !/항공|비행/.test(t.a)),
    turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 200) })),
  })
}

resetAll()
{
  // Rapid topic switch stress
  const qs = [
    '오늘 날씨',
    '삼성전자 시세',
    '커피 4500',
    '나트랑 맛집',
    '번역해줘 안녕하세요 영어로',
    '제주 비행기',
    '대화 초기화',
  ]
  const turns = []
  for (const q of qs) turns.push(await say(q))
  journeys.push({
    name: '빠른 주제 전환 스트레스',
    ok: true,
    turns: turns.map(({ q, a }) => ({ q, a: a.slice(0, 180) })),
  })
  // After clear, should be clean
  const after = await say('호치민')
  if (/제공자|항공 검색에 필요한/.test(after.a)) {
    note(
      'high',
      '대화 초기화 후에도 여행 Provider 잔상',
      after.a.slice(0, 140),
      [{ q: '호치민', a: after.a.slice(0, 200) }],
    )
  }
}

// Deduplicate findings by title+detail prefix
const seen = new Set()
const uniq = []
for (const f of findings) {
  const k = f.title + '|' + (f.detail || '').slice(0, 80)
  if (seen.has(k)) continue
  seen.add(k)
  uniq.push(f)
}

const report = {
  at: new Date().toISOString(),
  versionHint: '1.29.5 think()-level',
  journeySummary: {
    total: journeys.length,
    passed: journeys.filter((j) => j.ok).length,
    failed: journeys.filter((j) => !j.ok).length,
  },
  findings: uniq.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 }
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
  }),
  journeys,
}

writeFileSync(join(outDir, 'real-user-qa-report.json'), JSON.stringify(report, null, 2))

console.log('\n=== Journey results ===')
for (const j of journeys) {
  console.log(`${j.ok ? 'PASS' : 'FAIL'}  ${j.name}${j.note ? ' — ' + j.note : ''}`)
}
console.log('\n=== Findings ===')
for (const f of uniq) {
  console.log(`[${f.severity}] ${f.title}`)
  console.log(`  ${f.detail}`)
}
console.log(`\nWrote ${join(outDir, 'real-user-qa-report.json')}`)
console.log(`Journeys ${report.journeySummary.passed}/${report.journeySummary.total} pass, findings=${uniq.length}`)
