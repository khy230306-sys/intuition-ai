export type VoiceState = 'idle' | 'listening' | 'processing'

export type VoiceCallbacks = {
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  onState?: (state: VoiceState) => void
  onError?: (message: string) => void
}

type SpeechRecognitionResultLike = {
  0: { transcript: string; confidence?: number }
  isFinal: boolean
  length: number
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike> & { length: number }
}

export type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((ev?: Event) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  onnomatch: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

let recognitionCtorOverride: SpeechRecognitionCtor | null = null

export function __setRecognitionCtorForTests(ctor: SpeechRecognitionCtor | null): void {
  recognitionCtorOverride = ctor
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (recognitionCtorOverride) return recognitionCtorOverride
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function canListen(): boolean {
  if (!getRecognitionCtor()) return false
  // Test override bypasses secure-context (jsdom/node has no HTTPS).
  if (recognitionCtorOverride) return true
  if (typeof window !== 'undefined' && !window.isSecureContext) return false
  return true
}

/** Unlock mic permission on iOS so SpeechRecognition can start reliably. */
export async function ensureMicPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return canListen()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    for (const t of stream.getTracks()) t.stop()
    return true
  } catch {
    return false
  }
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, lang = 'ko-KR'): void {
  void speakAsync(text, lang)
}

export function speakAsync(text: string, lang = 'ko-KR'): Promise<void> {
  if (!canSpeak() || !text.trim()) return Promise.resolve()
  window.speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 1.05
    u.pitch = 1
    u.onend = () => resolve()
    u.onerror = () => resolve()
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u)
      } catch {
        resolve()
      }
    }, 0)
  })
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}

function errorMessage(code: string): string | null {
  switch (code) {
    case 'aborted':
      return null
    case 'no-speech':
      return '음성이 감지되지 않았습니다. 다시 MIC를 눌러 주세요.'
    case 'audio-capture':
      return '마이크를 찾을 수 없습니다.'
    case 'not-allowed':
      return '마이크 권한이 필요합니다. Safari 설정에서 마이크를 허용해 주세요.'
    case 'network':
      return '음성 인식 네트워크 오류입니다. 연결을 확인해 주세요.'
    case 'service-not-allowed':
      return '이 환경에서는 음성 인식 서비스를 사용할 수 없습니다.'
    case 'bad-grammar':
    case 'language-not-supported':
      return '선택한 언어의 음성 인식을 시작할 수 없습니다.'
    default:
      return `음성 인식 오류: ${code}`
  }
}

function compactKo(s: string): string {
  return s.replace(/\s+/g, '')
}

/** Longest suffix of `a` that equals a prefix of `b` (compact strings). */
function longestSuffixPrefixOverlap(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  for (let len = max; len >= 1; len--) {
    if (a.slice(-len) === b.slice(0, len)) return len
  }
  return 0
}

function sharedCharRatio(a: string, b: string): number {
  if (!a || !b) return 0
  const counts = new Map<string, number>()
  for (const ch of a) counts.set(ch, (counts.get(ch) || 0) + 1)
  let shared = 0
  for (const ch of b) {
    const n = counts.get(ch) || 0
    if (n > 0) {
      shared += 1
      counts.set(ch, n - 1)
    }
  }
  return shared / Math.min(a.length, b.length)
}

/**
 * Safari continuous STT often emits progressive *rewrites* as separate finals
 * ("오늘" → "오늘 날씨" → "오늘 날씨 알려줘"). Appending those causes stutter.
 * Merge by replace/keep when hypotheses overlap; append only for a new clause.
 */
export function mergeUtteranceFinals(finals: string[], piece: string): string[] {
  const next = piece.replace(/\s+/g, ' ').trim()
  if (!next) return finals
  if (finals.length === 0) return [next]

  const last = finals[finals.length - 1] ?? ''
  const lastC = compactKo(last)
  const nextC = compactKo(next)
  if (!nextC) return finals
  if (nextC === lastC) return finals
  // Progressive rewrite of the latest final chunk
  if (nextC.startsWith(lastC)) return [...finals.slice(0, -1), next]
  if (lastC.startsWith(nextC)) return finals

  const joined = finals.join(' ').replace(/\s+/g, ' ').trim()
  const joinedC = compactKo(joined)
  if (nextC === joinedC) return finals
  if (nextC.startsWith(joinedC)) return [next]
  if (joinedC.startsWith(nextC)) return finals

  const overlap = longestSuffixPrefixOverlap(joinedC, nextC)
  const minLen = Math.min(joinedC.length, nextC.length)
  if (minLen > 0 && overlap / minLen >= 0.5) {
    return nextC.length >= joinedC.length ? [next] : finals
  }
  if (sharedCharRatio(joinedC, nextC) >= 0.7) {
    return nextC.length >= joinedC.length ? [next] : finals
  }

  return [...finals, next]
}

