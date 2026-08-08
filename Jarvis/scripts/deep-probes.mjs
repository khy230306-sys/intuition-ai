/**
 * Deep conversational probes for real-user gaps.
 */
const store = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  },
})
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    onLine: true,
    language: 'ko-KR',
    geolocation: { getCurrentPosition: (_o, e) => e?.({ code: 1 }) },
    userAgent: 'qa',
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

async function probe(label, lines) {
  store.clear()
  resetActionAgentForTests()
  clearTravelSession()
  clearRestaurantSession()
  clearInterpretMode()
  endTranslationSession()
  console.log('\n====', label)
  for (const q of lines) {
    const r = await think(q)
    console.log('Q:', q)
    console.log('A:', (r.text || '').slice(0, 280).replace(/\n/g, ' | '))
    if (r.view) console.log('view:', r.view)
  }
}

await probe('근처맛집+위치없음', ['근처 맛집 찾아줘'])
await probe('호텔만', ['오사카 호텔 찾아줘'])
await probe('음악 variants', ['음악 틀어줘', '아이유 노래 틀어줘', '유튜브에서 잔잔한 음악'])
await probe('how-to variants', ['비행기 예약하는 방법', '항공권은 어떻게 사나요', '제주도 여행 팁 알려줘'])
await probe('짧은대답 여행', ['비행기 찾아줘', '도쿄', '다음주 금', '왕복', '다다음주 월', '2명', '인천'])
await probe('맛집후 선택', ['나트랑 맛집좀 찾아줘', '두 번째', '7시 돼?'])
await probe('번역 oneshot', ['일본어로 번역해 안녕하세요'])
await probe('잡담', ['심심해', '농담해줘', '사랑해'])
await probe('게임', ['벽돌깨기 할래'])
await probe('호치민 중의성', ['호치민 알려줘'])
await probe('일정', ['내일 오후 3시 회의 일정 추가해줘', '오늘 일정 알려줘'])
await probe('가족외식 AA경로', ['오늘 저녁 가족들이랑 외식하려고', '울산 삼산', '4명'])
await probe('리스트후 다시검색', ['나트랑 맛집좀 찾아줘', '그냥 맛집 리스트만줘'])
