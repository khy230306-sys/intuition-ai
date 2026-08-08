/**
 * Live chat probe — seeds app-owned keys and runs think() like a user.
 * Usage: npx tsx scripts/chat-ai-probe.mjs [out.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
try {
  const env = readFileSync(join(root, '.env.production.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch {
  /* */
}

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
  value: { onLine: true, language: 'ko-KR', userAgent: 'AIZIO-ChatProbe/1.0' },
})
globalThis.window = globalThis
Object.defineProperty(globalThis, 'location', {
  configurable: true,
  value: {
    hostname: 'localhost',
    origin: 'http://localhost',
    href: 'http://localhost/',
    protocol: 'http:',
  },
})
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  body: { appendChild() {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
}
globalThis.Notification = {
  permission: 'granted',
  requestPermission: async () => 'granted',
}
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: {
    randomUUID: () => `id-${Math.random().toString(16).slice(2)}`,
    getRandomValues: (a) => {
      for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0
      return a
    },
  },
})

const { seedAppOwnedProvidersFromBuild } = await import('../src/ai-providers/appOwnedSeed.ts')
const { hasAnyConfiguredProvider } = await import('../src/ai-providers/index.ts')
const { think } = await import('../src/brain.ts')
const { routeCommand } = await import('../src/commandRouter/router.ts')
const { detectLifestyleRecommend } = await import('../src/lifestyleRecommend.ts')

seedAppOwnedProvidersFromBuild()
console.log('providers configured:', hasAnyConfiguredProvider())

const probes = [
  '안녕',
  '오늘 뭐하면 좋을까?',
  '김치찌개 만드는 법 알려줘',
  '스트레스 받을 때 어떻게 해?',
  '아이랑 주말에 뭐하면 좋을까?',
  'AIZIO는 뭐 할 수 있어?',
  '내일 울산 날씨 어때?',
  '간단한 농담 하나 해줘',
  '영화 추천해줘',
  '맛집 추천해줘',
]

const results = []
for (const q of probes) {
  const routed = routeCommand({ text: q })
  const t0 = Date.now()
  let a = ''
  let err = ''
  try {
    const r = await think(q)
    a = (r.text || '').trim()
  } catch (e) {
    err = e instanceof Error ? e.message : String(e)
  }
  const row = {
    q,
    intent: routed.intent,
    requiresAI: routed.requiresAI,
    lifestyle: detectLifestyleRecommend(q),
    ms: Date.now() - t0,
    a: a.slice(0, 500),
    err,
    looksLocalTemplate:
      /API 키를 넣지 않아도|말씀 이해했어요|【생활 추천】|내장 AIZIO/.test(a) ||
      /^안녕하세요, .+잘 지내셨나요/.test(a),
  }
  results.push(row)
  console.log('\n===', q)
  console.log(
    JSON.stringify({
      intent: row.intent,
      requiresAI: row.requiresAI,
      lifestyle: row.lifestyle,
      ms: row.ms,
      looksLocal: row.looksLocalTemplate,
    }),
  )
  console.log((a || err).slice(0, 350))
}

mkdirSync('/opt/cursor/artifacts', { recursive: true })
const out = process.argv[2] || '/opt/cursor/artifacts/chat-ai-probe.json'
writeFileSync(out, JSON.stringify(results, null, 2))
console.log('\nWrote', out)
