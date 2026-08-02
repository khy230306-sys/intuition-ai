export type ValidateResult =
  | { ok: true; text: string; warnings: string[] }
  | { ok: false; reason: string; warnings: string[] }

const SECRET_RE = /(sk-[A-Za-z0-9]{10,}|Bearer\s+[A-Za-z0-9._\-]{12,}|api[_-]?key\s*[:=]\s*\S+)/i
const SYSTEM_LEAK_RE = /(당신은 iPhone|【모드:|시스템 프롬프트|user 컨텍스트:)/i
const WRONG_PLATFORM_RE =
  /(OpenClaw|Ollama\s*(로컬|서버)|Windows\s*Electron|Electron\s*앱|Gateway\s*토큰|Bridge\s*실행)/i
const FALSE_DONE_RE = /(배포\s*완료했습니다|이미\s*수정\s*완료|커밋\s*푸시\s*했습니다|테스트를\s*모두\s*통과시켰습니다)/i

function hasRepeatLoop(text: string): boolean {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length >= 6) {
    const last = lines[lines.length - 1]!
    const same = lines.filter((l) => l === last).length
    if (same >= 5) return true
  }
  const m = text.match(/(.{12,40})\1{4,}/)
  return Boolean(m)
}

export function validateAiResponse(raw: unknown): ValidateResult {
  const warnings: string[] = []
  if (raw == null) return { ok: false, reason: 'empty', warnings }
  if (typeof raw !== 'string') return { ok: false, reason: 'not_string', warnings }

  let text = raw.trim()
  if (!text) return { ok: false, reason: 'empty', warnings }

  if (/^\s*<(!DOCTYPE|html|HTML)/i.test(text) || /<\/html>/i.test(text)) {
    return { ok: false, reason: 'html_error_page', warnings }
  }

  if (text.length < 2) return { ok: false, reason: 'too_short', warnings }

  if (SECRET_RE.test(text)) {
    text = text.replace(SECRET_RE, '[REDACTED]')
    warnings.push('secret_redacted')
  }

  if (SYSTEM_LEAK_RE.test(text) && text.length < 80) {
    return { ok: false, reason: 'system_leak', warnings }
  }

  if (hasRepeatLoop(text)) return { ok: false, reason: 'repeat_loop', warnings }

  if (WRONG_PLATFORM_RE.test(text)) {
    warnings.push('wrong_platform_claim')
  }
  if (FALSE_DONE_RE.test(text)) {
    warnings.push('false_completion_claim')
  }

  return { ok: true, text, warnings }
}
