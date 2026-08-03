/** Privacy rules for DNA / health / finance / family. */

const SENSITIVE_RE =
  /비밀번호|패스워드|password|api\s*key|sk-[a-z0-9]|카드\s*번호|주민\s*등록|계좌|인증\s*토큰|cookie|쿠키|cvv|비밀번호는/i

const MEDICAL_DIAGNOSIS_RE = /진단\s*결과|암\s*확정|처방\s*받으세요|질병\s*확정/i

export function looksLikeForbiddenSecret(text: string): boolean {
  return SENSITIVE_RE.test(String(text || ''))
}

export function looksLikeMedicalDiagnosisClaim(text: string): boolean {
  return MEDICAL_DIAGNOSIS_RE.test(String(text || ''))
}

/** Fields never included in generic JSON export. */
export const EXPORT_BLOCKLIST_KEYS = [
  'apiKey',
  'apiKeys',
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'hybridAi',
] as const

export function stripSecretsFromObject(input: unknown): unknown {
  if (input == null || typeof input !== 'object') return input
  if (Array.isArray(input)) return input.map(stripSecretsFromObject)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (EXPORT_BLOCKLIST_KEYS.some((b) => k.toLowerCase().includes(b.toLowerCase()))) continue
    out[k] = stripSecretsFromObject(v)
  }
  return out
}
