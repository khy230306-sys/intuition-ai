/**
 * Deploy AIZIO to the FIXED ShipStatic platform domain.
 *
 * ALWAYS use this address with users — never share random snapshot URLs:
 *   https://jarvis-app.shipstatic.com
 *
 * Each upload creates an immutable snapshot (random *.shipstatic.com id),
 * then this script repoints jarvis-app → that snapshot. The public URL
 * does not change.
 *
 * Free plan holds ~10 deployments. Before upload we prune unlinked snapshots
 * so "Deployment limit reached" does not block releases.
 *
 *   npm run deploy:web
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

/** Locked public hostname — do not change without an explicit user request. */
const FIXED_DOMAIN = 'jarvis-app.shipstatic.com'

/** Keep this many recent unlinked snapshots as rollback cushion (plus the live one). */
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
  const host = raw.includes('.') ? raw : `${raw}.shipstatic.com`
  if (host !== FIXED_DOMAIN && !process.env.SHIP_ALLOW_DOMAIN_OVERRIDE) {
    console.warn(
      `[warn] Ignoring SHIP_DOMAIN=${host}; locked fixed URL is https://${FIXED_DOMAIN}\n` +
        `Set SHIP_ALLOW_DOMAIN_OVERRIDE=1 only if you intentionally change it.`,
    )
    return FIXED_DOMAIN
  }
  return host
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

function normalizeDeployId(raw) {
  return String(raw || '')
    .replace(/^https?:\/\//, '')
    .replace(/\.shipstatic\.com\/?$/, '')
}

function linkedDeploymentId() {
  try {
    const domains = parseJson(runShip(['domains', 'list']))
    const hit = (domains?.domains || []).find((d) => d.domain === domainHost || d.url?.includes(domainHost))
    return normalizeDeployId(hit?.deployment)
  } catch {
    return ''
  }
}

/** Free tier ~10 snapshots — remove old unlinked ones before a new upload. */
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
    if (!id) continue
    if (protectedIds.has(id)) continue
    if (keptExtra < KEEP_EXTRA_SNAPSHOTS) {
      protectedIds.add(id)
      keptExtra += 1
      continue
    }
    remove.push(d.deployment)
  }
  console.log(
    `Pruning ${remove.length} old snapshot(s); keeping live=${live || '(none)'} + ${keptExtra} recent`,
  )
  for (const dep of remove) {
    try {
      const out = parseJson(runShip(['deployments', 'remove', dep]))
      console.log(`  removed ${dep}${out?.success ? '' : ''}`)
    } catch (err) {
      console.warn(`  skip remove ${dep}: ${err instanceof Error ? err.message : err}`)
    }
  }
}

function gitCommitShort() {
  const res = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  })
  return (res.stdout || '').trim() || 'unknown'
}

/** Stamp public/build-meta.json before vite build so SW precache + runtime agree. */
function writeProductionBuildMeta() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const meta = {
    app: 'AIZIO',
    version: pkg.version,
    buildId: process.env.BUILD_ID || `prod-${Date.now()}`,
    commit: process.env.GIT_COMMIT || gitCommitShort(),
    channel: 'production',
    builtAt: new Date().toISOString(),
    productionUrl: `https://${FIXED_DOMAIN}`,
    note: 'Fixed production — stable boot',
  }
  writeFileSync(join(root, 'public', 'build-meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
  console.log(`build-meta: v${meta.version} commit=${meta.commit} buildId=${meta.buildId}`)
  return meta
}

function buildFreshDist() {
  const meta = writeProductionBuildMeta()
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  console.log(`Building fresh dist for v${pkg.version}…`)
  const res = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    env: {
      ...process.env,
      GIT_COMMIT: meta.commit,
      BUILD_ID: meta.buildId,
      AIZIO_CHANNEL: 'production',
    },
  })
  if (res.status !== 0) {
    throw new Error('npm run build failed — aborting deploy so stale dist is never uploaded')
  }
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error('dist/index.html missing after build')
  }
  const assetsDir = join(dist, 'assets')
  const indexFiles = readdirSync(assetsDir).filter((f) => /^index-.*\.js$/.test(f))
  if (!indexFiles.length) throw new Error('dist assets index-*.js missing after build')
  // Main app chunk is the largest index-*.js (smaller ones are lazy route chunks).
  const jsName = indexFiles
    .map((f) => ({ f, n: readFileSync(join(assetsDir, f), 'utf8').length }))
    .sort((a, b) => b.n - a.n)[0].f
  const js = readFileSync(join(assetsDir, jsName), 'utf8')
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  if (!js.includes(pkg.version)) {
    throw new Error(
      `Built bundle ${jsName} does not contain APP_VERSION ${pkg.version} — refusing to deploy stale/wrong build`,
    )
  }
  if (!html.includes('data-boot-inline') && !html.includes('boot-inline')) {
    throw new Error('dist/index.html missing inline boot splash — refusing blank-prone build')
  }
  if (!html.includes(pkg.version) && !html.includes(`jarvis-version`)) {
    console.warn(`[warn] index.html has no version meta; bundle OK (${pkg.version})`)
  }
  console.log(`Build OK: ${jsName} contains v${pkg.version}`)
}

async function main() {
  if (!apiKey) {
    console.error(`
SHIP_API_KEY 가 없습니다.
고정 앱 주소: https://${FIXED_DOMAIN}
`)
    process.exit(1)
  }

  buildFreshDist()

  console.log(`Fixed public URL: https://${domainHost}`)
  console.log('Checking ShipStatic free-plan snapshot room…')
  pruneOldDeployments()

  console.log('Uploading snapshot (internal id will change; public URL will not)…')
  let uploaded
  try {
    uploaded = parseJson(runShip(['deployments', 'upload', dist]))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/Deployment limit reached/i.test(msg)) {
      console.warn('Upload hit limit — force-pruning all unlinked snapshots and retrying once…')
      const listed = parseJson(runShip(['deployments', 'list']))
      const live = linkedDeploymentId()
      for (const d of listed?.deployments || []) {
        const id = normalizeDeployId(d.deployment)
        if (!id || id === live) continue
        try {
          runShip(['deployments', 'remove', d.deployment])
          console.log(`  force-removed ${d.deployment}`)
        } catch {
          /* ignore */
        }
      }
      uploaded = parseJson(runShip(['deployments', 'upload', dist]))
    } else {
      throw err
    }
  }
  if (!uploaded?.deployment && !uploaded?.url) {
    throw new Error(`unexpected upload response: ${JSON.stringify(uploaded)}`)
  }
  const deployId = normalizeDeployId(uploaded.deployment || uploaded.url)
  console.log(`Snapshot id (internal): ${deployId}`)

  console.log(`Repointing ${domainHost} → ${deployId} …`)
  const linked = parseJson(runShip(['domains', 'set', domainHost, deployId]))
  const fixed = linked?.url || `https://${domainHost}`
  console.log(`\nAPP_URL ${fixed}`)
  console.log('Share ONLY this URL. Do not share snapshot *.shipstatic.com links.')
}

main().catch((err) => {
  console.error('DEPLOY_FIXED_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
