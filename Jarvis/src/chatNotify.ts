/**
 * Family/friends chat alerts — foreground Notification + Web Push for background.
 * iOS: Home Screen PWA + notification permission required for background delivery.
 */

import { loadSettings } from './storage'
import { getPushServerStatus } from './push/serverUrl'
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from './vapid'

export type ChatNotifyKind = 'family' | 'friends'

export type StoredPushSubscription = {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

const SUB_KEY = 'jarvis.push.subscription.v1'

export function canUseWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function loadStoredPushSubscription(): StoredPushSubscription | null {
  try {
    const raw = localStorage.getItem(SUB_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredPushSubscription
  } catch {
    return null
  }
}

function saveStoredPushSubscription(sub: StoredPushSubscription | null): void {
  if (!sub) localStorage.removeItem(SUB_KEY)
  else localStorage.setItem(SUB_KEY, JSON.stringify(sub))
}

export async function ensureChatNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function subscribeChatPush(): Promise<StoredPushSubscription | null> {
  if (!canUseWebPush()) return null
  const perm = await ensureChatNotificationPermission()
  if (perm !== 'granted') return null
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
    const stored: StoredPushSubscription = {
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }
    saveStoredPushSubscription(stored)
    return stored
  } catch {
    return loadStoredPushSubscription()
  }
}

export async function unsubscribeChatPush(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()
    }
  } catch {
    /* ignore */
  }
  saveStoredPushSubscription(null)
}

function chatNotifyEnabled(kind: ChatNotifyKind): boolean {
  const s = loadSettings()
  if (kind === 'family') return s.notifyFamilyChat !== false
  return s.notifyFriendsChat !== false
}

function shouldNotifyWhileVisible(): boolean {
  return loadSettings().notifyWhileOpen === true
}

export async function showChatNotification(input: {
  kind: ChatNotifyKind
  title: string
  body: string
  tag?: string
}): Promise<void> {
  if (!chatNotifyEnabled(input.kind)) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  const viewingThisSpace = document.body?.dataset?.jarvisView === input.kind
  const appFocused =
    document.visibilityState === 'visible' && typeof document.hasFocus === 'function' && document.hasFocus()
  if (appFocused && viewingThisSpace && !shouldNotifyWhileVisible()) {
    try {
      navigator.vibrate?.([40, 30, 40])
    } catch {
      /* ignore */
    }
    return
  }

  const title = input.title.slice(0, 64)
  const body = input.body.slice(0, 160)
  const tag = input.tag || `jarvis-${input.kind}-chat`
  const data = { view: input.kind, kind: input.kind }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body,
        tag,
        renotify: true,
        data,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
      } as NotificationOptions)
      try {
        navigator.vibrate?.([80, 40, 80])
      } catch {
        /* ignore */
      }
      return
    }
  } catch {
    /* fall through */
  }

  try {
    const n = new Notification(title, { body, tag, data })
    setTimeout(() => n.close(), 12_000)
  } catch {
    /* ignore */
  }
}

/**
 * Background chat push via push-server relay (VAPID private key never in the browser).
 * Without a configured push server URL, returns 0 (local Notification still works while open).
 */
export async function pushChatToSubscriptions(
  subscriptions: Array<StoredPushSubscription | null | undefined>,
  payload: { title: string; body: string; kind: ChatNotifyKind; tag?: string },
): Promise<number> {
  const unique = new Map<string, StoredPushSubscription>()
  for (const s of subscriptions) {
    if (s?.endpoint && s.keys?.p256dh && s.keys?.auth) unique.set(s.endpoint, s)
  }
  if (!unique.size) return 0

  const server = getPushServerStatus()
  if (!server.configured || !server.baseUrl) return 0

  try {
    const res = await fetch(`${server.baseUrl}/v1/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptions: [...unique.values()].map((s) => ({
          endpoint: s.endpoint,
          keys: s.keys,
        })),
        payload: {
          title: payload.title.slice(0, 64),
          body: payload.body.slice(0, 160),
          kind: payload.kind,
          tag: payload.tag || `jarvis-${payload.kind}-chat`,
        },
      }),
    })
    if (!res.ok) return 0
    const data = (await res.json()) as { sent?: number }
    return typeof data.sent === 'number' ? data.sent : 0
  } catch {
    return 0
  }
}
