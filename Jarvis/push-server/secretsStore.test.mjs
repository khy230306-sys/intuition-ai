import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSecretsStore } from './secretsStore.mjs'

describe('secretsStore', () => {
  let dir
  /** @type {ReturnType<typeof createSecretsStore>} */
  let store

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'aizio-secrets-'))
    store = createSecretsStore(dir)
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('saves key and returns masked status only', () => {
    const st = store.setKey('openai', { apiKey: 'sk-test-abcdef1234567890' })
    assert.equal(st.configured, true)
    assert.equal(st.source, 'user-secret')
    assert.match(st.maskedKey, /^sk-t/)
    assert.ok(st.maskedKey.includes('••••'))
    assert.ok(!JSON.stringify(st).includes('sk-test-abcdef1234567890'))
  })

  it('prefers user-secret over environment', () => {
    process.env.OPENAI_API_KEY = 'sk-env-xxxxxxxxxxxxxxxx'
    store.setKey('openai', { apiKey: 'sk-user-yyyyyyyyyyyyyyyy' })
    const raw = store.resolveRaw('openai')
    assert.equal(raw.source, 'user-secret')
    assert.equal(raw.apiKey, 'sk-user-yyyyyyyyyyyyyyyy')
  })

  it('falls back to environment when user key deleted', () => {
    process.env.OPENAI_API_KEY = 'sk-env-zzzzzzzzzzzzzzzz'
    store.setKey('openai', { apiKey: 'sk-user-aaaaaaaaaaaaaaaa' })
    store.deleteKey('openai')
    const raw = store.resolveRaw('openai')
    assert.equal(raw.source, 'environment')
    assert.equal(raw.apiKey, 'sk-env-zzzzzzzzzzzzzzzz')
  })

  it('rejects masked placeholder keys', () => {
    assert.throws(() => store.setKey('openai', { apiKey: 'sk-••••••••abcd' }))
  })

  it('increments generation on change', () => {
    const g0 = store.getGeneration()
    store.setKey('openrouter', { apiKey: 'or-key-1111111111111111' })
    assert.ok(store.getGeneration() > g0)
    store.deleteKey('openrouter')
    assert.ok(store.getGeneration() > g0)
  })
})
