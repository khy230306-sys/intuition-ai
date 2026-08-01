/** Shared VAPID keys for JARVIS family/friends Web Push (client-side send). */

export const VAPID_PUBLIC_KEY =
  'BKupo7Y_efhJskLSk_xdJwyviAfqjjnFUPdlRVnSvWd6AXQJCELFn-T01U7BOCpOvU9DDUUk-xLhjfjv8Lozis8'

export const VAPID_PRIVATE_KEY = 'Ng488Bab1APMQZ4kQscyp6v3MAs_AdqTLmKfObgRgMw'

export const VAPID_SUBJECT = 'mailto:jarvis-app@shipstatic.com'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
