/**
 * Campus V1 headless smoke — data layer + intent routing (no mock UI claims).
 * Run: node scripts/campus-e2e.mjs  (after vitest campus tests pass)
 */
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const r = spawnSync('npx', ['vitest', 'run', 'src/campus/campus.test.ts', 'src/homeV2/homeV2.test.ts'], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
if (r.status !== 0) {
  console.error('CAMPUS_E2E=FAIL')
  process.exit(r.status || 1)
}
console.log('CAMPUS_E2E=PASS')
process.exit(0)
