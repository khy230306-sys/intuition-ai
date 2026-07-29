import { openTranslate } from './actions'
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
  /** Language pair side A (usually Korean) */
  langA: string
  /** Language pair side B (foreign) */
  langB: string
  /** Which side the mic should recognize */
  listening: string
  live: boolean
}

const MODE_KEY = 'jarvis_interpret_mode_v2'

const defaultMode: InterpretMode = {
  active: false,
  langA: 'ko',
  langB: 'en',
  listening: 'ko',
  live: false,
}

export function loadInterpretMode(): InterpretMode {
  try {
    const raw = localStorage.getItem(MODE_KEY)
    if (!raw) return { ...defaultMode }
    const parsed = JSON.parse(raw) as Partial<InterpretMode> & {
      source?: string
      target?: string
    }
    // migrate v1 shape if present
    if (parsed.langA && parsed.langB) {
      return { ...defaultMode, ...parsed, langA: parsed.langA, langB: parsed.langB }
    }
    if (parsed.source || parsed.target) {
      const langB = parsed.target === 'ko' ? parsed.source || 'en' : parsed.target || 'en'
      const listening = parsed.source === 'auto' ? (langB === 'ko' ? 'en' : langB) : parsed.source || 'ko'
      return {
        active: !!parsed.active,
        langA: 'ko',
        langB: langB === 'ko' ? 'en' : langB,
        listening: listening === 'auto' ? 'ko' : listening,
        live: !!parsed.live || !!parsed.active,
      }
    }
    return { ...defaultMode, ...parsed }
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
  return /번역|통역|translate|interpre/i.test(text) || loadInterpretMode().active
}

function parseTargetLang(text: string): ReturnType<typeof findLang> {
  const m =
    text.match(/(?:를|을)?\s*([가-힣A-Za-z\-]+)\s*(?:로|으로)\s*(?:번역|통역)/i) ||
    text.match(/([가-힣A-Za-z\-]+)\s*(?:번역|통역)\s*모드/i) ||
    text.match(/(?:번역|통역)\s*(?:모드)?\s*([가-힣A-Za-z\-]+)/i) ||
    text.match(/([가-힣A-Za-z\-]+)\s*(?:로|으로)\s*(?:말해|읽어)/i)
  if (m?.[1]) return findLang(m[1])
  const head = text.match(/^([가-힣A-Za-z\-]+)\s*(?:로|으로)\s+(.+)$/i)
  if (head && findLang(head[1])) return findLang(head[1])
  return null
}

function extractPayload(text: string): string {
  return text
    .replace(/^(?:실시간\s*)?(?:번역|통역)\s*(?:모드)?\s*/i, '')
    .replace(/^(?:번역|통역)\s*(?:해|해줘|좀)?\s*[::：]?\s*/i, '')
    .replace(/^(.+?)(?:를|을)?\s*[가-힣A-Za-z\-]+\s*(?:로|으로)\s*(?:번역|통역)(?:해|해줘)?\s*/i, '')
    .replace(/^[가-힣A-Za-z\-]+\s*(?:로|으로)\s*(?:번역|통역)(?:해|해줘)?\s*[::：]?\s*/i, '')
    .replace(/^[가-힣A-Za-z\-]+\s*(?:로|으로)\s+/i, '')
    .replace(/(?:번역|통역)\s*(?:모드)?\s*(?:켜|시작|온|on|종료|끄|off|멈춰|중지).*$/i, '')
    .replace(/^(?:이거|이걸|다음을|문장)\s*/i, '')
    .trim()
}

function otherSide(mode: InterpretMode, code: string): string {
  if (code === mode.langA) return mode.langB
  if (code === mode.langB) return mode.langA
  return mode.langB
}

async function liveTranslate(text: string, mode: InterpretMode): Promise<BrainReply> {
  if (/통역\s*방향\s*(바꾸|전환)|방향\s*바꾸/i.test(text)) {
    const nextListening = otherSide(mode, mode.listening)
    const next = { ...mode, listening: nextListening }
    saveInterpretMode(next)
    return {
      text: `통역 방향을 바꿨습니다.\n이제 ${langLabel(nextListening)}로 말하면 ${langLabel(otherSide(next, nextListening))}로 통역합니다.`,
      speak: true,
      speakLang: 'ko-KR',
      listenLang: bcp47(nextListening),
    }
  }

  const detected = detectLangCode(text)
  let from = mode.listening
  let to = otherSide(mode, mode.listening)

  if (detected === mode.langA || detected === mode.langB) {
    from = detected
    to = otherSide(mode, detected)
  }

  if (from === to) {
    to = from === 'ko' ? mode.langB : 'ko'
  }

  const result = await translateText(text, from, to)
  if (!result.ok) {
    return {
      text: `통역 실패: ${result.error}`,
      speak: true,
      listenLang: bcp47(mode.listening),
    }
  }

  // Keep mic on the language the user just spoke (conversation continuity)
  const next = { ...mode, listening: from }
  saveInterpretMode(next)

  return {
    text: [
      `【실시간 통역】 ${langLabel(result.from)} → ${langLabel(result.to)}`,
      `입력: ${text}`,
      `번역: ${result.text}`,
      '· 「통역 방향 바꾸기」 · 「통역 종료」',
    ].join('\n'),
    speak: true,
    speakLang: bcp47(to),
    listenLang: bcp47(from),
  }
}

export async function handleTranslate(text: string): Promise<BrainReply | null> {
  const t = text.trim()
  const mode = loadInterpretMode()

  if (/통역\s*도움말|번역\s*도움말|언어\s*목록|지원\s*언어/.test(t)) {
    return {
      text: [
        '【실시간 통역 — 전 세계 언어】',
        '• 영어 통역 모드 / 일본어 통역 모드 / 스페인어 통역 모드',
        '• MIC로 말하면 바로 번역하고 해당 언어로 읽어 줍니다',
        '• 통역 방향 바꾸기 · 통역 종료',
        '• 영어로 번역해 안녕하세요',
        '• Hello를 한국어로 번역',
        '',
        `지원: ${listLanguagesHelp()}`,
      ].join('\n'),
      speak: true,
    }
  }

  if (/통역\s*(?:종료|끄|off|중지|멈춰)|번역\s*모드\s*(?:종료|끄)/i.test(t)) {
    clearInterpretMode()
    return {
      text: '통역 모드를 종료했습니다. MIC 언어는 한국어로 돌아갑니다.',
      speak: true,
      speakLang: 'ko-KR',
      listenLang: 'ko-KR',
    }
  }

  // Start live interpret mode (before one-shot, so "영어 통역 모드" wins)
  if (
    /(?:실시간\s*)?(?:통역|번역)\s*모드|(?:통역|번역)\s*(?:시작|켜|on)/i.test(t) ||
    /[가-힣A-Za-z]+\s*통역\s*모드/.test(t) ||
    (/통역/.test(t) && /모드|시작|켜/.test(t))
  ) {
    const target = parseTargetLang(t) || findLang('영어')
    if (!target) {
      return { text: '목표 언어를 인식하지 못했습니다. 예: 영어 통역 모드' }
    }

    let langA = 'ko'
    let langB = target.code === 'ko' ? 'en' : target.code
    let listening = 'ko'

    // Traveler: listen to foreign speech → Korean
    if (/외국어|듣고|듣기|상대|상대방/.test(t) || (target.code === 'ko' && /영어|일본|중국/.test(t))) {
      listening = langB
    }
    // Explicit "영어로 말해" / Korean → foreign (default for "영어 통역 모드")
    if (/로\s*말해|로\s*번역|한국.*(영어|일본|중국)|내가\s*말/.test(t)) {
      listening = 'ko'
    }
    if (target.code === 'ko') {
      langB = 'en'
      listening = 'en'
    }

    const next: InterpretMode = {
      active: true,
      langA,
      langB,
      listening,
      live: true,
    }
    saveInterpretMode(next)
    return {
      text: [
        '실시간 통역 ON',
        `${langLabel(langA)} ↔ ${langLabel(langB)}`,
        `MIC: ${langLabel(listening)} → 출력: ${langLabel(otherSide(next, listening))}`,
        '상대 언어로 말해도 자동으로 반대쪽 언어로 통역합니다.',
        '· 「통역 방향 바꾸기」 · 「통역 종료」 · 「통역 도움말」',
      ].join('\n'),
      speak: true,
      speakLang: 'ko-KR',
      listenLang: bcp47(listening),
    }
  }

  // One-shot: "Hello를 한국어로 번역"
  const rev = t.match(/^(.+?)(?:를|을)\s*([가-힣A-Za-z\-]+)\s*(?:로|으로)\s*(?:번역|통역)/i)
  if (rev) {
    const payload = rev[1].trim()
    const toLang = findLang(rev[2])
    if (toLang && payload) {
      const from = detectLangCode(payload)
      const result = await translateText(payload, from, toLang.code)
      if (!result.ok) return { text: result.error || '번역 실패', speak: true }
      return {
        text: `【통역】 ${langLabel(from)} → ${toLang.name}\n원문: ${payload}\n번역: ${result.text}`,
        speak: true,
        speakLang: bcp47(toLang.code),
      }
    }
  }

  const target = parseTargetLang(t)
  let payload = extractPayload(t)

  if (target && (payload || /번역|통역/.test(t)) && !mode.active) {
    if (!payload || payload === t) {
      // "일본어로 번역해 안녕하세요" style already extracted; if empty ask
      if (!payload) {
        return {
          text: `${target.name}로 번역할 문장을 이어서 말해 주세요.\n예: ${target.name}로 번역해 안녕하세요`,
          speak: true,
        }
      }
    }
    if (payload) {
      const from = detectLangCode(payload)
      const to = target.code
      const result = await translateText(payload, from === to ? (to === 'ko' ? 'en' : 'ko') : from, to)
      if (!result.ok) {
        return {
          text: `${result.error}\nGoogle 번역을 엽니다.`,
          action: () => openTranslate(payload, to.startsWith('zh') ? 'zh-CN' : to),
        }
      }
      return {
        text: `【통역】 ${langLabel(result.from)} → ${target.name}\n원문: ${payload}\n번역: ${result.text}`,
        speak: true,
        speakLang: bcp47(to),
      }
    }
  }

  // Live mode: every utterance
  if (mode.active && mode.live) {
    if (/통역|번역\s*모드|도움말/.test(t) && t.length < 24) {
      // fall through only for short mode-ish phrases that weren't caught
    } else {
      return liveTranslate(t, mode)
    }
  }

  if (target && payload && mode.active) {
    const from = detectLangCode(payload)
    const result = await translateText(payload, from, target.code)
    if (result.ok) {
      return {
        text: `【통역】 ${langLabel(result.from)} → ${target.name}\n원문: ${payload}\n번역: ${result.text}`,
        speak: true,
        speakLang: bcp47(target.code),
        listenLang: bcp47(mode.listening),
      }
    }
  }

  if (/번역|통역/.test(t)) {
    return {
      text: '예: "영어 통역 모드" · "일본어로 번역해 안녕하세요" · "통역 도움말"',
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
