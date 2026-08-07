/** Read Vite / process env without throwing outside Vite. */

export function readEnv(key: string): string {
  try {
    const fromProc =
      typeof process !== 'undefined' ? String(process.env?.[key] || '').trim() : ''
    if (fromProc) return fromProc
  } catch {
    /* ignore */
  }
  try {
    const e = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    return String(e?.[key] || '').trim()
  } catch {
    return ''
  }
}

/** True when running a production user build (never allow test doubles). */
export function isProductionRuntime(): boolean {
  try {
    const mode = readEnv('MODE') || readEnv('NODE_ENV') || ''
    if (mode === 'production') return true
    const viteProd = (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD
    if (viteProd === true) return true
  } catch {
    /* ignore */
  }
  // Heuristic: shipstatic production host
  try {
    if (typeof location !== 'undefined' && /jarvis-app\.shipstatic\.com/i.test(location.hostname)) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}
