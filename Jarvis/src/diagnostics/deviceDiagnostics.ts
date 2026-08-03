/**
 * Device test / diagnostics — no API keys or secrets in export.
 */

import { ensureGuestIdentity } from '../account'
import { getPushServerStatus, loadReminderPushSubscription } from '../push'
import { canUseWebPush, loadStoredPushSubscription } from '../chatNotify'
import { loadHybridAiConfig } from '../ai-providers'
import { loadLifeFlags } from '../life-os/featureFlags'

export type DeviceDiagnostics = {
  app: 'AIZIO'
  version: string
  buildId: string
  commit: string
  channel: string
  builtAt?: string
  generatedAt: string
  browser: string
  userAgent: string
  osHint: string
  language: string
  standalonePwa: boolean
  online: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  microphoneHint: string
  serviceWorker: {
    controlled: boolean
    controllerState: string | null
    ready: boolean
  }
  push: {
    webPushSupported: boolean
    chatSubscription: boolean
    reminderSubscription: boolean
    reminderServerRegistered: boolean
    pushServerConfigured: boolean
    pushServerReason: string
  }
  storage: {
    localStorageWritable: boolean
    indexedDbAvailable: boolean
    note: string
  }
  user: {
    userId: string
    deviceId: string
    mode: string
  }
  providers: {
    mode: string
    configured: string[]
    /** Never includes key material */
    hasAnyKey: boolean
  }
  featureFlags: Record<string, boolean>
  recentErrorCodes: string[]
  href: string
}

const ERROR_KEY = 'aizio_diag_errors_v1'
const MAX_ERRORS = 20

export function recordDiagError(code: string): void {
  try {
    const raw = localStorage.getItem(ERROR_KEY)
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
    list.unshift(`${new Date().toISOString()} ${code}`)
    localStorage.setItem(ERROR_KEY, JSON.stringify(list.slice(0, MAX_ERRORS)))
  } catch {
    /* ignore */
  }
}

function recentErrors(): string[] {
  try {
    const raw = localStorage.getItem(ERROR_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function osHint(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'unknown'
}

function browserHint(ua: string): string {
  if (/CriOS/i.test(ua)) return 'Chrome iOS'
  if (/FxiOS/i.test(ua)) return 'Firefox iOS'
  if (/EdgiOS|Edg\//i.test(ua)) return 'Edge'
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari'
  return 'other'
}

async function loadBuildMeta(): Promise<{
  version: string
  buildId: string
  commit: string
  channel: string
  builtAt?: string
}> {
  try {
    const res = await fetch(`./build-meta.json?_=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const j = (await res.json()) as Record<string, string>
      return {
        version: j.version || 'unknown',
        buildId: j.buildId || 'unknown',
        commit: j.commit || 'unknown',
        channel: j.channel || 'unknown',
        builtAt: j.builtAt,
      }
    }
  } catch {
    /* ignore */
  }
  return { version: 'unknown', buildId: 'unknown', commit: 'unknown', channel: 'unknown' }
}

function localStorageOk(): boolean {
  try {
    const k = '__aizio_diag__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

async function indexedDbAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false
    return await new Promise((resolve) => {
      const req = indexedDB.open('aizio_diag_probe')
      req.onerror = () => resolve(false)
      req.onsuccess = () => {
        try {
          req.result.close()
          indexedDB.deleteDatabase('aizio_diag_probe')
        } catch {
          /* ignore */
        }
        resolve(true)
      }
    })
  } catch {
    return false
  }
}

async function micHint(): Promise<string> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
    const perms = (navigator as Navigator & { permissions?: { query: (x: { name: string }) => Promise<{ state: string }> } })
      .permissions
    if (perms?.query) {
      const st = await perms.query({ name: 'microphone' })
      return st.state
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function collectDeviceDiagnostics(appVersionFallback: string): Promise<DeviceDiagnostics> {
  const meta = await loadBuildMeta()
  const identity = ensureGuestIdentity()
  const hybrid = loadHybridAiConfig()
  const configured = Object.entries(hybrid.providers || {})
    .filter(([, s]) => s.enabled !== false && Boolean((s as { apiKeyEnc?: string; apiKey?: string }).apiKeyEnc || s.apiKey))
    .map(([id]) => id)
  const remSub = loadReminderPushSubscription()
  const pushServer = getPushServerStatus()
  let swReady = false
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready
      swReady = true
    }
  } catch {
    swReady = false
  }

  return {
    app: 'AIZIO',
    version: meta.version !== 'unknown' ? meta.version : appVersionFallback,
    buildId: meta.buildId,
    commit: meta.commit,
    channel: meta.channel,
    builtAt: meta.builtAt,
    generatedAt: new Date().toISOString(),
    browser: typeof navigator !== 'undefined' ? browserHint(navigator.userAgent) : 'n/a',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : '',
    osHint: typeof navigator !== 'undefined' ? osHint(navigator.userAgent) : 'n/a',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    standalonePwa:
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    online: typeof navigator !== 'undefined' ? navigator.onLine : false,
    notificationPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    microphoneHint: await micHint(),
    serviceWorker: {
      controlled: typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller),
      controllerState: navigator.serviceWorker?.controller?.state || null,
      ready: swReady,
    },
    push: {
      webPushSupported: canUseWebPush(),
      chatSubscription: Boolean(loadStoredPushSubscription()),
      reminderSubscription: Boolean(remSub),
      reminderServerRegistered: Boolean(remSub?.serverRegisteredAt),
      pushServerConfigured: pushServer.configured,
      pushServerReason: pushServer.reason,
    },
    storage: {
      localStorageWritable: localStorageOk(),
      indexedDbAvailable: await indexedDbAvailable(),
      note: 'App data uses localStorage; IndexedDB probe only',
    },
    user: {
      userId: identity.userId,
      deviceId: identity.deviceId,
      mode: identity.mode,
    },
    providers: {
      mode: String(hybrid.mode || 'auto'),
      configured,
      hasAnyKey: configured.length > 0,
    },
    featureFlags: loadLifeFlags() as unknown as Record<string, boolean>,
    recentErrorCodes: recentErrors(),
    href: typeof location !== 'undefined' ? location.href.split('#')[0]! : '',
  }
}

/** Strip anything that looks like a secret before download. */
export function diagnosticsToSafeJson(diag: DeviceDiagnostics): string {
  const raw = JSON.stringify(diag, null, 2)
  return raw
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, '[redacted]')
    .replace(/ship-[a-f0-9]{10,}/g, '[redacted]')
    .replace(/"apiKey"\s*:\s*"[^"]*"/gi, '"apiKey":""')
}

export function downloadDiagnosticsJson(diag: DeviceDiagnostics): void {
  const blob = new Blob([diagnosticsToSafeJson(diag)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `aizio-diagnostics-${diag.version}-${diag.commit}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
