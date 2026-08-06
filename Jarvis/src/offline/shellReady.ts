/** App-shell readiness — verify SW caches contain index + critical assets. */

export type ShellReadyReport = {
  ready: boolean
  controlled: boolean
  swReady: boolean
  hasIndex: boolean
  cacheNames: string[]
  lastCheckedAt: string
  appVersion: string
  detail: string
}

const READY_KEY = 'aizio.offline.shellReady.v1'
const READY_AT_KEY = 'aizio.offline.shellReadyAt.v1'

export function readShellReadyFlag(): { ready: boolean; at: string | null } {
  try {
    return {
      ready: localStorage.getItem(READY_KEY) === '1',
      at: localStorage.getItem(READY_AT_KEY),
    }
  } catch {
    return { ready: false, at: null }
  }
}

function writeShellReadyFlag(ready: boolean): void {
  try {
    if (ready) {
      localStorage.setItem(READY_KEY, '1')
      localStorage.setItem(READY_AT_KEY, new Date().toISOString())
    } else {
      localStorage.setItem(READY_KEY, '0')
    }
  } catch {
    /* ignore */
  }
}

async function cacheHasIndex(): Promise<{ hasIndex: boolean; cacheNames: string[] }> {
  if (!('caches' in window)) return { hasIndex: false, cacheNames: [] }
  const cacheNames = await caches.keys()
  const candidates = ['./', './index.html', '/index.html', 'index.html', './offline.html', 'offline.html']
  for (const name of cacheNames) {
    const cache = await caches.open(name)
    for (const c of candidates) {
      const hit = await cache.match(c, { ignoreSearch: true })
      if (hit) return { hasIndex: true, cacheNames }
    }
    try {
      const abs = await cache.match(new URL('index.html', location.origin).href, { ignoreSearch: true })
      if (abs) return { hasIndex: true, cacheNames }
    } catch {
      /* ignore */
    }
  }
  return { hasIndex: false, cacheNames }
}

async function askSwVerify(): Promise<{ ok: boolean; hasIndex?: boolean } | null> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return null
  return new Promise((resolve) => {
    const ch = new MessageChannel()
    const timer = window.setTimeout(() => resolve(null), 2500)
    ch.port1.onmessage = (ev) => {
      window.clearTimeout(timer)
      const data = ev.data
      if (data?.action === 'verify-shell-result' && data.result) {
        resolve({ ok: Boolean(data.result.ok), hasIndex: Boolean(data.result.hasIndex) })
      } else resolve(null)
    }
    try {
      navigator.serviceWorker.controller?.postMessage({ type: 'aizio-offline', action: 'verify-shell' }, [
        ch.port2,
      ])
    } catch {
      window.clearTimeout(timer)
      resolve(null)
    }
  })
}

/** Warm same-origin shell URLs into a dedicated cache (supplement precache). */
export async function warmAppShell(appVersion: string): Promise<boolean> {
  if (!('caches' in window)) return false
  const urls = new Set<string>([
    './',
    './index.html',
    './offline.html',
    './manifest.webmanifest',
    './favicon.svg',
    './splash.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './push-handler.js',
    './offline-shell.js',
  ])
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = (el as HTMLScriptElement).src
    if (src && src.startsWith(location.origin)) urls.add(src)
  })
  document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
    const href = (el as HTMLLinkElement).href
    if (href && href.startsWith(location.origin)) urls.add(href)
  })
  try {
    const cache = await caches.open(`aizio-shell-warm-${appVersion}`)
    await Promise.all(
      [...urls].map(async (u) => {
        try {
          await cache.add(u)
        } catch {
          /* individual asset optional */
        }
      }),
    )
    return true
  } catch {
    return false
  }
}

export async function verifyAppShell(appVersion: string): Promise<ShellReadyReport> {
  const controlled = Boolean(navigator.serviceWorker?.controller)
  let swReady = false
  try {
    if ('serviceWorker' in navigator) {
      await Promise.race([
        navigator.serviceWorker.ready.then(() => {
          swReady = true
        }),
        new Promise<void>((r) => setTimeout(r, 2000)),
      ])
    }
  } catch {
    swReady = false
  }
  const swVerify = await askSwVerify()
  const cacheProbe = await cacheHasIndex()
  const hasIndex = Boolean(swVerify?.hasIndex || cacheProbe.hasIndex)
  const ready = hasIndex && (controlled || swReady)
  writeShellReadyFlag(ready)
  return {
    ready,
    controlled,
    swReady,
    hasIndex,
    cacheNames: cacheProbe.cacheNames,
    lastCheckedAt: new Date().toISOString(),
    appVersion,
    detail: ready
      ? '오프라인 실행 준비 완료'
      : !hasIndex
        ? '앱 셸(index)이 아직 캐시에 없습니다. 온라인에서 한 번 더 열어 주세요.'
        : '서비스 워커가 이 페이지를 제어하지 않습니다. 홈 화면에 추가한 뒤 다시 열어 주세요.',
  }
}

export async function estimateLocalStorageBytes(): Promise<number> {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      const v = localStorage.getItem(k) || ''
      total += k.length + v.length
    }
    return total * 2 // UTF-16
  } catch {
    return 0
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
