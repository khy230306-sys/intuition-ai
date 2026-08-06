import {
  detectLangCode,
  findLang,
  langLabel,
  listLanguagesHelp,
  translateText,
  bcp47,
} from './translate'
import type { BrainReply } from './types'

export interface InterpretMode {
  active: boolean
  /** Source language for lock (usually Korean) */
  langA: string
  /** Target foreign language */
  langB: string
  /** Mic language — locked to Korean in one-way mode */
  listening: string
  live: boolean
  /** If true: continuous translation until stop */
  lockUntilStop: boolean
  /** Show original alongside translation (UI hint) */
  showOriginal?: boolean
  updatedAt?: string
}

const MODE_KEY = 'jarvis_interpret_mode_v3'

const defaultMode: InterpretMode = {
  active: false,
  langA: 'ko',
  langB: 'en',
  listening: 'ko',
  live: false,
  lockUntilStop: false,
  showOriginal: true,
}

export function loadInterpretMode(): InterpretMode {
  try {
    const raw = localStorage.getItem(MODE_KEY) || localStorage.getItem('jarvis_interpret_mode_v2')
    if (!raw) return { ...defaultMode }
    const parsed = JSON.parse(raw) as Partial<InterpretMode>
    return {
      ...defaultMode,
      ...parsed,
      lockUntilStop: parsed.lockUntilStop ?? !!parsed.active,
      showOriginal: parsed.showOriginal !== false,
    }
  } catch {
    return { ...defaultMode }
  }
}

export function saveInterpretMode(mode: InterpretMode): void {
  localStorage.setItem(
    MODE_KEY,
    JSON.stringify({ ...mode, updatedAt: new Date().toISOString() }),
  )
}

export function clearInterpretMode(): void {
  saveInterpretMode({ ...defaultMode })
}

export function wantsTranslate(text: string): boolean {
  return (
    /번역|통역|translate|interpre|스톱|stop|바꿔\s*줘|바꿔줘|일반\s*대화/i.test(text) ||
    loadInterpretMode().active
  )
}

/** Clear AIZIO action commands that escape continuous translate lock. */
export function isTranslateEscapeCommand(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  // Never escape when the user is asking to translate (including weather-related content).
  if (/번역|통역|translate/i.test(t)) return false
  // Weather escape only for clear weather *queries*, not narrative sentences.
  if (/날씨\s*(?:알려|어때)|오늘\s*날씨\s*(?:알려|어때)|비\s*(?:와|올까)\s*\??$/i.test(t) && !/좋|같/i.test(t)) {
    return true
  }
  return /(?:으로\s*)?안내해\s*줘|길\s*안내|내비(?:게이션)?|네비|알림\s*(?:설정|해|등록)|일정\s*(?:추가|등록|잡아)|음악\s*(?:틀|재생|켜)|전화해|브리핑|로또|주사위|동전/i.test(
    t,
  )
}

function isStopCommand(text: string): boolean {
  const t = text.trim()
  if (/^(스톱|스탑|stop|그만|종료|멈춰|끝)$/i.test(t)) return true
  if (/^(통역|번역)\s*(종료|끄기|끄|중지|멈춰|끝|그만)/i.test(t)) return true
  if (/번역\s*잠금\s*(꺼|끄|해제|종료)/i.test(t)) return true
  if (/이제\s*번역\s*하지\s*마|번역하지\s*마/i.test(t)) return true
  if (/일반\s*대화로\s*돌아|한국어로\s*그냥\s*대화|이제\s*한국어로\s*대화/i.test(t)) return true
  if (/^(그만|이제)\s*(해|그만|멈춰|끝내)/i.test(t)) return true
  if (/번역\s*(그만|종료|중지)|통역\s*(그만|종료|중지)/i.test(t) && t.length < 28) return true
  return false
}

function isLanguageSwitchCommand(text: string): boolean {
  const t = text.trim()
  if (/바꿔\s*줘|바꿔줘|변경해|로\s*바꿔|로\s*해\s*줘|로\s*해줘/i.test(t)) return true
  if (/^다시\s*.+(?:어|말)\s*(?:로|으로)\s*$/i.test(t)) return true
  if (/^(?:이제|앞으로)?\s*.+(?:어|말)\s*(?:로|으로)\s*(?:해|하자)?\s*$/i.test(t) && t.length < 24)
    return true
  return false
}

