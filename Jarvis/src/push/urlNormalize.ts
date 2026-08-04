export function normalizeBaseUrl(url: string): string {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
}

export function assertHttpsBaseUrl(
  url: string,
  opts?: { allowLocalhost?: boolean },
): { ok: boolean; base?: string; error?: string } {
  const base = normalizeBaseUrl(url)
  if (!base) return { ok: false, error: 'empty' }
  try {
    const u = new URL(base)
    if (u.protocol === 'https:') return { ok: true, base }
    if (
      opts?.allowLocalhost &&
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    ) {
      return { ok: true, base }
    }
    return { ok: false, error: 'https_required' }
  } catch {
    return { ok: false, error: 'invalid_url' }
  }
}
