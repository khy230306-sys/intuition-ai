/** Network status with light health probe — not navigator.onLine alone. */

import {
  classifyConnection,
  connectionLabelKo,
  offlineUserMessage,
  type ConnectionKind,
} from './connectionModel'

export type NetStatus = 'online' | 'degraded' | 'offline' | 'checking' | 'captive'

export type NetStatusListener = (status: NetStatus, detail?: { reason?: string }) => void

const HEALTH_PATH = './build-meta.json'
const HEALTH_TIMEOUT_MS = 3500

let current: NetStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
let connectionKind: ConnectionKind =
  typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE'
let listeners: NetStatusListener[] = []
let probeTimer: ReturnType<typeof setInterval> | null = null
let probing = false

export function getNetStatus(): NetStatus {
  return current
}

export function getConnectionKind(): ConnectionKind {
  return connectionKind
}

export function isEffectivelyOffline(status: NetStatus = current): boolean {
  return status === 'offline' || status === 'captive'
}

function toNetStatus(kind: ConnectionKind, checking = false): NetStatus {
  if (checking) return 'checking'
  switch (kind) {
    case 'ONLINE':
      return 'online'
    case 'DEGRADED':
      return 'degraded'
    case 'CAPTIVE_PORTAL':
      return 'captive'
    case 'OFFLINE':
    default:
      return 'offline'
  }
}

export function netStatusLabelKo(status: NetStatus = current): string {
  switch (status) {
    case 'online':
      return connectionLabelKo('ONLINE')
    case 'degraded':
      return connectionLabelKo('DEGRADED')
    case 'captive':
      return connectionLabelKo('CAPTIVE_PORTAL')
    case 'checking':
      return '연결 확인 중'
    case 'offline':
    default:
      return connectionLabelKo('OFFLINE')
  }
}

export function subscribeNetStatus(fn: NetStatusListener): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((x) => x !== fn)
  }
}

function emit(status: NetStatus, reason?: string, kind?: ConnectionKind): void {
  if (kind) connectionKind = kind
  else if (status === 'offline') connectionKind = 'OFFLINE'
  else if (status === 'online') connectionKind = 'ONLINE'
  else if (status === 'degraded') connectionKind = 'DEGRADED'
  else if (status === 'captive') connectionKind = 'CAPTIVE_PORTAL'
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
    emit('offline', 'navigator', 'OFFLINE')
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
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const jsonOk = res.ok && ct.includes('json')
    if (jsonOk) {
      emit('online', 'health-ok', 'ONLINE')
      return 'online'
    }
    const kind = classifyConnection({
      navigatorOnline: true,
      healthOk: false,
      healthStatus: res.status,
    })
    const net = toNetStatus(kind)
    emit(net, `http-${res.status}`, kind)
    return net
  } catch {
    const kind = classifyConnection({ navigatorOnline: browserOnline, healthOk: false })
    const net = toNetStatus(kind)
    emit(net, 'probe-fail', kind)
    return net
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
      return offlineUserMessage('weather')
    case 'ai':
      return offlineUserMessage('ai_llm')
    case 'place-search':
      return offlineUserMessage('places')
    case 'map-tiles':
      return offlineUserMessage('maps_tiles')
    case 'music-stream':
      return offlineUserMessage('music_stream')
    case 'push-diag':
      return offlineUserMessage('push_sync')
    case 'web-search':
      return '현재 인터넷 연결이 없어 검색할 수 없어요. 연결되면 바로 확인할 수 있습니다.'
    default:
      return '현재 오프라인이라 이 기능을 사용할 수 없습니다.'
  }
}
