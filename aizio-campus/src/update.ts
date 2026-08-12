/**
 * Force Campus to the latest deployed build on every start / resume.
 * Clears stale service-worker caches when remote build-meta disagrees
 * with the JS currently running in this tab.
 */

const SEEN_BUILD_KEY = 'aizio_campus_seen_build'
const REFRESHING_KEY = 'aizio_campus_refreshing'

export type RemoteBuildMeta = {
  version?: string
  buildId?: string
  commit?: string
  builtAt?: string
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return new Promise((resolve) => {
    let done = false
    const timer = window.setTimeout(() => {
      if (!done) {
        done = true
        resolve(undefined)
      }
    }, ms)
    promise.then(
      (v) => {
        if (!done) {
          done = true
          window.clearTimeout(timer)
          resolve(v)
        }
      },
      () => {
        if (!done) {
          done = true
          window.clearTimeout(timer)
          resolve(undefined)
        }
      },
    )
  })
}

export async function clearCampusCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        regs.map(async (r) => {
          try {
            await r.unregister()
          } catch {
            /* ignore */
          }
        }),
      )
    } catch {
      /* ignore */
    }
  }
  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      /* ignore */
    }
  }
}

function paintUpdateSplash(message: string): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `
    <main class="panel campus-shell" data-campus-root="1" style="min-height:70dvh;display:flex;align-items:center;justify-content:center">
      <section class="campus-panel" style="text-align:center;max-width:22rem">
        <h2>AIZIO CAMPUS</h2>
        <p>${message}</p>
        <p class="hint">최신 빌드를 불러오는 중…</p>
      </section>
    </main>`
}

/** Wipe SW/caches and hard-navigate so the next load is network-fresh. */
export async function hardReloadToLatest(reason = 'update'): Promise<void> {
  const stuck = sessionStorage.getItem(REFRESHING_KEY) === '1'
  sessionStorage.setItem(REFRESHING_KEY, '1')
  paintUpdateSplash(stuck ? '앱을 다시 불러오는 중…' : '최신 버전으로 업데이트하는 중…')
  try {
    await withTimeout(clearCampusCaches(), 3500)
  } catch {
    /* ignore */
  }
  const url = new URL(location.href)
  url.searchParams.set('_campus_refresh', String(Date.now()))
  url.searchParams.set('_why', reason.slice(0, 24))
  location.replace(url.toString())
}

export async function fetchRemoteBuildMeta(): Promise<RemoteBuildMeta | null> {
  try {
    const res = await fetch(`./build-meta.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as RemoteBuildMeta
  } catch {
    return null
  }
}

/**
 * Compare running APP_VERSION with network build-meta.
 * Returns 'reloading' if a hard navigation was started.
 */
export async function ensureLatestBuild(localVersion: string): Promise<'ok' | 'reloading'> {
  if (sessionStorage.getItem(REFRESHING_KEY) === '1') {
    sessionStorage.removeItem(REFRESHING_KEY)
    // Drop cache-buster query so the URL stays clean after a successful refresh
    if (location.search.includes('_campus_refresh=')) {
      const clean = new URL(location.href)
      clean.searchParams.delete('_campus_refresh')
      clean.searchParams.delete('_why')
      history.replaceState(null, '', clean.pathname + clean.search + clean.hash)
    }
    return 'ok'
  }

  const meta = await fetchRemoteBuildMeta()
  if (!meta?.version) return 'ok'

  const remoteKey = `${meta.version}|${meta.buildId || ''}`
  localStorage.setItem(SEEN_BUILD_KEY, remoteKey)

  if (meta.version !== localVersion) {
    await hardReloadToLatest(`ver:${meta.version}`)
    return 'reloading'
  }
  return 'ok'
}

/** Call registration.update() on focus / interval so new deploys activate quickly. */
export function bindServiceWorkerUpdateChecks(reg: ServiceWorkerRegistration | undefined): void {
  if (!reg) return
  const ping = () => {
    void reg.update().catch(() => undefined)
  }
  ping()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ping()
  })
  window.addEventListener('focus', ping)
  window.setInterval(ping, 60_000)
}
