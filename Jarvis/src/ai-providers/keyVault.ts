/**
 * Client-side key helpers.
 * Mobile PWA storage is NOT equivalent to a server vault — keys remain recoverable on-device.
 */

const OBF_PREFIX = 'aizio1:'

export function maskApiKey(key: string): string {
  const k = key.trim()
  if (!k) return ''
  if (k.length <= 8) return '••••••••'
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

export function hasStoredKey(key: string | undefined | null): boolean {
  return Boolean(key && key.trim())
}

/** Lightweight obfuscation (not server-grade secrecy). */
export function obfuscateSecret(plain: string): string {
  const p = plain.trim()
  if (!p) return ''
  const key = 0x5a
  const bytes = Array.from(new TextEncoder().encode(p)).map((b) => b ^ key)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return OBF_PREFIX + btoa(bin)
}

export function deobfuscateSecret(stored: string): string {
  const s = stored || ''
  if (!s) return ''
  if (!s.startsWith(OBF_PREFIX)) return s
  try {
    const bin = atob(s.slice(OBF_PREFIX.length))
    const key = 0x5a
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0) ^ key)
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

/** Keep existing key when form field left blank (masked UI). */
export function mergeKeyInput(formValue: string, existing: string): string {
  const v = formValue.trim()
  if (!v) return existing.trim()
  if (/^[•*…\.]+$/.test(v) || v.includes('…')) return existing.trim()
  return v
}
