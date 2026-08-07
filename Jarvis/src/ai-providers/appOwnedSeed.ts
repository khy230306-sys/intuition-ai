/**
 * Seed app-owned cloud providers from build-time env (operator keys).
 * Never commit real keys — pass VITE_AIZIO_GEMINI_API_KEY only at deploy/build.
 */

import { GEMINI_DEFAULT_MODEL } from './models'
import { getProviderSlot, loadHybridAiConfig, saveHybridAiConfig, updateProviderSlot } from './providerConfig'

const SEEDED_FLAG = 'aizio_app_owned_gemini_seeded_v1'

function buildGeminiKey(): string {
  try {
    const fromVite = String(
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_AIZIO_GEMINI_API_KEY || '',
    ).trim()
    if (fromVite) return fromVite
  } catch {
    /* ignore */
  }
  try {
    return String((globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_AIZIO_GEMINI_API_KEY || '').trim()
  } catch {
    return ''
  }
}

/**
 * Install app-owned Gemini into Hybrid config so AIZIO chats via Gemini
 * without asking the user to paste a key.
 */
export function seedAppOwnedGeminiFromBuild(): boolean {
  const key = buildGeminiKey()
  if (!key) return false

  updateProviderSlot('gemini', {
    apiKey: key,
    model: getProviderSlot('gemini').model || GEMINI_DEFAULT_MODEL,
    enabled: true,
    status: 'unknown',
    lastError: '',
  })

  // Prefer the seeded Gemini for cloud chat
  const cfg = loadHybridAiConfig()
  saveHybridAiConfig({
    ...cfg,
    mode: 'fixed',
    fixedProvider: 'gemini',
  })

  localStorage.setItem(SEEDED_FLAG, key.slice(-8))
  return true
}
