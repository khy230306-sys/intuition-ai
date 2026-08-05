/**
 * Lightweight local “fun” replies that never need cloud AI.
 * Keeps the app feeling alive when the selected model is down.
 */

function pickUnique(min: number, max: number, count: number): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

/** Returns a local reply for lotto / dice / coin — or null. */
export function localFunReply(text: string): string | null {
  const t = String(text || '').trim()
  if (!t) return null

  if (/로또|lotto|복권\s*번호|로또번호/i.test(t)) {
    const nums = pickUnique(1, 45, 6).sort((a, b) => a - b)
    const bonus = pickUnique(1, 45, 1).find((n) => !nums.includes(n)) || pickUnique(1, 45, 1)[0]
    return [
      '오늘의 로또 번호 추천이에요 (재미용 · 당첨을 보장하지 않습니다).',
      '',
      `본번호  ${nums.map((n) => String(n).padStart(2, '0')).join(' · ')}`,
      `보너스  ${String(bonus).padStart(2, '0')}`,
      '',
      '한 번 더 뽑으려면 「로또」라고 다시 말해 주세요.',
    ].join('\n')
  }

  if (/주사위|dice/i.test(t)) {
    const n = 1 + Math.floor(Math.random() * 6)
    return `주사위 결과: ${n}`
  }

  if (/동전|앞뒤|코인\s*토스|coin\s*flip/i.test(t)) {
    return Math.random() < 0.5 ? '동전: 앞면' : '동전: 뒷면'
  }

  if (/랜덤\s*숫자|아무\s*숫자|숫자\s*하나/i.test(t)) {
    const n = 1 + Math.floor(Math.random() * 100)
    return `랜덤 숫자: ${n} (1–100)`
  }

  return null
}
