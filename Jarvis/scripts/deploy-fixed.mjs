/**
 * Deploy JARVIS to ShipStatic and point the fixed platform domain at it.
 *
 * Requires SHIP_API_KEY (never commit this).
 * Fixed URL: https://jarvis-app.shipstatic.com
 *
 *   SHIP_API_KEY=... npm run deploy:web
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

function loadApiKey() {
  if (process.env.SHIP_API_KEY) return process.env.SHIP_API_KEY.trim()
  if (process.env.SHIPSTATIC_API_KEY) return process.env.SHIPSTATIC_API_KEY.trim()
  for (const file of [join(root, '.ship-api-key'), join(homedir(), '.ship-api-key')]) {
    try {
      if (existsSync(file)) {
        const raw = readFileSync(file, 'utf8').trim()
        if (raw) return raw
      }
    } catch {
      /* ignore */
    }
  }
  // ship CLI config (~/.shiprc may be JSON or KEY=VALUE)
  try {
    const rc = join(homedir(), '.shiprc')
    if (existsSync(rc)) {
      const text = readFileSync(rc, 'utf8')
      try {
        const j = JSON.parse(text)
        if (j.apiKey || j.api_key) return String(j.apiKey || j.api_key)
      } catch {
        const m = text.match(/api[_-]?key["\s:=]+(ship-[a-f0-9]+)/i)
        if (m) return m[1]
      }
    }
  } catch {
    /* ignore */
  }
  return ''
}

const apiKey = loadApiKey()
const domainHost = (() => {
  const raw = (process.env.SHIP_DOMAIN || 'jarvis-app').trim().toLowerCase()
  return raw.includes('.') ? raw : `${raw}.shipstatic.com`
})()

function runShip(args) {
  const res = spawnSync('npx', ['-y', '@shipstatic/ship', ...args, '--api-key', apiKey, '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const out = (res.stdout || '').trim()
  const err = (res.stderr || '').trim()
  if (res.status !== 0) {
    throw new Error(err || out || `ship failed: ${args.join(' ')}`)
  }
  return out
}

function parseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function main() {
  if (!apiKey) {
    console.error(`
SHIP_API_KEY 가 없습니다. Cursor 채팅에 키를 붙여 넣거나
Jarvis/.ship-api-key 파일에 한 줄로 저장하세요 (git 무시됨).
목표 고정 주소: https://${domainHost}
`)
    process.exit(1)
  }

  if (!existsSync(join(dist, 'index.html'))) {
    console.error('dist/ 없음 — 먼저 npm run build')
    process.exit(1)
  }

  console.log('Uploading deployment…')
  const uploaded = parseJson(runShip(['deployments', 'upload', dist]))
  if (!uploaded?.deployment && !uploaded?.url) {
    throw new Error(`unexpected upload response: ${JSON.stringify(uploaded)}`)
  }
  const deployId = String(uploaded.deployment || uploaded.url)
    .replace(/^https?:\/\//, '')
    .replace(/\.shipstatic\.com\/?$/, '')
  const snapshot = uploaded.url || `https://${deployId}.shipstatic.com`
  console.log(`Deployment: ${deployId}`)
  console.log(`Snapshot:   ${snapshot}`)

  console.log(`Pointing ${domainHost} → ${deployId} …`)
  const linked = parseJson(runShip(['domains', 'set', domainHost, deployId]))
  const fixed = linked?.url || `https://${domainHost}`
  console.log(`\nFIXED_URL ${fixed}`)
  console.log('Updates keep this same address.')
}

main().catch((err) => {
  console.error('DEPLOY_FIXED_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