/** Find any supported language mentioned in the utterance */
export function findLangInText(text: string): ReturnType<typeof findLang> {
  const asTarget =
    text.match(/([가-힣A-Za-z\-]+(?:어|말))\s*(?:로|으로)/) ||
    text.match(/([가-힣A-Za-z\-]+)\s*(?:로|으로)\s*(?:번역|통역|말해|바꿔|해)/) ||
    text.match(/(?:번역|통역)\s*(?:을|를|은|는|하기)?\s*([가-힣A-Za-z\-]+(?:어|말)?)/) ||
    text.match(/([가-힣A-Za-z\-]+(?:어|말))\s*(?:번역|통역)/)
  if (asTarget?.[1]) {
    const hit = findLang(asTarget[1])
    if (hit) return hit
  }
  const ordered = [
    '베트남말',
    '베트남어',
    '인도네시아말',
    '인도네시아어',
    '포르투갈어',
    '이탈리아어',
    '스페인말',
    '스페인어',
    '프랑스말',
    '프랑스어',
    '러시아말',
    '러시아어',
    '일본말',
    '일본어',
    '중국말',
    '중국어',
    '독일말',
    '독일어',
    '미국말',
    '영문',
    '영어',
    '태국말',
    '태국어',
    '아랍어',
    '한국말',
    '한국어',
    'vietnamese',
    'english',
    'japanese',
    'chinese',
    'spanish',
    'french',
    'german',
  ]
  const lower = text.toLowerCase()
  for (const name of ordered) {
    if (lower.includes(name.toLowerCase())) {
      const hit = findLang(name)
      if (hit) return hit
    }
  }
  return null
}

function hasContinuousCue(text: string): boolean {
  return /지금부터|이제부터|계속|앞으로|끝날\s*때까지|스톱할\s*때까지|할\s*때까지|음성\s*인식\s*포함|내\s*말(?:을|를)?|내가\s*말하는|모든\s*말|만\s*번역|번역\s*만|통역\s*만|계속\s*번역|락|잠금|모드|시작|켜\s*줘|켜줘|번역하기|통역하기|통역해\s*줘|통역해줘/i.test(
    text,
  )
}

/**
 * Split command + optional payload.
 * Continuous: "지금부터 베트남어로 번역해줘", "베트남말 번역하기"
 * One-shot: "안녕하세요를 베트남어로 번역해줘"
 */
