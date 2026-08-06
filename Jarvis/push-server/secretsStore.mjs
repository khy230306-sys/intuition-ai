/**
 * AIZIO Provider Secret Store — server-local JSON file under DATA_DIR.
 * Dev/Preview backend storage (NOT OS Credential Manager encryption).
 * Never return full keys from public APIs.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** @typedef {'openrouter'|'openai'|'gemini'|'groq'|'custom'|'duffel'|'amadeus'|'amadeus_secret'|'expedia'} ProviderId */
/** @typedef {'user-secret'|'environment'|'none'} KeySource */
/** @typedef {'untested'|'connected'|'invalid'|'permission_error'|'quota_error'|'network_error'|'provider_error'} ConnectionStatus */

const PROVIDERS = [
  'openrouter',
  'openai',
  'gemini',
  'groq',
  'custom',
  'duffel',
  'amadeus',
  'amadeus_secret',
  'expedia',
]

const ENV_MAP = {
  openrouter: ['OPENROUTER_API_KEY', 'AIZIO_OPENROUTER_API_KEY'],
  openai: ['OPENAI_API_KEY', 'AIZIO_OPENAI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'AIZIO_GEMINI_API_KEY'],
  groq: ['GROQ_API_KEY', 'AIZIO_GROQ_API_KEY'],
  custom: ['AIZIO_CUSTOM_API_KEY'],
  duffel: ['DUFFEL_API_KEY', 'AIZIO_DUFFEL_API_KEY'],
  amadeus: ['AMADEUS_API_KEY', 'AIZIO_AMADEUS_API_KEY'],
  amadeus_secret: ['AMADEUS_API_SECRET', 'AIZIO_AMADEUS_API_SECRET'],
  expedia: ['EXPEDIA_API_KEY', 'AIZIO_EXPEDIA_API_KEY'],
}

function maskKey(key) {
  const k = String(key || '').trim()
  if (!k) return ''
  if (k.length <= 8) return '••••••••'
  return `${k.slice(0, 4)}••••••••${k.slice(-4)}`
}

function emptyRecord() {
  return {
    apiKey: '',
    apiBase: '',
    model: '',
    updatedAt: null,
    lastTestedAt: null,
    connectionStatus: 'untested',
    lastErrorCode: null,
    lastErrorMessage: null,
  }
}

export function createSecretsStore(dataDir) {
  mkdirSync(dataDir, { recursive: true })
  const file = join(dataDir, 'provider-keys.json')

  /** @type {Map<string, any>} in-memory client cache invalidation marker */
  let generation = 0

  function loadDb() {
    try {
      if (!existsSync(file)) return { schema: 1, providers: {} }
      const raw = JSON.parse(readFileSync(file, 'utf8'))
      return {
        schema: 1,
        providers: raw.providers && typeof raw.providers === 'object' ? raw.providers : {},
      }
    } catch {
      return { schema: 1, providers: {} }
    }
  }

  function saveDb(db) {
    const tmp = `${file}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(db, null, 2))
    renameSync(tmp, file)
    generation += 1
  }

  function envKey(id) {
    const names = ENV_MAP[id] || []
    for (const n of names) {
      const v = (process.env[n] || '').trim()
      if (v) return v
    }
    return ''
  }

  /** Internal: raw key with source priority user-secret > environment */
  function resolveRaw(id) {
    const db = loadDb()
    const rec = { ...emptyRecord(), ...(db.providers[id] || {}) }
    const user = String(rec.apiKey || '').trim()
    if (user) {
      return {
        apiKey: user,
        apiBase: String(rec.apiBase || '').trim(),
        model: String(rec.model || '').trim(),
        source: /** @type {KeySource} */ ('user-secret'),
        record: rec,
      }
    }
    const env = envKey(id)
    if (env) {
      return {
        apiKey: env,
        apiBase: String(rec.apiBase || '').trim(),
        model: String(rec.model || '').trim(),
        source: /** @type {KeySource} */ ('environment'),
        record: rec,
      }
    }
    return {
      apiKey: '',
      apiBase: String(rec.apiBase || '').trim(),
      model: String(rec.model || '').trim(),
      source: /** @type {KeySource} */ ('none'),
      record: rec,
    }
  }

  function statusFor(id) {
    const { apiKey, source, record } = resolveRaw(id)
    return {
      provider: id,
      configured: Boolean(apiKey),
      source,
      maskedKey: apiKey ? maskKey(apiKey) : '',
      lastUpdatedAt: record.updatedAt || null,
      lastTestedAt: record.lastTestedAt || null,
      connectionStatus: record.connectionStatus || 'untested',
      lastErrorCode: record.lastErrorCode || null,
      apiBase: record.apiBase || '',
      model: record.model || '',
    }
  }

  function listStatuses() {
    return PROVIDERS.map(statusFor)
  }

  function setKey(id, { apiKey, apiBase, model } = {}) {
    if (!PROVIDERS.includes(id)) throw Object.assign(new Error('unknown_provider'), { code: 'unknown_provider' })
    const key = String(apiKey || '').trim()
    if (!key) throw Object.assign(new Error('missing_key'), { code: 'missing_key' })
    if (/^[•*…\.]+$/.test(key) || key.includes('…') || key.includes('•')) {
      throw Object.assign(new Error('masked_key'), { code: 'masked_key' })
    }
    const db = loadDb()
    const prev = { ...emptyRecord(), ...(db.providers[id] || {}) }
    db.providers[id] = {
      ...prev,
      apiKey: key,
      apiBase: apiBase != null ? String(apiBase).trim() : prev.apiBase || '',
      model: model != null ? String(model).trim() : prev.model || '',
      updatedAt: new Date().toISOString(),
      connectionStatus: 'untested',
      lastErrorCode: null,
      lastErrorMessage: null,
    }
    saveDb(db)
    return statusFor(id)
  }

  function deleteKey(id) {
    if (!PROVIDERS.includes(id)) throw Object.assign(new Error('unknown_provider'), { code: 'unknown_provider' })
    const db = loadDb()
    const prev = { ...emptyRecord(), ...(db.providers[id] || {}) }
    db.providers[id] = {
      ...prev,
      apiKey: '',
      updatedAt: new Date().toISOString(),
      connectionStatus: 'untested',
      lastErrorCode: null,
      lastErrorMessage: null,
      lastTestedAt: null,
    }
    saveDb(db)
    return statusFor(id)
  }

  function markTest(id, patch) {
    const db = loadDb()
    const prev = { ...emptyRecord(), ...(db.providers[id] || {}) }
    db.providers[id] = {
      ...prev,
      lastTestedAt: new Date().toISOString(),
      connectionStatus: patch.connectionStatus || prev.connectionStatus,
      lastErrorCode: patch.lastErrorCode ?? null,
      lastErrorMessage: patch.lastErrorMessage ?? null,
    }
    saveDb(db)
    return statusFor(id)
  }

  function getGeneration() {
    return generation
  }

  return {
    PROVIDERS,
    maskKey,
    listStatuses,
    statusFor,
    resolveRaw,
    setKey,
    deleteKey,
    markTest,
    getGeneration,
    filePath: file,
  }
}

export { PROVIDERS, maskKey, ENV_MAP }
