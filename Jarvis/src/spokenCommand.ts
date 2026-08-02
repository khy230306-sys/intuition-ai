/**
 * Everyday spoken-command detection for voice STT.
 * Handles spacing variants, filler words, and near-miss transcripts.
 */

export type EverydayIntent =
  | { kind: 'weather'; city: string }
  | { kind: 'umbrella'; city: string }
  | { kind: 'time' }
  | { kind: 'date' }
  | { kind: 'briefing' }
  | { kind: 'location' }
  | { kind: 'help' }
  | { kind: 'clearChat' }
  | null

const FILLER =
  /(?:좀|제발|해주세요|해줘|해줘요|알려줘|알려줘요|알려|어때|어때요|확인|확인해|확인해줘|말해줘|말해|보여줘|부탁해|부탁드려요)/g

/** Normalize STT spacing / filler for intent matching. */
export function normalizeCommandText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/알려\s*줘/g, '알려줘')
    .replace(/해\s*줘/g, '해줘')
    .replace(/오늘\s*의?/g, '오늘 ')
    .replace(/날\s*씨/g, '날씨')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactKo(s: string): string {
  return s.replace(/\s+/g, '')
}

/** Dice coefficient on character bigrams (good for short Korean STT). */
export function bigramSimilarity(a: string, b: string): number {
  const x = compactKo(a)
  const y = compactKo(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0
  const grams = (s: string): Map<string, number> => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) || 0) + 1)
    }
    return m
  }
  const A = grams(x)
  const B = grams(y)
  let overlap = 0
  for (const [g, n] of A) {
    const m = B.get(g) || 0
    overlap += Math.min(n, m)
  }
  return (2 * overlap) / (x.length - 1 + (y.length - 1))
}

const WEATHER_SEEDS = [
  '오늘날씨알려줘',
  '오늘날씨어때',
  '날씨알려줘',
  '날씨어때',
  '오늘날씨',
  '내일날씨',
  '비와',
  '비올까',
  '우산필요해',
  '우산챙길까',
  '기온어때',
  '미세먼지어때',
  '날씨확인',
  '오늘날씨확인',
]

const TIME_SEEDS = ['지금몇시야', '몇시야', '지금몇시', '시간알려줘']
const DATE_SEEDS = ['오늘며칠이야', '오늘날짜', '며칠이야', '날짜알려줘']
const BRIEF_SEEDS = ['브리핑', '오늘브리핑', '아침브리핑', '오늘일정', '오늘뭐하지']
const LOC_SEEDS = ['내위치', '현재위치', '지금어디야', '위치알려줘']
const HELP_SEEDS = ['도움말', '헬프', '사용법', '뭐할수있어', '기능알려줘']
const CLEAR_SEEDS = [
  '대화삭제해줘',
  '대화삭제',
  '대화초기화',
  '지난대화삭제',
  '채팅삭제',
  '기록삭제',
  '대화지워줘',
  '채팅지워',
  '채팅초기화',
]

function bestSeedScore(compact: string, seeds: string[]): number {
  let best = 0
  for (const s of seeds) {
    if (compact.includes(s) || s.includes(compact)) {
      best = Math.max(best, compact.length >= 4 ? 0.92 : 0.75)
      continue
    }
    best = Math.max(best, bigramSimilarity(compact, s))
  }
  return best
}