/**
 * Collapse leftover STT stutter: "오늘 날씨 오늘 날씨 알려줘" → "오늘 날씨 알려줘".
 */
export function collapseStutteredTranscript(text: string): string {
  let s = text.replace(/\s+/g, ' ').trim()
  if (!s) return s

  // Hangul run repeats: 확인확인 → 확인
  s = s.replace(/([\uac00-\ud7a3]{2,24})\1+/g, '$1')

  let tokens = s.split(' ').filter(Boolean)
  for (let win = Math.min(8, Math.floor(tokens.length / 2)); win >= 1; win--) {
    const out: string[] = []
    let i = 0
    while (i < tokens.length) {
      if (i + 2 * win <= tokens.length) {
        const a = tokens.slice(i, i + win).join(' ')
        const b = tokens.slice(i + win, i + 2 * win).join(' ')
        if (a === b) {
          out.push(...tokens.slice(i, i + win))
          i += 2 * win
          while (i + win <= tokens.length && tokens.slice(i, i + win).join(' ') === a) {
            i += win
          }
          continue
        }
      }
      out.push(tokens[i]!)
      i += 1
    }
    tokens = out
  }
  s = tokens.join(' ')

  // Still heavily stuttered (same token 3+ times): prefer the longest clean-ish suffix
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1)
  const maxFreq = tokens.length ? Math.max(...freq.values()) : 0
  if (maxFreq >= 3 && tokens.length > 6) {
    for (let start = 1; start < tokens.length - 1; start++) {
      const slice = tokens.slice(start)
      const f = new Map<string, number>()
      for (const t of slice) f.set(t, (f.get(t) || 0) + 1)
      const mf = Math.max(...f.values())
      if (mf <= 2) return slice.join(' ')
    }
  }
  return s
}

/**
 * Patient voice session for iPhone Safari.
 * Safari often emits "final" chunks mid-sentence — we accumulate and only
 * submit after a real pause (silenceMs), not on the first final.
 */
export class VoiceListener {
  private recognition: SpeechRecognitionLike | null = null
  private wanted = false
  private state: VoiceState = 'idle'
  private callbacks: VoiceCallbacks = {}
  private finals: string[] = []
  private interim = ''
  private restartTimer: number | null = null
  private silenceTimer: number | null = null
  private safetyTimer: number | null = null
  private heardSpeech = false
  private starting = false
  private finishing = false
  /** Ensures onFinal / manual consume delivers at most once per MIC session. */
  private finalDelivered = false
  private sessionId = 0
  private emptyEnds = 0
  private listenLang = 'ko-KR'
  private lastActivityAt = 0

  /** Wait this long after last speech/result before submitting. */
  silenceMs = 2000
  /** Absolute cap for one MIC session. */
  maxListenMs = 90000
  restartDelayMs = 120

  get listening(): boolean {
    return this.state === 'listening' || this.wanted
  }

  get currentState(): VoiceState {
    return this.state
  }

  get transcript(): string {
    return this.compose(this.interim)
  }

  /** True after this session already delivered a final (auto or consumeTranscript). */
  get didDeliverFinal(): boolean {
    return this.finalDelivered
  }

  start(callbacks: VoiceCallbacks, lang = 'ko-KR'): boolean {
    if (!getRecognitionCtor()) {
      callbacks.onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. iPhone Safari를 사용해 주세요.')
      return false
    }
    this.stopInternal(false)
    this.callbacks = callbacks
    this.wanted = true
    this.finishing = false
    this.finalDelivered = false
    this.finals = []
    this.interim = ''
    this.heardSpeech = false
    this.emptyEnds = 0
    this.sessionId += 1
    this.listenLang = lang || 'ko-KR'
    this.lastActivityAt = Date.now()
    stopSpeaking()
    this.setState('listening')
    this.armSafety()
    return this.bootRecognition()
  }

