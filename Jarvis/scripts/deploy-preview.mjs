/**
 * Upload a ShipStatic snapshot WITHOUT repointing jarvis-app.shipstatic.com.
 * Use for device verification / staging only.
 *
 *   npm run deploy:preview
 *
 * Prints REVIEW_URL=https://<snapshot>.shipstatic.com
 * Does NOT change production https://jarvis-app.shipstatic.com
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
    productionUrl: 'https://jarvis-app.shipstatic.com',
    note: 'Preview snapshot — not production domain',
  }
  writeFileSync(join(root, 'public', 'build-meta.json'), JSON.stringify(meta, null, 2))
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
  // Main app chunk is the largest index-*.js (smaller ones are lazy route chunks).
  const jsName = indexFiles
    .map((f) => ({ f, n: readFileSync(join(dist, 'assets', f), 'utf8').length }))
    .sort((a, b) => b.n - a.n)[0].f
  const js = readFileSync(join(dist, 'assets', jsName), 'utf8')
  if (!js.includes(meta.version)) {
    throw new Error(`Bundle missing version ${meta.version}`)
  }
  // Fail if obvious secret patterns leaked into main bundle
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

  console.log('Uploading PREVIEW snapshot (will NOT repoint jarvis-app.shipstatic.com)…')
  const uploaded = parseJson(runShip(['deployments', 'upload', dist], apiKey))
  const url = uploaded?.url || (uploaded?.deployment ? `https://${uploaded.deployment}` : '')
  if (!url) throw new Error(`unexpected upload: ${JSON.stringify(uploaded)}`)

  // Label for humans
  try {
    const id = String(uploaded.deployment || '').replace(/^https?:\/\//, '')
    runShip(['deployments', 'set', id, '--label', `aizio-preview-${meta.version}-${meta.commit}`], apiKey)
  } catch {
    /* labels optional */
  }

  const report = {
    REVIEW_URL: url,
    PRODUCTION_URL: 'https://jarvis-app.shipstatic.com',
    productionChanged: false,
    version: meta.version,
    commit: meta.commit,
    buildId: meta.buildId,
    channel: 'preview',
  }
  writeFileSync(join(root, 'dist', 'preview-deploy.json'), JSON.stringify(report, null, 2))
  console.log('\n=== PREVIEW DEPLOY (production untouched) ===')
  console.log(`REVIEW_URL ${url}`)
  console.log(`PRODUCTION_URL https://jarvis-app.shipstatic.com (unchanged)`)
  console.log(`VERSION ${meta.version}`)
  console.log(`COMMIT ${meta.commit}`)
  console.log('Share REVIEW_URL for device testing only.')
}

main().catch((err) => {
  console.error('DEPLOY_PREVIEW_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
