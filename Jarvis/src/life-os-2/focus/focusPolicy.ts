/** Honest about OS limitations. */
export function focusOsLimitationsNotice(): string {
  return [
    '안내: AIZIO는 휴대폰 전체 무음·다른 앱 알림 강제 차단을 보장하지 않습니다.',
    '앱 내부에서만 방해를 줄이고, 종료 알림을 준비합니다.',
  ].join('\n')
}

export function parseFocusMinutes(text: string): number {
  const m = text.match(/(\d+)\s*분/)
  if (m) return Math.min(180, Math.max(5, parseInt(m[1], 10)))
  if (/한\s*시간|1\s*시간/.test(text)) return 60
  return 25
}

export function parseFocusTitle(text: string): string {
  const m =
    text.match(/집중(?:\s*모드)?(?:\s*시작)?(?:할래|할게)?[.!]?\s*(?:로\s*)?(.+)/i) ||
    text.match(/(\d+\s*분\s*동안)\s*(.+?)(?:에\s*집중|집중)/i) ||
    text.match(/동안\s*(.+?)(?:에\s*집중|집중할)/i)
  if (m) {
    const t = (m[2] || m[1] || '').replace(/\d+\s*분\s*동안/g, '').trim()
    if (t.length >= 2) return t.slice(0, 60)
  }
  if (/개발|AIZIO/i.test(text)) return 'AIZIO 개발'
  return '집중 세션'
}