  startLegacy(
    onText: (text: string, final: boolean) => void,
    onError?: (msg: string) => void,
  ): boolean {
    return this.start({
      onInterim: (t) => onText(t, false),
      onFinal: (t) => onText(t, true),
      onError,
    })
  }

  stop(): void {
    // Invalidate in-flight silence/safety finish so it cannot onFinal after STOP.
    this.finalDelivered = true
    this.sessionId += 1
    this.stopInternal(true)
  }

  /**
   * Atomically take the current transcript and stop without calling onFinal.
   * Use for MIC STOP → manual send (prevents silence-timer double send).
   */
  consumeTranscript(): string {
    const raw = this.compose(this.interim).trim()
    const cleaned = collapseStutteredTranscript(raw.replace(/\s+/g, ' ').trim())
    this.finalDelivered = true
    this.sessionId += 1
    this.wanted = false
    this.finishing = true
    this.clearTimers()
    this.abortRecognition()
    this.finals = []
    this.interim = ''
    this.starting = false
    this.finishing = false
    this.setState('idle')
    return cleaned
  }

  private abortRecognition(): void {
    if (!this.recognition) return
    const rec = this.recognition
    this.recognition = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      rec.abort()
    } catch {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
  }

  private stopInternal(notifyIdle: boolean): void {
    this.wanted = false
    this.finishing = true
    this.clearTimers()
    this.abortRecognition()
    this.starting = false
    this.finishing = false
    if (notifyIdle) this.setState('idle')
  }

  private setState(next: VoiceState): void {
    this.state = next
    this.callbacks.onState?.(next)
  }

