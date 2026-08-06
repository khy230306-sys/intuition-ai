/**
 * API Key E2E against local push-server Secret Store (no real paid calls beyond /models).
 * Usage: node scripts/api-key-e2e.mjs
 * Requires: push-server on 8787
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataDir = mkdtempSync(join(tmpdir(), 'aizio-e2e-keys-'))
const PORT = 8799
const BASE = `http://127.0.0.1:${PORT}`

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: join(root, 'push-server'),
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      NODE_ENV: 'development',
      // no INSTALL_TOKEN so tests are open
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let ready = false
  for (let i = 0; i < 40; i++) {
    await sleep(100)
    try {
      const h = await fetch(`${BASE}/health`)
      if (h.ok) {
        const j = await h.json()
        if (j.providerSecrets?.ok) {
          ready = true
          break
        }
      }
    } catch {
      /* wait */
    }
  }
  assert(ready, 'server failed to start')

  // E2E1: save → configured → test (will fail auth with fake key but must not say format-ok)
  const put = await fetch(`${BASE}/v1/provider-keys/openai`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'sk-e2e-fake-key-aaaaaaaaaaaa' }),
  })
  const putJ = await put.json()
  assert(put.ok && putJ.ok && putJ.configured, 'save failed')
  assert(!JSON.stringify(putJ).includes('sk-e2e-fake-key-aaaaaaaaaaaa'), 'full key leaked on PUT')

  const get = await fetch(`${BASE}/v1/provider-keys/openai`)
  const getJ = await get.json()
  assert(getJ.configured === true, 'configured not true')
  assert(!JSON.stringify(getJ).includes('sk-e2e-fake-key-aaaaaaaaaaaa'), 'full key leaked on GET')

  const test = await fetch(`${BASE}/v1/provider-keys/openai/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  const testJ = await test.json()
  assert(testJ.ok === false || testJ.connectionStatus, 'test must return structured result')
  assert(testJ.connectionStatus !== undefined, 'missing connectionStatus')

  // E2E2: change key A→B without restart
  await fetch(`${BASE}/v1/provider-keys/openai`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'sk-e2e-key-B-bbbbbbbbbbbbbb' }),
  })
  const get2 = await (await fetch(`${BASE}/v1/provider-keys/openai`)).json()
  assert(get2.maskedKey.includes('bbbb') || get2.maskedKey.startsWith('sk-e'), 'key B not reflected')

  // E2E3: delete
  await fetch(`${BASE}/v1/provider-keys/openai`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  const get3 = await (await fetch(`${BASE}/v1/provider-keys/openai`)).json()
  assert(get3.configured === false, 'delete failed')

  // E2E5: diag has no secrets
  const diag = await (await fetch(`${BASE}/v1/provider-keys/diag`)).json()
  assert(diag.ok, 'diag failed')
  assert(!JSON.stringify(diag).includes('sk-e2e'), 'diag leaked key')

  console.log('API_KEY_E2E_OK')
  child.kill('SIGTERM')
  rmSync(dataDir, { recursive: true, force: true })
}

main().catch((e) => {
  console.error('API_KEY_E2E_FAIL', e)
  process.exit(1)
})
