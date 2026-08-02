/**
 * Short, user-facing AIZIO guide — “what is this app?” at a glance.
 * Keep this lighter than the full command list from 「도움말」.
 */

export function wantsUserGuide(raw: string): boolean {
  const t = String(raw || '').trim()
  if (!t) return false
  return (
    /사용\s*설명서|시작\s*가이드|간단\s*가이드|앱\s*소개|소개서/i.test(t) ||
    /이\s*앱(?:이|은)?\s*뭐|이게\s*뭐(?:야|예요|에요)|아이지오\s*(?:뭐|소개)|아이디어\s*사용/i.test(t) ||
    /^(가이드|guide)$/i.test(t)
  )
}

export function userGuideText(displayName?: string): string {
  const name = (displayName || '').trim()
  const hello = name ? `${name}님, ` : ''
  return [
    `${hello}AIZIO(아이지오)는 말로 쓰는 일상 비서 앱입니다.`,
    '',
    '한 줄로 말하면',
    '채팅창에 적거나 MIC로 말하면, 날씨·할 일·알림·투자·번역·메모를 대신 챙겨 줍니다.',
    '',
    '이렇게 써 보세요',
    '• 오늘 날씨 알려줘',
    '• 브리핑',
    '• 할 일 장보기 추가',
    '• 알림 30분 뒤 약',
    '• 삼성전자 시세',
    '• 일본어로 번역해 안녕하세요',
    '• 조용한 음악 틀어줘',
    '',
    '화면 아래 탭',
    '• 채팅 — 대화와 음성',
    '• 생활 — 할 일·장바구니·지출·습관·일기',
    '• 투자 — 시세·관심종목·포트폴리오',
    '• 가족 / 친구 — 코드로 함께 쓰는 공간',
    '• 게임 — 오프라인 미니게임',
    '• 설정 — 이름·AI 연결·앱 캐시',
    '',
    '알아 두면 좋아요',
    '• 날씨·시세·할 일·알림 등은 API 키 없이도 됩니다.',
    '• 자유 대화(잡담·긴 질문)는 설정에서 무료 AI를 연결하면 더 편합니다.',
    '• 명령어를 더 보고 싶으면 「도움말」이라고 말해 주세요.',
  ].join('\n')
}
