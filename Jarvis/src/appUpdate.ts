/** Home-screen PWA update helpers — always target the fixed production host. */

export const FIXED_APP_URL = 'https://jarvis-app.shipstatic.com'

/** Parse version from deployed index.html (meta or title). */
export function parseJarvisVersionFromHtml(html: string): string | null {
  const meta =
    html.match(/name=["']jarvis-version["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*name=["']jarvis-version["']/i)
  if (meta?.[1]) return meta[1].trim()
  const title = html.match(/<title>\s*(?:AIZIO|JARVIS)\s+(\d+\.\d+\.\d+)/i)
  return title?.[1]?.trim() || null
}

/** Read jarvis-version from the live production site (bypasses SW cache). */
export async function fetchRemoteAppVersion(timeoutMs = 6000): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${FIXED_APP_URL}/?_check=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return null
    return parseJarvisVersionFromHtml(await res.text())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
