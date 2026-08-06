/** Network status with light health probe — not navigator.onLine alone. */

export type NetStatus = 'online' | 'degraded' | 'offline' | 'checking'

export type NetStatusListener = (status: NetStatus, detail?: { reason?: string }) => void

const HEALTH_PATH = './build-meta.json'
const HEALTH_TIMEOUT_MS = 3500

let current: NetStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
let listeners: NetStatusListener[] = []
let probeTimer: ReturnType<typeof setInterval> | null = null
let probing = false

export function getNetStatus(): NetStatus {
  return current
}

export function netStatusLabelKo(status: NetStatus = current): string {
  switch (status) {
    case 'online':
      return '온라인'
    case 'degraded':
      return '제한된 연결'
    case 'checking':
      return '연결 확인 중'
    case 'offline':
    default:
      return '오프라인'
  }
}

export function subscribeNetStatus(fn: NetStatusListener): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((x) => x !== fn)
  }
}

function emit(status: NetStatus, reason?: string): void {
  if (current === status && !reason) return
  current = status
  for (const fn of listeners) {
    try {
      fn(status, reason ? { reason } : undefined)
    } catch {
      /* ignore */
    }
  }
}

export async function probeNetwork(opts?: { force?: boolean }): Promise<NetStatus> {
  if (probing && !opts?.force) return current
  probing = true
  const browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine
  if (!browserOnline) {
    emit('offline', 'navigator')
    probing = false
    return 'offline'
  }
  emit('checking')
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer =
    ctrl && typeof setTimeout !== 'undefined'
      ? setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
      : null
  try {
    const url = `${HEALTH_PATH}?_=${Date.now()}&_health=1`
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ctrl?.signal,
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    })
    if (res.ok) {
      emit('online', 'health-ok')
      return 'online'
    }
    emit('degraded', `http-${res.status}`)
    return 'degraded'
  } catch {
    // Browser says online but probe failed — degraded if onLine, else offline
    if (browserOnline) {
      emit('degraded', 'probe-fail')
      return 'degraded'
    }
    emit('offline', 'probe-fail')
    return 'offline'
  } finally {
    if (timer) clearTimeout(timer)
    probing = false
  }
}

export function startNetworkMonitor(intervalMs = 45_000): () => void {
  const onOnline = () => {
    void probeNetwork({ force: true })
  }
  const onOffline = () => emit('offline', 'event')
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
  }
  void probeNetwork({ force: true })
  if (probeTimer) clearInterval(probeTimer)
  probeTimer = setInterval(() => void probeNetwork(), intervalMs)
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
    if (probeTimer) {
      clearInterval(probeTimer)
      probeTimer = null
    }
  }
}

/** Features that require network — for safe failure copy. */
export type OnlineOnlyFeature =
  | 'weather'
  | 'ai'
  | 'place-search'
  | 'map-tiles'
  | 'music-stream'
  | 'push-diag'
  | 'web-search'

export function onlineOnlyMessage(feature: OnlineOnlyFeature): string {
  switch (feature) {
    case 'weather':
      return '현재 오프라인이라 최신 날씨를 확인할 수 없습니다.'
    case 'ai':
      return '현재 오프라인이라 온라인 AI를 사용할 수 없습니다. 저장된 대화와 로컬 기능은 이용할 수 있습니다.'
    case 'place-search':
      return '현재 오프라인이라 장소 검색을 할 수 없습니다.'
    case 'map-tiles':
      return '현재 오프라인이라 새 지도 타일을 불러올 수 없습니다. 이미 본 지역만 제한적으로 표시될 수 있습니다.'
    case 'music-stream':
      return '현재 오프라인이라 음악 스트리밍을 열 수 없습니다.'
    case 'push-diag':
      return '현재 오프라인이라 푸시 서버 진단을 할 수 없습니다.'
    case 'web-search':
      return '현재 오프라인이라 인터넷 검색을 할 수 없습니다.'
    default:
      return '현재 오프라인이라 이 기능을 사용할 수 없습니다.'
  }
}
