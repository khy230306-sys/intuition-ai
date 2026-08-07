/**
 * Seed app-owned cloud providers from build-time env (operator keys).
 * Never commit real keys — pass only at deploy/build:
 *   VITE_AIZIO_OPENAI_API_KEY  (default chat)
 *   VITE_AIZIO_GEMINI_API_KEY  (fallback)
 */

import { GEMINI_DEFAULT_MODEL, OPENAI_DEFAULT_MODEL } from './models'
import { getProviderSlot, loadHybridAiConfig, saveHybridAiConfig, updateProviderSlot } from './providerConfig'

const SEEDED_OPENAI = 'aizio_app_owned_openai_seeded_v1'
const SEEDED_GEMINI = 'aizio_app_owned_gemini_seeded_v1'

function envKey(name: string): string {
  // Prefer process.env so tests (vi.stubEnv) and deploy shells win over baked import.meta.env
  try {
    const fromProc = String(
      (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.[name] || '',
    ).trim()
    if (fromProc) return fromProc
  } catch {
    /* ignore */
  }
  try {
    return String(
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name] || '',
    ).trim()
  } catch {
    return ''
  }
}

function seedOpenAI(): boolean {
  const key = envKey('VITE_AIZIO_OPENAI_API_KEY')
  if (!key) return false
  updateProviderSlot('openai', {
    apiKey: key,
    model: getProviderSlot('openai').model || OPENAI_DEFAULT_MODEL,
    enabled: true,
    status: 'unknown',
    lastError: '',
  })
  localStorage.setItem(SEEDED_OPENAI, key.slice(-8))
  return true
}

function seedGemini(): boolean {
  const key = envKey('VITE_AIZIO_GEMINI_API_KEY')
  if (!key) return false
  updateProviderSlot('gemini', {
    apiKey: key,
    model: getProviderSlot('gemini').model || GEMINI_DEFAULT_MODEL,
    enabled: true,
    status: 'unknown',
    lastError: '',
  })
  localStorage.setItem(SEEDED_GEMINI, key.slice(-8))
  return true
}

/**
 * Install app-owned providers. OpenAI is the default chat brain when present;
 * Gemini remains a fallback. Call at boot.
 */
export function seedAppOwnedProvidersFromBuild(): { openai: boolean; gemini: boolean } {
  const openai = seedOpenAI()
  const gemini = seedGemini()

  const cfg = loadHybridAiConfig()
  if (openai) {
    saveHybridAiConfig({
      ...cfg,
      mode: 'fixed',
      fixedProvider: 'openai',
      allowPaidFallback: true,
    })
  } else if (gemini) {
    saveHybridAiConfig({
      ...cfg,
      mode: 'fixed',
      fixedProvider: 'gemini',
    })
  }

  return { openai, gemini }
}

/** @deprecated use seedAppOwnedProvidersFromBuild */
export function seedAppOwnedGeminiFromBuild(): boolean {
  const r = seedAppOwnedProvidersFromBuild()
  return r.gemini || r.openai
}
