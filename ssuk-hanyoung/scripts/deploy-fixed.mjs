/**
 * Deploy 쑥쑥놀이터 to FIXED ShipStatic host:
 *   https://neon-device-6185qfc.shipstatic.com
 *
 * Requires SHIP_API_KEY (or ~/.ship-api-key) to repoint the domain.
 * Anonymous upload alone cannot update a claimed fixed hostname.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const FIXED = 'neon-device-6185qfc.shipstatic.com'

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

function run(args, apiKey) {
  const full = ['-y', '@shipstatic/ship', ...args, '--json']
  if (apiKey) full.push('--api-key', apiKey)
  const res = spawnSync('npx', full, { cwd: root, encoding: 'utf8' })
  const out = `${res.stdout || ''}\n${res.stderr || ''}`
  if (res.status !== 0) {
    console.error(out)
    process.exit(res.status || 1)
  }
  // Parse last JSON object in output (ship may print progress lines)
  const matches = out.match(/\{[\s\S]*?\}(?=\s*$|\s*\{)/g) || out.match(/\{[\s\S]*\}/g) || []
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(matches[i])
      if (j.url || j.deployment || j.name) return j
    } catch {
      /* continue */
    }
  }
  // Fallback: extract host from URL-looking token
  const m = out.match(/https:\/\/([a-z0-9-]+\.shipstatic\.com)/)
  if (m) return { url: m[0], deployment: m[1], claim: (out.match(/https:\/\/my\.shipstatic\.com\/claim\/[a-f0-9]+/) || [])[0] }
  console.error('Could not parse ship JSON:\n', out)
  process.exit(1)
}

console.log('== build ==')
const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status || 1)

console.log('== upload ==')
const apiKey = loadApiKey()
const deployed = run(['./dist'], apiKey)
const snapHost = String(deployed.deployment || deployed.url || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
console.log('snapshot:', deployed.url || snapHost)

if (!apiKey) {
  console.error('\n[need] SHIP_API_KEY required to update fixed host https://' + FIXED)
  console.error('Upload succeeded as snapshot only. Claim/API key needed to repoint neon-device.')
  if (deployed.claim) console.error('CLAIM:', deployed.claim)
  process.exit(2)
}

console.log('== point domain', FIXED, '->', snapHost, '==')
const linked = run(['domains', 'set', FIXED, snapHost], apiKey)
console.log(JSON.stringify(linked, null, 2))
console.log('\nFIXED URL: https://' + FIXED)