export function parseTranslateUtterance(text: string): {
  lang: ReturnType<typeof findLang>
  payload: string
  sticky: boolean
  matched: boolean
  oneShot: boolean
} {
  const t = text.trim()
  const lang = findLangInText(t)

  // Explicit one-shot: 「문장」을/를 언어로 번역
  const oneShot =
    /^['"「『].+?['"」』]\s*(?:을|를)?\s*.+?(?:로|으로)\s*(?:번역|통역)/i.test(t) ||
    (/^.+?(?:을|를)\s*.+?(?:로|으로)\s*(?:번역|통역)/i.test(t) &&
      !hasContinuousCue(t) &&
      !/^(?:내\s*말|내가\s*말)/i.test(t))

  let sticky = hasContinuousCue(t)
  // Colloquial "베트남말 번역하기" → continuous by default
  if (!sticky && !oneShot && lang && /(?:번역|통역)\s*하기|(?:번역|통역)하기/i.test(t) && t.length < 28) {
    sticky = true
  }

  const patterns: RegExp[] = [
    /^(?:지금부터|이제부터|앞으로|계속)?\s*(?:스톱|스탑|stop|그만(?:하|할)?(?:라고)?(?:\s*할)?(?:\s*때)?까지)?\s*(?:내가\s*(?:하는|말하는)\s*말|내\s*말(?:을|를)?|음성(?:\s*인식)?(?:\s*포함)?|모든\s*말)?\s*[가-힣A-Za-z\-]+(?:어|말)?\s*(?:로|으로)\s*(?:만\s*)?(?:번역|통역)(?:\s*해(?:\s*줘|주세요|줄래|줘요)?|\s*만|\s*하기)?\s*/i,
    /^(?:내\s*말(?:을|를)?|이것을|이거(?:를|을)?|다음(?:을|을)?)\s*[가-힣A-Za-z\-]+(?:어|말)?\s*(?:로|으로)\s*(?:번역|통역)(?:\s*해(?:\s*줘|주세요|줄래|줘요)?|\s*하기)?\s*/i,
    /^[가-힣A-Za-z\-]+(?:어|말)?\s*(?:로|으로)\s*(?:만\s*)?(?:번역|통역)(?:\s*해(?:\s*줘|주세요|줄래|줘요)?|\s*만|\s*하기)?\s*/i,
    /^[가-힣A-Za-z\-]+(?:어|말)?\s*(?:번역|통역)(?:\s*하기|\s*시작|\s*모드)?\s*/i,
    /^(?:실시간\s*)?(?:번역|통역)\s*(?:모드|시작|하기)\s*[가-힣A-Za-z\-]*\s*/i,
    /^(?:번역|통역)(?:\s*해(?:\s*줘|주세요)?|\s*하기)?\s*[::：]?\s*/i,
  ]

  let payload = t
  let matched = false
  for (const re of patterns) {
    if (re.test(payload)) {
      payload = payload.replace(re, '').trim()
      matched = true
      break
    }
  }

  if (oneShot) {
    const m =
      t.match(/^['"「『](.+?)['"」』]\s*(?:을|를)?\s*(.+?)(?:로|으로)\s*(?:번역|통역)/i) ||
      t.match(/^(.+?)(?:을|를)\s*(.+?)(?:로|으로)\s*(?:번역|통역)/i)
    if (m) {
      payload = m[1].trim()
      matched = true
      sticky = false
    }
  }

  if (!matched && lang && /번역|통역|translate/i.test(t)) matched = true

  payload = payload.replace(/^(?:줘|주세요|좀|요)\s+/i, '').trim()
  if (payload && /번역|통역|모드|스톱|지금부터|바꿔/i.test(payload) && payload.length < 28) {
    payload = ''
  }

  // Continuous when matched command with no payload
  if (!oneShot && matched && !payload) sticky = true

  return { lang, payload, sticky, matched, oneShot }
}

function startLockMode(langCode: string, langName: string): BrainReply {
  const next: InterpretMode = {
    active: true,
    langA: 'ko',
    langB: langCode === 'ko' ? 'en' : langCode,
    listening: 'ko',
    live: true,
    lockUntilStop: true,
    showOriginal: true,
    updatedAt: new Date().toISOString(),
  }
  saveInterpretMode(next)
  return {
    text: `${langName} 번역을 시작할게요. 이제 보내는 문장을 ${langName}로 번역합니다.`,
    speak: true,
    speakLang: 'ko-KR',
    listenLang: 'ko-KR',
  }
}

function switchLockLanguage(langCode: string, langName: string): BrainReply {
  const prev = loadInterpretMode()
  const next: InterpretMode = {
    ...prev,
    active: true,
    langB: langCode === 'ko' ? 'en' : langCode,
    live: true,
    lockUntilStop: true,
    updatedAt: new Date().toISOString(),
  }
  saveInterpretMode(next)
  return {
    text: `이제 ${langName}로 번역할게요.`,
    speak: true,
    speakLang: 'ko-KR',
    listenLang: 'ko-KR',
  }
}

async function translateLocked(text: string, mode: InterpretMode): Promise<BrainReply | null> {
  if (isStopCommand(text)) {
    clearInterpretMode()
    return {
      text: '번역 모드를 종료했어요.',
      speak: true,
      speakLang: 'ko-KR',
      listenLang: 'ko-KR',
    }
  }

  if (isLanguageSwitchCommand(text) || (/바꿔|변경/i.test(text) && findLangInText(text))) {
    const lang = findLangInText(text)
    if (lang) return switchLockLanguage(lang.code, lang.name)
  }

  // Escape clear app commands — let brain handle navigation etc.
  if (isTranslateEscapeCommand(text)) {
    return null
  }

  const from = mode.langA || 'ko'
  const to = mode.langB
  const result = await translateText(text, from, to)
  if (!result.ok) {
    return {
      text: [
        `원문`,
        text,
        '',
        `${langLabel(to)} 번역에 실패했습니다.`,
        result.error || '네트워크 또는 번역 서비스를 확인해 주세요.',
        `끝: 「번역 그만」`,
      ].join('\n'),
      speak: true,
      speakLang: 'ko-KR',
      listenLang: 'ko-KR',
    }
  }

  const showOrig = mode.showOriginal !== false
  return {
    text: showOrig
      ? [`원문`, text, '', langLabel(to), result.text].join('\n')
      : [`【${langLabel(to)}${result.offline ? '·오프라인' : ''}】`, result.text].join('\n'),
    speak: true,
    speakLang: bcp47(to),
    listenLang: 'ko-KR',
  }
}

export async function handleTranslate(text: string): Promise<BrainReply | null> {
  const t = text.trim()
  if (!t) return null
  const mode = loadInterpretMode()

  // While locked: control commands + translate (or escape)
  if (mode.active && mode.live) {
    if (isTranslateEscapeCommand(t) && !isStopCommand(t) && !isLanguageSwitchCommand(t)) {
      return null
    }
    return translateLocked(t, mode)
  }

  if (/통역\s*도움말|번역\s*도움말|언어\s*목록|지원\s*언어/.test(t)) {
    return {
      text: [
        '【연속 번역】',
        '• 「지금부터 베트남어로 번역해줘」 / 「베트남말 번역하기」',
        '• 잠금 중 문장 → 목표 언어로 번역',
        '• 「영어로 바꿔줘」 → 목표 언어 변경',
        '• 「번역 그만」 → 종료',
        '• 한 문장: 「안녕하세요를 베트남어로 번역해줘」',
        '',
        `지원: ${listLanguagesHelp()}`,
      ].join('\n'),
      speak: true,
    }
  }

  if (isStopCommand(t)) {
    clearInterpretMode()
    return {
      text: '번역 모드가 꺼져 있습니다.',
      speak: true,
      listenLang: 'ko-KR',
    }
  }

  const parsed = parseTranslateUtterance(t)

  // Ambiguous short: "베트남어 번역" without 하기/시작/지금부터
  if (
    parsed.lang &&
    /^(?:[가-힣A-Za-z\-]+(?:어|말)\s*)?(?:번역|통역)$/i.test(t.replace(/\s+/g, ' ').trim()) &&
    !parsed.sticky
  ) {
    const name = parsed.lang.name
    return {
      text: [
        `${name} 번역을 어떻게 할까요?`,
        `• 「계속 번역」또는 「${name} 번역하기」→ 연속 번역`,
        `• 「문장을 ${name}로 번역해줘」→ 한 문장`,
        `• 취소하려면 다른 말을 하세요`,
      ].join('\n'),
      speak: true,
      listenLang: 'ko-KR',
    }
  }

  // Continuous enable
  if (parsed.matched && parsed.lang && parsed.sticky && !parsed.oneShot) {
    const start = startLockMode(parsed.lang.code, parsed.lang.name)
    if (parsed.payload && parsed.payload.length >= 2) {
      const first = await translateText(parsed.payload, 'ko', parsed.lang.code)
      if (first.ok) {
        return {
          text: [start.text, '', '원문', parsed.payload, '', parsed.lang.name, first.text].join('\n'),
          speak: true,
          speakLang: bcp47(parsed.lang.code),
          listenLang: 'ko-KR',
        }
      }
    }
    return start
  }

  // One-shot only — do NOT enable continuous lock
  if (parsed.matched && parsed.lang && parsed.payload && (parsed.oneShot || !parsed.sticky)) {
    const from = detectLangCode(parsed.payload)
    const to = parsed.lang.code
    const result = await translateText(parsed.payload, from === to ? 'ko' : from, to)
    if (!result.ok) {
      return {
        text: result.error || '번역에 실패했습니다. 네트워크를 확인해 주세요.',
        speak: true,
        listenLang: 'ko-KR',
      }
    }
    return {
      text: ['원문', parsed.payload, '', parsed.lang.name, result.text].join('\n'),
      speak: true,
      speakLang: bcp47(to),
      listenLang: 'ko-KR',
    }
  }

  // Continuous enable: matched lang, no payload
  if (parsed.matched && parsed.lang && !parsed.payload) {
    return startLockMode(parsed.lang.code, parsed.lang.name)
  }

  // Reverse foreign → Korean one-shot (no lock)
  const rev = t.match(/^(.+?)(?:를|을)\s*([가-힣A-Za-z\-]+(?:어|말)?)\s*(?:로|으로)\s*(?:번역|통역)/i)
  if (rev) {
    const payload = rev[1].trim()
    const toLang = findLang(rev[2])
    if (toLang && payload && !/^내\s*말$/.test(payload) && payload.length > 1) {
      const from = detectLangCode(payload)
      const result = await translateText(payload, from, toLang.code)
      if (result.ok) {
        return {
          text: ['원문', payload, '', toLang.name, result.text].join('\n'),
          speak: true,
          speakLang: bcp47(toLang.code),
        }
      }
    }
  }

  if (/번역|통역/.test(t)) {
    return {
      text:
        '예: 「지금부터 베트남어로 번역해줘」또는 「베트남말 번역하기」\n' +
        '한 문장: 「안녕하세요를 영어로 번역해줘」\n' +
        '「번역 도움말」',
      speak: true,
    }
  }

  return null
}

/** BCP-47 locale for SpeechRecognition while interpret mode is on */
export function currentListenLang(): string | null {
  const mode = loadInterpretMode()
  if (!mode.active) return null
  return bcp47(mode.listening)
}

/** Badge / UI label for HOME v2 */
export function interpretModeBadgeLabel(mode?: InterpretMode): string {
  const m = mode || loadInterpretMode()
  if (!m.active) return '번역 잠금 꺼짐'
  const target = langLabel(m.langB) || m.langB.toUpperCase()
  return `번역 잠금 켜짐 · 자동 감지 → ${target}`
}
