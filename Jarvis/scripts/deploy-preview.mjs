/**
 * Deploy AIZIO Preview to the FIXED ShipStatic preview domain.
 *
 * ALWAYS share this Preview address — never random snapshot URLs:
 *   https://light-lab.shipstatic.com
 *
 * Does NOT change production https://jarvis-app.shipstatic.com
 *
 * Each upload creates an immutable snapshot, then this script
 * repoints light-lab → that snapshot. The public Preview URL does not change.
 *
 *   npm run deploy:preview
 */
import { spawnSync, execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import {
  PREVIEW_HOST,
  PREVIEW_URL,
  PRODUCTION_HOST,
  PRODUCTION_URL,
  PROTECTED_DOMAIN_HOSTS,
} from './ship-fixed-hosts.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

/** Keep this many recent unlinked snapshots as rollback cushion (plus live ones). */
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

function runShip(args, apiKey) {
  const res = spawnSync('npx', ['-y', '@shipstatic/ship', ...args, '--api-key', apiKey, '--json'], {
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

function linkedDeploymentIds(apiKey) {
  const protectedIds = new Set()
  try {
    const domains = parseJson(runShip(['domains', 'list'], apiKey))
    for (const d of domains?.domains || []) {
      const host = String(d.domain || '')
      if (!PROTECTED_DOMAIN_HOSTS.includes(host)) continue
      const id = normalizeDeployId(d.deployment)
      if (id) protectedIds.add(id)
    }
  } catch {
    /* ignore */
  }
  return protectedIds
}

/** Free tier ~10 snapshots — remove old unlinked ones before a new upload. */
function pruneOldDeployments(apiKey) {
  const listed = parseJson(runShip(['deployments', 'list'], apiKey))
  const deps = [...(listed?.deployments || [])].sort((a, b) => (b.created || 0) - (a.created || 0))
  if (deps.length < 8) {
    console.log(`Snapshots: ${deps.length} (no prune needed)`)
    return
  }
  const protectedIds = linkedDeploymentIds(apiKey)
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
    `Pruning ${remove.length} old snapshot(s); keeping protected=${[...linkedDeploymentIds(apiKey)].join(',') || '(none)'} + ${keptExtra} recent`,
  )
  for (const dep of remove) {
    try {
      parseJson(runShip(['deployments', 'remove', dep], apiKey))
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

function writeBuildMeta() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const meta = {
    app: 'AIZIO',
    version: pkg.version,
    buildId: process.env.BUILD_ID || `preview-${Date.now()}`,
    commit: process.env.GIT_COMMIT || gitCommit(),
    channel: 'preview',
    builtAt: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    productionUrl: PRODUCTION_URL,
    note: `Fixed Preview — https://${PREVIEW_HOST} (production untouched)`,
  }
  writeFileSync(join(root, 'public', 'build-meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
  const pushUrl = (process.env.PUSH_SERVER_URL || '').trim().replace(/\/$/, '')
  writeFileSync(
    join(root, 'public', 'preview-config.json'),
    JSON.stringify(
      {
        channel: 'preview',
        previewUrl: PREVIEW_URL,
        defaultPushServerUrl: pushUrl,
        note: pushUrl
          ? 'Preview default push server (user can override in Settings)'
          : 'Set PUSH_SERVER_URL when running deploy:preview to bake default server',
      },
      null,
      2,
    ),
  )
  return meta
}

function buildFreshDist(meta) {
  console.log(`Building preview dist v${meta.version} commit=${meta.commit}…`)
  const res = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    env: { ...process.env, GIT_COMMIT: meta.commit, BUILD_ID: meta.buildId, AIZIO_CHANNEL: 'preview' },
  })
  if (res.status !== 0) throw new Error('npm run build failed')
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html missing')
  const indexFiles = readdirSync(join(dist, 'assets')).filter((f) => /^index-.*\.js$/.test(f))
  if (!indexFiles.length) throw new Error('index-*.js missing')
  const jsName = indexFiles
    .map((f) => ({ f, n: readFileSync(join(dist, 'assets', f), 'utf8').length }))
    .sort((a, b) => b.n - a.n)[0].f
  const js = readFileSync(join(dist, 'assets', jsName), 'utf8')
  if (!js.includes(meta.version)) {
    throw new Error(`Bundle missing version ${meta.version}`)
  }
  if (/sk-[a-zA-Z0-9]{20,}/.test(js) || /ship-[a-f0-9]{20,}/.test(js)) {
    throw new Error('Bundle appears to contain API key-like secrets — aborting preview deploy')
  }
  console.log(`Build OK: ${jsName} (${js.length} bytes)`)
}

async function main() {
  const apiKey = loadApiKey()
  if (!apiKey) {
    console.error('SHIP_API_KEY missing — cannot upload preview snapshot')
    process.exit(1)
  }

  const meta = writeBuildMeta()
  buildFreshDist(meta)

  console.log(`Fixed Preview URL: ${PREVIEW_URL}`)
  console.log(`Production URL (untouched): ${PRODUCTION_URL}`)
  console.log('Checking ShipStatic free-plan snapshot room…')
  pruneOldDeployments(apiKey)

  console.log('Uploading PREVIEW snapshot (will NOT repoint jarvis-app)…')
  let uploaded
  try {
    uploaded = parseJson(runShip(['deployments', 'upload', dist], apiKey))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/Deployment limit reached/i.test(msg)) {
      console.warn('Upload hit limit — force-pruning unlinked snapshots and retrying once…')
      const listed = parseJson(runShip(['deployments', 'list'], apiKey))
      const live = linkedDeploymentIds(apiKey)
      for (const d of listed?.deployments || []) {
        const id = normalizeDeployId(d.deployment)
        if (!id || live.has(id)) continue
        try {
          runShip(['deployments', 'remove', d.deployment], apiKey)
          console.log(`  force-removed ${d.deployment}`)
        } catch {
          /* ignore */
        }
      }
      uploaded = parseJson(runShip(['deployments', 'upload', dist], apiKey))
    } else {
      throw err
    }
  }

  const deployId = normalizeDeployId(uploaded?.deployment || uploaded?.url)
  if (!deployId) throw new Error(`unexpected upload: ${JSON.stringify(uploaded)}`)
  console.log(`Snapshot id (internal): ${deployId}`)

  try {
    runShip(['deployments', 'set', deployId, '--label', `aizio-preview-${meta.version}-${meta.commit}`], apiKey)
  } catch {
    /* labels optional */
  }

  console.log(`Repointing ${PREVIEW_HOST} → ${deployId} …`)
  const linked = parseJson(runShip(['domains', 'set', PREVIEW_HOST, deployId], apiKey))
  const fixed = linked?.url || PREVIEW_URL

  // Sanity: never allow preview deploy to touch production domain
  try {
    const domains = parseJson(runShip(['domains', 'list'], apiKey))
    const prod = (domains?.domains || []).find((d) => d.domain === PRODUCTION_HOST)
    if (prod && normalizeDeployId(prod.deployment) === deployId) {
      throw new Error('REFUSING: preview snapshot became production domain target — abort')
    }
  } catch (err) {
    if (err instanceof Error && /REFUSING/.test(err.message)) throw err
  }

  const report = {
    REVIEW_URL: fixed,
    PREVIEW_URL: fixed,
    PRODUCTION_URL,
    productionChanged: false,
    version: meta.version,
    commit: meta.commit,
    buildId: meta.buildId,
    channel: 'preview',
    snapshotId: deployId,
  }
  writeFileSync(join(root, 'dist', 'preview-deploy.json'), JSON.stringify(report, null, 2))
  console.log('\n=== PREVIEW DEPLOY (production untouched) ===')
  console.log(`REVIEW_URL ${fixed}`)
  console.log(`PRODUCTION_URL ${PRODUCTION_URL} (unchanged)`)
  console.log(`VERSION ${meta.version}`)
  console.log(`COMMIT ${meta.commit}`)
  console.log('Share ONLY the fixed Preview URL. Do not share snapshot *.shipstatic.com links.')
}

main().catch((err) => {
  console.error('DEPLOY_PREVIEW_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
