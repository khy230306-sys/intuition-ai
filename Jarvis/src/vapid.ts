/**
 * VAPID **public** key only — used for PushManager.subscribe.
 * Private key lives exclusively on push-server env (never ship in the client bundle).
 */

export const VAPID_PUBLIC_KEY =
  'BCYhU9UX42gHsf8RiRlXztfpFZqPyLfXxNrrXbRRNSs-7_qkL6t9-mMUQ4AIGETwDxBJFPdIXniMk6ckbDifF8c'

export const VAPID_SUBJECT = 'mailto:aizio-push@shipstatic.com'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
