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
  /** Always Korean for lock-until-stop mode */
  langA: string
  /** Target foreign language */
  langB: string
  /** Mic language — locked to Korean in one-way mode */
  listening: string
  live: boolean
  /** If true: only Korean → langB until stop (ignore other intents) */
  lockUntilStop: boolean
}

const MODE_KEY = 'jarvis_interpret_mode_v3'

const defaultMode: InterpretMode = {
  active: false,
  langA: 'ko',
  langB: 'en',
  listening: 'ko',
  live: false,
  lockUntilStop: false,
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
    }
  } catch {
    return { ...defaultMode }
  }
}

export function saveInterpretMode(mode: InterpretMode): void {
  localStorage.setItem(MODE_KEY, JSON.stringify(mode))
}

export function clearInterpretMode(): void {
  saveInterpretMode({ ...defaultMode })
}

export function wantsTranslate(text: string): boolean {
  return /번역|통역|translate|interpre|스톱|stop/i.test(text) || loadInterpretMode().active
}

function isStopCommand(text: string): boolean {
  const t = text.trim()
  if (/^(스톱|스탑|stop|그만|종료|멈춰|끝)$/i.test(t)) return true
  if (/^(통역|번역)\s*(종료|끄기|끄|중지|멈춰|끝)/i.test(t)) return true
  if (/^(그만|이제)\s*(해|그만|멈춰|끝내)/i.test(t)) return true
  if (/번역\s*(그만|종료|중지)|통역\s*(그만|종료|중지)/i.test(t) && t.length < 20) return true
  return false
}