  private clearTimers(): void {
    if (this.restartTimer != null) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.silenceTimer != null) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    if (this.safetyTimer != null) {
      clearTimeout(this.safetyTimer)
      this.safetyTimer = null
    }
  }

  private armSafety(): void {
    if (this.safetyTimer != null) clearTimeout(this.safetyTimer)
    this.safetyTimer = setTimeout(() => {
      if (!this.wanted) return
      const text = this.compose(this.interim).trim()
      if (text) this.finishWith(text)
      else {
        this.callbacks.onError?.('시간이 초과되었습니다. 다시 MIC를 눌러 주세요.')
        this.stop()
      }
    }, this.maxListenMs) as unknown as number
  }

  private compose(interim: string): string {
    const base = this.finals.join(' ').replace(/\s+/g, ' ').trim()
    if (!interim) return base
    const interimC = compactKo(interim)
    const baseC = compactKo(base)
    // Live rewrite often restates the whole utterance as interim
    if (baseC && interimC && (interimC.startsWith(baseC) || sharedCharRatio(baseC, interimC) >= 0.75)) {
      return interim.replace(/\s+/g, ' ').trim()
    }
    return `${base} ${interim}`.replace(/\s+/g, ' ').trim()
  }

  private markActivity(): void {
    this.lastActivityAt = Date.now()
    this.bumpSilenceWatch()
  }

  private bumpSilenceWatch(): void {
    if (this.silenceTimer != null) clearTimeout(this.silenceTimer)
    if (!this.heardSpeech || this.finishing || !this.wanted) return
    this.silenceTimer = setTimeout(() => {
      if (!this.wanted || this.finishing) return
      // Require a real pause — ignore if activity arrived late
      if (Date.now() - this.lastActivityAt < this.silenceMs - 50) {
        this.bumpSilenceWatch()
        return
      }
      const text = this.compose(this.interim).trim()
      if (text) this.finishWith(text)
    }, this.silenceMs) as unknown as number
  }

  private finishWith(text: string): void {
    if (this.finishing || this.finalDelivered) return
    this.finishing = true
    const sid = this.sessionId
    const cleaned = collapseStutteredTranscript(text.replace(/\s+/g, ' ').trim())
    this.wanted = false
    this.clearTimers()
    this.abortRecognition()
    this.starting = false
    // STOP / consumeTranscript may have invalidated this session mid-flight
    if (this.finalDelivered || this.sessionId !== sid) {
      this.finishing = false
      this.setState('idle')
      return
    }
    this.finalDelivered = true
    this.finals = []
    this.interim = ''
    this.setState('processing')
    if (cleaned) this.callbacks.onFinal?.(cleaned)
    this.setState('idle')
    this.finishing = false
  }

  private bootRecognition(): boolean {
    const Ctor = getRecognitionCtor()
    if (!Ctor || !this.wanted || this.finishing) return false
    if (this.starting) return true
    this.starting = true
    const rec = new Ctor()
    const sid = this.sessionId
    rec.lang = this.listenLang || 'ko-KR'
    // continuous: keep listening across mid-utterance finals on Safari
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => {
      this.starting = false
      if (this.sessionId !== sid || !this.wanted) return
      this.setState('listening')
    }

    rec.onspeechstart = () => {
      this.heardSpeech = true
      this.markActivity()
    }

    rec.onspeechend = () => {
      // Do NOT finish here — Safari fires speechend between clauses.
      // Wait for silenceMs of no new results.
      this.bumpSilenceWatch()
    }

    rec.onresult = (event) => {
      if (this.sessionId !== sid || !this.wanted || this.finishing) return
      let interim = ''
      let gotFinal = false
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result?.[0]?.transcript?.trim()
        if (!piece) continue
        this.heardSpeech = true
        if (result.isFinal) {
          this.finals = mergeUtteranceFinals(this.finals, piece)
          gotFinal = true
        } else {
          interim = piece
        }
      }
      this.interim = gotFinal ? '' : interim
      const live = this.compose(this.interim)
      this.callbacks.onInterim?.(live)
      // Patient mode: never submit on first final — wait for silence
      this.markActivity()
    }

    rec.onerror = (event) => {
      this.starting = false
      if (this.sessionId !== sid || this.finishing) return
      if (event.error === 'aborted') return
      const text = this.compose(this.interim).trim()
      if (text && event.error === 'no-speech') {
        // Keep waiting if we already have text — silence timer will finish
        this.bumpSilenceWatch()
        return
      }
      if (event.error === 'network' && text) {
        // Keep accumulated text; try restarting recognition
        this.scheduleRestart(sid)
        return
      }
      if (event.error === 'no-speech' && !this.heardSpeech) {
        return
      }
      const msg = errorMessage(event.error)
      if (msg) this.callbacks.onError?.(msg)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        this.stop()
      }
    }

    rec.onend = () => {
      this.starting = false
      this.recognition = null
      if (this.sessionId !== sid || this.finishing) return
      if (!this.wanted) return

      const text = this.compose(this.interim).trim()
      // Safari often ends the session mid-sentence — restart while user may still speak
      if (this.heardSpeech || text) {
        this.emptyEnds = 0
        this.scheduleRestart(sid)
        // Silence timer remains armed; will finish after pause
        return
      }

      this.emptyEnds += 1
      if (this.emptyEnds <= 2) {
        this.scheduleRestart(sid)
        return
      }
      this.callbacks.onError?.('음성이 감지되지 않았습니다. 다시 MIC를 눌러 주세요.')
      this.stop()
    }

    this.recognition = rec
    try {
      rec.start()
      return true
    } catch {
      this.starting = false
      this.recognition = null
      this.scheduleRestart(sid)
      return true
    }
  }

  private scheduleRestart(sid: number): void {
    if (this.restartTimer != null) clearTimeout(this.restartTimer)
    this.restartTimer = setTimeout(() => {
      if (!this.wanted || this.sessionId !== sid || this.finishing) return
      this.bootRecognition()
    }, this.restartDelayMs) as unknown as number
  }
}

export function probeVoiceSupport(): {
  recognition: boolean
  speechSynthesis: boolean
  secureContext: boolean
  details: string
} {
  const recognition = canListen()
  const speechSynthesis = canSpeak()
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false
  const details = [
    recognition ? '음성인식: 지원' : '음성인식: 미지원 (Safari 권장)',
    speechSynthesis ? 'TTS: 지원' : 'TTS: 미지원',
    secureContext ? '보안맥락(HTTPS): OK' : '보안맥락: 필요 (HTTPS 또는 localhost)',
    '모드: 여유(말 끊김 방지 · 침묵 후 전송)',
  ].join('\n')
  return { recognition, speechSynthesis, secureContext, details }
}
