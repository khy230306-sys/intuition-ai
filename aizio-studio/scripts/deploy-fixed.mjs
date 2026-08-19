/**
 * Deploy AIZIO Studio to FIXED ShipStatic domain.
 *
 *   https://aizio-studio.shipstatic.com
 *
 *   npm run deploy:web
 */
import { spawnSync, execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

/** Locked public hostname — do not change without an explicit user request. */
const FIXED_DOMAIN = 'aizio-studio.shipstatic.com'
const KEEP_EXTRA_SNAPSHOTS = 2

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

const apiKey = loadApiKey()

function runShip(args) {
  const tokenFlag = apiKey ? ['--token', apiKey] : []
  const res = spawnSync('npx', ['-y', '@shipstatic/ship', ...args, ...tokenFlag, '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const out = (res.stdout || '').trim()
  const err = (res.stderr || '').trim()
  if (res.status !== 0) throw new Error(err || out || `ship failed: ${args.join(' ')}`)
  return out
}

function parseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function normalizeDeployId(raw) {
  return String(raw || '')
    .replace(/^https?:\/\//, '')
    .replace(/\.shipstatic\.com\/?$/, '')
}

function linkedDeploymentId() {
  try {
    const domains = parseJson(runShip(['domains', 'list']))
    const hit = (domains?.domains || []).find(
      (d) => d.domain === FIXED_DOMAIN || d.url?.includes(FIXED_DOMAIN),
    )
    return normalizeDeployId(hit?.deployment)
  } catch {
    return ''
  }
}

function pruneOldDeployments() {
  const listed = parseJson(runShip(['deployments', 'list']))
  const deps = [...(listed?.deployments || [])].sort((a, b) => (b.created || 0) - (a.created || 0))
  if (deps.length < 8) {
    console.log(`Snapshots: ${deps.length} (no prune needed)`)
    return
  }
  const live = linkedDeploymentId()
  const protectedIds = new Set([live].filter(Boolean))
  let keptExtra = 0
  const remove = []
  for (const d of deps) {
    const id = normalizeDeployId(d.deployment)
    if (!id || protectedIds.has(id)) continue
    if (keptExtra < KEEP_EXTRA_SNAPSHOTS) {
      protectedIds.add(id)
      keptExtra += 1
      continue
    }
    remove.push(d.deployment)
  }
  console.log(`Pruning ${remove.length} old snapshot(s)`)
  for (const dep of remove) {
    try {
      runShip(['deployments', 'delete', dep])
      console.log(`  removed ${dep}`)
    } catch (err) {
      console.warn(`  skip remove ${dep}: ${err instanceof Error ? err.message : err}`)
    }
  }
}

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function writeBuildMeta(channel) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const meta = {
    app: 'AIZIO STUDIO',
    version: pkg.version,
    buildId: `${channel}-${Date.now()}`,
    commit: gitCommit(),
    channel,
    builtAt: new Date().toISOString(),
    productionUrl: `https://${FIXED_DOMAIN}`,
    note:
      channel === 'production'
        ? 'Fixed AIZIO Studio production (not 쑥쑥놀이터)'
        : 'AIZIO Studio preview snapshot',
  }
  writeFileSync(join(root, 'public/build-meta.json'), JSON.stringify(meta, null, 2) + '\n')
  return meta
}

function buildFreshDist() {
  writeBuildMeta('production')
  console.log('Building AIZIO Studio…')
  const res = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', stdio: 'inherit' })
  if (res.status !== 0) throw new Error('npm run build failed')
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html missing')
  const assetsDir = join(dist, 'assets')
  if (!existsSync(assetsDir) || !readdirSync(assetsDir).some((f) => f.endsWith('.js'))) {
    throw new Error('dist assets missing')
  }
  console.log('Build OK')
}

async function main() {
  if (!apiKey) {
    console.error(`\nSHIP_API_KEY 가 없습니다.\n고정 주소: https://${FIXED_DOMAIN}\n`)
    console.error('시크릿에 SHIP_API_KEY를 넣은 뒤 npm run deploy:web 을 다시 실행하세요.\n')
    process.exit(1)
  }
  buildFreshDist()
  console.log(`Fixed public URL: https://${FIXED_DOMAIN}`)
  pruneOldDeployments()
  console.log('Uploading…')
  let uploaded
  try {
    uploaded = parseJson(runShip(['deployments', 'upload', dist]))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/Deployment limit reached/i.test(msg)) {
      const listed = parseJson(runShip(['deployments', 'list']))
      const live = linkedDeploymentId()
      for (const d of listed?.deployments || []) {
        const id = normalizeDeployId(d.deployment)
        if (!id || id === live) continue
        try {
          runShip(['deployments', 'delete', d.deployment])
        } catch {
          /* ignore */
        }
      }
      uploaded = parseJson(runShip(['deployments', 'upload', dist]))
    } else throw err
  }
  const deployId = normalizeDeployId(uploaded.deployment || uploaded.url)
  console.log(`Snapshot: ${deployId}`)
  try {
    runShip(['domains', 'set', FIXED_DOMAIN, deployId])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('domains set failed once:', msg)
    try {
      runShip(['domains', 'add', FIXED_DOMAIN])
    } catch {
      /* may already exist */
    }
    runShip(['domains', 'set', FIXED_DOMAIN, deployId])
  }
  console.log(`\nAPP_URL https://${FIXED_DOMAIN}`)
  console.log('Share ONLY this AIZIO Studio fixed URL.')
}

main().catch((err) => {
  console.error('DEPLOY_FIXED_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