/** Find any supported language mentioned in the utterance */
function findLangInText(text: string): ReturnType<typeof findLang> {
  // Prefer explicit "X어/語로" patterns first
  const asTarget =
    text.match(/([가-힣A-Za-z\-]+어)\s*(?:로|으로)/) ||
    text.match(/([가-힣A-Za-z\-]+)\s*(?:로|으로)\s*(?:번역|통역|말해|바꿔)/) ||
    text.match(/(?:번역|통역)\s*(?:을|를|은|는)?\s*([가-힣A-Za-z\-]+)/)
  if (asTarget?.[1]) {
    const hit = findLang(asTarget[1])
    if (hit) return hit
  }
  // Scan known language names inside the sentence
  const ordered = [
    '베트남어',
    '인도네시아어',
    '포르투갈어',
    '이탈리아어',
    '스페인어',
    '프랑스어',
    '러시아어',
    '일본어',
    '중국어',
    '독일어',
    '영어',
    '태국어',
    '아랍어',
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

/**
 * Split "명령 + 번역할 문장".
 * e.g. "내 말을 베트남어로 번역해 줘 나는 이미 식사를 했어요"
 *   → lang=vi, payload="나는 이미 식사를 했어요", sticky=false
 * e.g. "지금부터 스톱할 때까지 베트남어로 번역해줘"
 *   → lang=vi, payload="", sticky=true
 */
function parseTranslateUtterance(text: string): {
  lang: ReturnType<typeof findLang>
  payload: string
  sticky: boolean
  matched: boolean
} {
  const t = text.trim()
  const lang = findLangInText(t)
  const sticky =
    /지금부터|이제부터|계속|앞으로|끝날\s*때까지|스톱|스탑|stop|그만\s*할|그만하|할\s*때까지|음성\s*인식\s*포함|내\s*말(?:을|를)?|만\s*번역|번역\s*만|통역\s*만|계속\s*번역|락|잠금/i.test(
      t,
    ) || /모드|시작|켜\s*줘|켜줘|켜/.test(t)

  // Strip command prefix; keep trailing sentence as payload
  const patterns: RegExp[] = [
    /^(?:지금부터|이제부터)?\s*(?:스톱|스탑|stop|그만(?:하|할)?(?:라고)?(?:\s*할)?(?:\s*때)?까지)?\s*(?:내가\s*(?:하는\s*)?말|내\s*말(?:을|를)?|음성(?:\s*인식)?(?:\s*포함)?|모든\s*말)?\s*[가-힣A-Za-z\-]+어?\s*(?:로|으로)\s*(?:만\s*)?(?:번역|통역)(?:\s*해(?:\s*줘|주세요|줄래|줘요)?|\s*만)?\s*/i,
    /^(?:내\s*말(?:을|를)?|이것을|이거(?:를|을)?|다음(?:을|을)?)\s*[가-힣A-Za-z\-]+어?\s*(?:로|으로)\s*(?:번역|통역)(?:\s*해(?:\s*줘|주세요|줄래|줘요)?)?\s*/i,
    /^[가-힣A-Za-z\-]+어?\s*(?:로|으로)\s*(?:만\s*)?(?:번역|통역)(?:\s*해(?:\s*줘|주세요|줄래|줘요)?|\s*만)?\s*/i,
    /^(?:실시간\s*)?(?:번역|통역)\s*모드\s*[가-힣A-Za-z\-]*\s*/i,
    /^[가-힣A-Za-z\-]+어?\s*(?:번역|통역)\s*모드\s*/i,
    /^(?:번역|통역)(?:\s*해(?:\s*줘|주세요)?)?\s*[::：]?\s*/i,
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

  // Also treat any 번역/통역 + language as matched
  if (!matched && lang && /번역|통역|translate/i.test(t)) matched = true

  // Drop leftover particles like lone "줘"
  payload = payload.replace(/^(?:줘|주세요|좀|요)\s+/i, '').trim()

  // If payload is still basically the whole command, clear it
  if (payload && /번역|통역|모드|스톱|지금부터/i.test(payload) && payload.length < 24) {
    payload = ''
  }

  return { lang, payload, sticky: sticky || (!payload && matched), matched }
}

function startLockMode(langCode: string, langName: string): BrainReply {
  const next: InterpretMode = {
    active: true,
    langA: 'ko',
    langB: langCode === 'ko' ? 'en' : langCode,
    listening: 'ko',
    live: true,
    lockUntilStop: true,
  }
  saveInterpretMode(next)
  return {
    text: [
      `번역 잠금 ON → ${langName}`,
      `지금부터 한국말로 하는 모든 말(MIC 포함)을 ${langName}로만 번역합니다.`,
      `다른 기능은 잠시 무시됩니다.`,
      `끝내려면 「스톱」 또는 「그만」이라고 말하세요.`,
    ].join('\n'),
    speak: true,
    speakLang: 'ko-KR',
    listenLang: 'ko-KR',
  }
}

async function translateLocked(text: string, mode: InterpretMode): Promise<BrainReply> {
  if (isStopCommand(text)) {
    clearInterpretMode()
    return {
      text: `번역을 종료했습니다. 다시 쓰려면 「베트남어로 번역해줘」처럼 말씀하세요.`,
      speak: true,
      speakLang: 'ko-KR',
      listenLang: 'ko-KR',
    }
  }

  // Always Korean → target in lock mode
  const from = 'ko'
  const to = mode.langB
  const result = await translateText(text, from, to)
  if (!result.ok) {
    return {
      text: [
        `【${langLabel(to)} 번역】`,
        `입력: ${text}`,
        `아직 사전/네트워크에서 못 찾았습니다.`,
        result.error || '',
        `끝: 「스톱」`,
      ]
        .filter(Boolean)
        .join('\n'),
      speak: true,
      speakLang: 'ko-KR',
      listenLang: 'ko-KR',
    }
  }

  return {
    text: [
      `【${langLabel(to)}${result.offline ? '·오프라인' : ''}】`,
      result.text,
      `— 계속 말하세요 · 끝: 「스톱」`,
    ].join('\n'),
    speak: true,
    speakLang: bcp47(to),
    listenLang: 'ko-KR',
  }
}

export async function handleTranslate(text: string): Promise<BrainReply | null> {
  const t = text.trim()
  if (!t) return null
  const mode = loadInterpretMode()

  // While locked: ONLY translate (or stop). Never fall through.
  if (mode.active && mode.live) {
    return translateLocked(t, mode)
  }

  if (/통역\s*도움말|번역\s*도움말|언어\s*목록|지원\s*언어/.test(t)) {
    return {
      text: [
        '【번역 잠금 — 스톱할 때까지】',
        '• 「지금부터 스톱할 때까지 베트남어로 번역해줘」',
        '• 「내 말을 영어로 번역해줘」',
        '• 「일본어로만 번역」',
        '• 잠금 중에는 한국말 → 해당 언어만 번역합니다',
        '• 끝: 「스톱」 / 「그만」 / 「통역 종료」',
        '• 한 문장: 「베트남어로 번역해 나는 이미 식사했어요」',
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

  // Start lock mode (with optional first sentence in same utterance)
  if (parsed.matched && parsed.lang && (parsed.sticky || !parsed.payload)) {
    const start = startLockMode(parsed.lang.code, parsed.lang.name)
    if (parsed.payload && parsed.payload.length >= 2) {
      const first = await translateText(parsed.payload, 'ko', parsed.lang.code)
      if (first.ok) {
        return {
          text: [
            start.text,
            '',
            `【첫 문장 → ${parsed.lang.name}】`,
            first.text,
          ].join('\n'),
          speak: true,
          speakLang: bcp47(parsed.lang.code),
          listenLang: 'ko-KR',
        }
      }
    }
    return start
  }

  // One-shot: has language + payload, not sticky
  if (parsed.matched && parsed.lang && parsed.payload) {
    const from = detectLangCode(parsed.payload)
    const to = parsed.lang.code
    const result = await translateText(
      parsed.payload,
      from === to ? 'ko' : from,
      to,
    )
    if (!result.ok) {
      // Still offer to lock mode so next lines work
      const start = startLockMode(to, parsed.lang.name)
      return {
        text: [
          result.error || '번역 실패',
          '',
          start.text,
        ].join('\n'),
        speak: true,
        listenLang: 'ko-KR',
      }
    }
    // Auto-enable lock so continuous speech keeps translating (user expectation)
    saveInterpretMode({
      active: true,
      langA: 'ko',
      langB: to === 'ko' ? 'en' : to,
      listening: 'ko',
      live: true,
      lockUntilStop: true,
    })
    return {
      text: [
        `【${parsed.lang.name}${result.offline ? '·오프라인' : ''}】`,
        result.text,
        '',
        `이어서 말하면 계속 ${parsed.lang.name}로 번역합니다. 끝: 「스톱」`,
      ].join('\n'),
      speak: true,
      speakLang: bcp47(to),
      listenLang: 'ko-KR',
    }
  }

  // "Hello를 한국어로 번역" foreign → Korean one-shot
  const rev = t.match(/^(.+?)(?:를|을)\s*([가-힣A-Za-z\-]+)\s*(?:로|으로)\s*(?:번역|통역)/i)
  if (rev) {
    const payload = rev[1].trim()
    const toLang = findLang(rev[2])
    // Skip if payload looks like "내 말" — handled above
    if (toLang && payload && !/^내\s*말$/.test(payload) && payload.length > 1) {
      const from = detectLangCode(payload)
      const result = await translateText(payload, from, toLang.code)
      if (result.ok) {
        return {
          text: `【${toLang.name}】\n${result.text}`,
          speak: true,
          speakLang: bcp47(toLang.code),
        }
      }
    }
  }

  if (/번역|통역/.test(t)) {
    return {
      text:
        '예: 「지금부터 스톱할 때까지 베트남어로 번역해줘」\n' +
        '또는 「베트남어로 번역해 나는 이미 식사했어요」\n' +
        '「통역 도움말」',
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
