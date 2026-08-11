/**
 * Preview deploy for AIZIO CAMPUS (does NOT repoint fixed domain).
 *   npm run deploy:preview
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'

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
  return ''
}

function runShip(args, apiKey) {
  const res = spawnSync('npx', ['-y', '@shipstatic/ship', ...args, '--api-key', apiKey, '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const out = (res.stdout || '').trim()
  const err = (res.stderr || '').trim()
  if (res.status !== 0) throw new Error(err || out || `ship failed`)
  return out
}

function parseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

const apiKey = loadApiKey()
if (!apiKey) {
  console.error('SHIP_API_KEY missing')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
writeFileSync(
  join(root, 'public/build-meta.json'),
  JSON.stringify(
    {
      app: 'AIZIO CAMPUS',
      version: pkg.version,
      buildId: `preview-${Date.now()}`,
      commit: gitCommit(),
      channel: 'preview',
      builtAt: new Date().toISOString(),
      productionUrl: 'https://aizio-campus.shipstatic.com',
      note: 'Preview snapshot — not fixed domain',
    },
    null,
    2,
  ) + '\n',
)

const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status || 1)

const uploaded = parseJson(runShip(['deployments', 'upload', dist], apiKey))
const url = uploaded?.url || (uploaded?.deployment ? `https://${uploaded.deployment}.shipstatic.com` : '')
console.log(`REVIEW_URL=${url}`)
console.log(`VERSION=${pkg.version}`)
