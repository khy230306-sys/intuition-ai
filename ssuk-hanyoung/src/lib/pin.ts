/** Parent PIN — salted hash, never plaintext */

const SESSION_KEY = 'ssuk-parent-unlocked'

function bytesToHex(buf: ArrayBuffer | Uint8Array) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return [...u8].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomSalt(len = 16) {
  const a = new Uint8Array(len)
  crypto.getRandomValues(a)
  return bytesToHex(a)
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(digest)
}

export async function verifyPin(pin: string, salt: string | null, hash: string | null): Promise<boolean> {
  if (!salt || !hash || !/^\d{4}$/.test(pin)) return false
  const h = await hashPin(pin, salt)
  return h === hash
}

export function isParentUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockParentSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function lockParentSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function makeRecoveryToken() {
  return randomSalt(12)
}