function extractWeatherCity(text: string): string {
  const t = normalizeCommandText(text)
  // "서울 날씨", "부산 날씨 알려줘"
  const m =
    t.match(/^(.+?)\s*날씨/) ||
    t.match(/날씨\s*(.+)$/) ||
    t.match(/^(?:날씨)\s*(.+)$/i)
  let city = (m?.[1] || '').trim()
  city = city
    .replace(/^(오늘|내일|모레|지금)\s*/u, '')
    .replace(FILLER, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Drop if city is pure filler / too long (likely not a place)
  if (!city || city.length > 12 || /^(어때|알려|확인|좀)$/.test(city)) return ''
  return city
}

export function wantsWeatherCommand(text: string): boolean {
  const t = normalizeCommandText(text)
  if (/날씨|기온|우산|미세먼지|기상|체감\s*온도|비\s*올|비\s*오|비\s*와/.test(t)) return true
  const c = compactKo(t)
  if (/날씨|기온|우산|미세먼지/.test(c)) return true
  return bestSeedScore(c, WEATHER_SEEDS) >= 0.55
}

/**
 * Detect everyday voice/text intents without an API key.
 * Prefer explicit keyword hits; fall back to fuzzy seed match for STT noise.
 */
export function detectEverydayIntent(raw: string): EverydayIntent {
  const text = normalizeCommandText(raw)
  if (!text) return null
  const c = compactKo(text)

  if (wantsWeatherCommand(text) || /우산/.test(text)) {
    if (/우산/.test(text) && !/날씨|기온|비/.test(text)) {
      return { kind: 'umbrella', city: extractWeatherCity(text) }
    }
    return { kind: 'weather', city: extractWeatherCity(text) }
  }

  if (
    /^(지금\s*)?몇\s*시|시간\s*알려|현재\s*시간/.test(text) ||
    bestSeedScore(c, TIME_SEEDS) >= 0.6
  ) {
    return { kind: 'time' }
  }

  if (
    /오늘\s*(날짜|며칠)|며칠이야|날짜\s*알려/.test(text) ||
    bestSeedScore(c, DATE_SEEDS) >= 0.6
  ) {
    return { kind: 'date' }
  }

  if (
    /^(브리핑|아침\s*브리핑)|오늘\s*뭐하지|오늘\s*일정/.test(text) ||
    bestSeedScore(c, BRIEF_SEEDS) >= 0.65
  ) {
    return { kind: 'briefing' }
  }

  if (
    /^(내\s*위치|현재\s*위치|위치\s*알려)|지금\s*어디야|where\s*am\s*i/i.test(text) ||
    bestSeedScore(c, LOC_SEEDS) >= 0.65
  ) {
    return { kind: 'location' }
  }

  if (
    /^(도움말|헬프|help|기능|사용법)$/i.test(text) ||
    /뭐\s*할\s*수\s*있|기능\s*알려/.test(text) ||
    bestSeedScore(c, HELP_SEEDS) >= 0.7
  ) {
    return { kind: 'help' }
  }

  if (
    /대화\s*초기화|채팅\s*초기화|지난\s*대화\s*삭제|대화\s*삭제|채팅\s*삭제|기록\s*삭제|대화\s*지워|채팅\s*지워|메시지\s*(?:전부\s*)?삭제|클리어\s*채팅|clear\s*chat|reset\s*chat/i.test(
      text,
    ) ||
    bestSeedScore(c, CLEAR_SEEDS) >= 0.6
  ) {
    return { kind: 'clearChat' }
  }

  return null
}

/** Strip emoji / decorative symbols; keep letters & numbers for intent checks. */
export function stripDecorative(text: string): string {
  return String(text || '')
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/[^\p{L}\p{N}\s~!?.…ㅋㅎㅠㅜㅎ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compliment / gratitude / greeting / emotion / short casual chat.
 * These are real utterances — never treat as STT failure.
 */
export function isCasualChatText(text: string): boolean {
  const raw = String(text || '').trim()
  if (!raw) return false
  const t = stripDecorative(raw)
  const body = t || raw
  const c = compactKo(body)

  // Emoji-only / laugh-only short reactions
  if (!/[가-힣a-zA-Z]{2,}/.test(body) && /[\p{Extended_Pictographic}ㅋㅎㅠㅜ~!?.]/u.test(raw) && raw.length <= 12) {
    return true
  }
  if (/^(ㅋ+|ㅎ+|ㅠ+|ㅜ+|대박ㅋ*|헐|오|와+|굿+|ok|okay|lol|haha)+$/i.test(c)) return true

  // Explicit social patterns
  if (
    /고마|감사|사랑|최고|멋지|대단|잘했|똑똑|멋있|짱|훌륭|수고|덕분|피곤|심심|기분|안녕|하이|헬로|대박|hello|hi\b|thanks|thank\s*you|love\s*you|great|awesome/i.test(
      body,
    )
  ) {
    return true
  }
  if (/(비서|너|넌|당신).*(최고|대단|똑똑|잘|멋)/.test(c)) return true
  if (/(최고|대단|똑똑|잘했|멋지).*(비서|야|다|네|요)?$/.test(c)) return true

  return false
}

/** Short local reply when API key is missing (AI Engine unavailable). */
export function localCasualReply(text: string): string | null {
  if (!isCasualChatText(text)) return null
  const c = compactKo(stripDecorative(text) || text)
  if (/고마|감사|thanks|thank/i.test(c)) return '천만에요. 더 필요한 일 있으면 편하게 말해 주세요.'
  if (/사랑|love/i.test(c)) return '저도 함께여서 기뻐요. 언제든지 불러 주세요.'
  if (/안녕|하이|헬로|hello|^hi$/i.test(c)) return '안녕하세요. 무엇을 도와드릴까요?'
  if (/피곤|심심|기분/.test(c)) return '말씀 감사합니다. 잠깐 쉬어도 좋고, 원하시면 음악이나 브리핑도 도와드릴게요.'
  if (/최고|대단|똑똑|잘했|멋지|짱|훌륭|굿|대박|비서/.test(c)) {
    return '고마워요. 그렇게 말해 주시니 힘이 나요. 앞으로도 더 잘 도와드릴게요.'
  }
  if (/ㅋㅋ+|ㅎㅎ+/.test(c)) return 'ㅎㅎ 저도 같이 웃었어요. 다음엔 뭐 도와드릴까요?'
  return '말씀 감사해요. 필요한 일이 있으면 편하게 말해 주세요.'
}

/**
 * True when transcript looks like STT garbage (gibberish), NOT when it is
 * casual chat / compliments / readable Korean without a command keyword.
 */
export function looksLikeSttGarbage(text: string): boolean {
  const t = normalizeCommandText(text)
  if (!t) return true
  const stripped = stripDecorative(t)
  // Keep emoji-only / punctuation-only short reactions as casual, not garbage
  if (!stripped) return !isCasualChatText(t)
  if (stripped.length > 28) return false
  if (isCasualChatText(t) || isCasualChatText(stripped)) return false

  // Structured Korean (particles / sentence endings) = real speech
  const c = compactKo(stripped)
  if (
    /[가-힣]{2,}/.test(stripped) &&
    (/(은|는|이|가|을|를|의|도|만|와|과|으로|에서)/.test(stripped) ||
      /(요|다|해|워|야|네|지|까|께|음|습니다|해요|했어|이야|거든|잖아)$/.test(c))
  ) {
    return false
  }

  if (/[a-zA-Z]{4,}/.test(stripped) && !/[가-힣]{2,}/.test(stripped)) return true
  // Hangul but no common content tokens and fails all seeds
  if (!/[가-힣]{2,}/.test(stripped)) return true
  const useful =
    /날씨|시간|시세|브리핑|위치|번역|통역|가족|친구|게임|지출|알림|환율|통계|도움|시세|주가|검색|지도/.test(
      c,
    )
  if (useful) return false
  const best = Math.max(
    bestSeedScore(c, WEATHER_SEEDS),
    bestSeedScore(c, TIME_SEEDS),
    bestSeedScore(c, BRIEF_SEEDS),
    bestSeedScore(c, LOC_SEEDS),
    bestSeedScore(c, HELP_SEEDS),
  )
  // Only short nonsense without command seeds counts as STT garbage
  return best < 0.35 && c.length >= 4 && c.length <= 16
}
