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
    /api\s*키|에이피아이\s*키|키\s*발급|키\s*입력|ai\s*연결\s*(방법|안내)|무료\s*ai\s*(연결|설정)/i.test(t) ||
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
    '• 손님관리 / 손님 추가 김철수 1990-05-15',
    '',
    '화면 아래 탭',
    '• 채팅 — 대화와 음성',
    '• 생활 — 할 일·장바구니·지출·습관·일기',
    '• 투자 — 주식엔진 스크리닝·종목분석·시세·포트폴리오',
    '• 가족 / 친구 — 코드로 함께 쓰는 공간',
    '• 게임 — 오프라인 미니게임',
    '• 설정 — 이름·AI 연결·앱 캐시',
    '• 손님관리 — 비즈니스 손님 이름·생일 명단 (메뉴 · 실행)',
    '',
    'API 키 · 자유 대화(선택)',
    '날씨·시세·할 일·알림은 키 없이 됩니다. 잡담·긴 질문은 AI 키가 있으면 더 자연스럽습니다.',
    '1) 하단 「설정」→ AI 연결(Hybrid Provider)',
    '2) OpenRouter / Gemini / Groq(무료 시작) 또는 OpenAI 중 하나 선택',
    '3) 아래 사이트에서 키 발급 → 복사',
    '   · OpenRouter openrouter.ai/keys',
    '   · Gemini aistudio.google.com/apikey',
    '   · Groq console.groq.com/keys',
    '   · OpenAI platform.openai.com/api-keys',
    '4) 설정에 붙여넣고 「설정 저장」→ 필요하면 「연결 테스트」',
    '키는 이 기기에만 저장됩니다. 채팅에 키를 붙여넣지 마세요.',
    'ChatGPT Plus ≠ API 결제입니다. 무료 한도는 제공사 정책에 따라 달라집니다.',
    '',
    '알아 두면 좋아요',
    '• 명령어를 더 보려면 「도움말」',
    '• 투자 정보는 참고용이며 투자 조언이 아닙니다.',
  ].join('\n')
}
