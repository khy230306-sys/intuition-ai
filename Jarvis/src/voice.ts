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

/** Exported for tests — inject a fake constructor. */
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
  return Boolean(getRecognitionCtor())
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
    u.rate = 1.02
    u.pitch = 1
    u.onend = () => resolve()
    u.onerror = () => resolve()
    // iOS sometimes needs a tick after cancel
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u)
      } catch {
        resolve()
      }
    }, 40)
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
      return '음성이 감지되지 않았습니다. 다시 MIC를 눌러 말씀해 주세요.'
    case 'audio-capture':
      return '마이크를 찾을 수 없습니다. 권한과 연결을 확인해 주세요.'
    case 'not-allowed':
      return '마이크 권한이 필요합니다. Safari 설정 → 웹사이트 → 마이크를 허용해 주세요.'
    case 'network':
      return '음성 인식 네트워크 오류입니다. Wi‑Fi/데이터를 확인한 뒤 다시 시도해 주세요.'
    case 'service-not-allowed':
      return '이 환경에서는 음성 인식 서비스를 사용할 수 없습니다.'
    case 'bad-grammar':
    case 'language-not-supported':
      return '한국어 음성 인식을 시작할 수 없습니다.'
    default:
      return `음성 인식 오류: ${code}`
  }
}

/**
 * Smooth voice session tuned for iPhone Safari:
 * - accumulates final segments
 * - shows interim text live
 * - auto-restarts when Safari ends the session early
 * - finalizes after short silence following speech
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
  private sessionId = 0

  /** Silence after speech before auto-submit (ms). */
  silenceMs = 1400
  /** Max listen duration (ms). */
  maxListenMs = 28000
  /** Gap before restarting a Safari-ended session (ms). */
  restartDelayMs = 220

  get listening(): boolean {
    return this.state === 'listening' || this.wanted
  }

  get currentState(): VoiceState {
    return this.state
  }

  get transcript(): string {
    return this.compose(this.interim)
  }

  start(callbacks: VoiceCallbacks): boolean {
    if (!getRecognitionCtor()) {
      callbacks.onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. iPhone Safari를 사용해 주세요.')
      return false
    }
    this.stopInternal(false)
    this.callbacks = callbacks
    this.wanted = true
    this.finals = []
    this.interim = ''
    this.heardSpeech = false
    this.sessionId += 1
    stopSpeaking()
    this.setState('listening')
    this.armSafety()
    return this.bootRecognition()
  }

  /** Compatible with older call sites. */
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
    this.stopInternal(true)
  }

  private stopInternal(notifyIdle: boolean): void {
    this.wanted = false
    this.clearTimers()
    if (this.recognition) {
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
    this.starting = false
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
      const text = this.compose('').trim()
      if (text) this.finishWith(text)
      else {
        this.callbacks.onError?.('시간이 초과되었습니다. 다시 MIC를 눌러 주세요.')
        this.stop()
      }
    }, this.maxListenMs) as unknown as number
  }

  private compose(interim: string): string {
    const base = this.finals.join(' ').trim()
    if (!interim) return base
    return `${base} ${interim}`.trim()
  }

  private bumpSilenceWatch(): void {
    if (this.silenceTimer != null) clearTimeout(this.silenceTimer)
    if (!this.heardSpeech) return
    this.silenceTimer = setTimeout(() => {
      if (!this.wanted) return
      const text = this.compose('').trim() || this.compose(this.interim).trim()
      if (text) this.finishWith(text)
    }, this.silenceMs) as unknown as number
  }

  private finishWith(text: string): void {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    this.wanted = false
    this.clearTimers()
    if (this.recognition) {
      try {
        this.recognition.onend = null
        this.recognition.stop()
      } catch {
        /* ignore */
      }
      this.recognition = null
    }
    this.starting = false
    this.setState('processing')
    if (cleaned) this.callbacks.onFinal?.(cleaned)
    this.setState('idle')
  }

  private bootRecognition(): boolean {
    const Ctor = getRecognitionCtor()
    if (!Ctor || !this.wanted) return false
    if (this.starting) return true
    this.starting = true
    const rec = new Ctor()
    const sid = this.sessionId
    rec.lang = 'ko-KR'
    // continuous helps on desktop; Safari may ignore — we still auto-restart onend
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
      this.bumpSilenceWatch()
    }

    rec.onspeechend = () => {
      this.bumpSilenceWatch()
    }

    rec.onresult = (event) => {
      if (this.sessionId !== sid || !this.wanted) return
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result?.[0]?.transcript?.trim()
        if (!piece) continue
        this.heardSpeech = true
        if (result.isFinal) this.finals.push(piece)
        else interim = piece
      }
      this.interim = interim
      const live = this.compose(interim)
      this.callbacks.onInterim?.(live)
      this.bumpSilenceWatch()
    }

    rec.onerror = (event) => {
      this.starting = false
      if (this.sessionId !== sid) return
      const msg = errorMessage(event.error)
      if (event.error === 'no-speech' && this.compose(this.interim).trim()) {
        // finalize what we have instead of failing
        this.finishWith(this.compose(this.interim))
        return
      }
      if (event.error === 'aborted') return
      if (event.error === 'no-speech' && !this.heardSpeech) {
        // keep session; Safari often fires this then onend — restart path handles it
        return
      }
      if (msg) this.callbacks.onError?.(msg)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        this.stop()
      }
    }

    rec.onend = () => {
      this.starting = false
      this.recognition = null
      if (this.sessionId !== sid || !this.wanted) return
      // Safari ends frequently — restart while user still wants to talk
      if (this.heardSpeech && this.compose('').trim() && !this.interim) {
        // already have finals and no interim: let silence timer finish, or finalize soon
        this.bumpSilenceWatch()
      }
      this.restartTimer = setTimeout(() => {
        if (!this.wanted || this.sessionId !== sid) return
        this.bootRecognition()
      }, this.restartDelayMs) as unknown as number
    }

    this.recognition = rec
    try {
      rec.start()
      return true
    } catch {
      this.starting = false
      this.recognition = null
      // rare InvalidStateError — retry once
      this.restartTimer = setTimeout(() => {
        if (!this.wanted || this.sessionId !== sid) return
        this.bootRecognition()
      }, 320) as unknown as number
      return true
    }
  }
}

/** Lightweight capability probe used by settings "음성 테스트". */
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
  ].join('\n')
  return { recognition, speechSynthesis, secureContext, details }
}
