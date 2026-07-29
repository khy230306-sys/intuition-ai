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
    u.rate = 1.12
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
      return '한국어 음성 인식을 시작할 수 없습니다.'
    default:
      return `음성 인식 오류: ${code}`
  }
}

/**
 * Speed-first voice session for iPhone Safari.
 * - final result → submit immediately (no long silence wait)
 * - continuous=false (faster single utterance on iOS)
 * - tiny fallback silence only for interim-only paths
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
  private sessionId = 0
  private emptyEnds = 0
  private listenLang = 'ko-KR'

  /** Fallback only when we have interim but no final yet. */
  silenceMs = 420
  maxListenMs = 12000
  restartDelayMs = 80

  get listening(): boolean {
    return this.state === 'listening' || this.wanted
  }

  get currentState(): VoiceState {
    return this.state
  }

  get transcript(): string {
    return this.compose(this.interim)
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
    this.finals = []
    this.interim = ''
    this.heardSpeech = false
    this.emptyEnds = 0
    this.sessionId += 1
    this.listenLang = lang || 'ko-KR'
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
    this.stopInternal(true)
  }

  private stopInternal(notifyIdle: boolean): void {
    this.wanted = false
    this.finishing = false
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
      const text = this.compose(this.interim).trim()
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
    if (!this.heardSpeech || this.finishing) return
    this.silenceTimer = setTimeout(() => {
      if (!this.wanted || this.finishing) return
      const text = this.compose(this.interim).trim()
      if (text) this.finishWith(text)
    }, this.silenceMs) as unknown as number
  }

  private finishWith(text: string): void {
    if (this.finishing) return
    this.finishing = true
    const cleaned = text.replace(/\s+/g, ' ').trim()
    this.wanted = false
    this.clearTimers()
    if (this.recognition) {
      const rec = this.recognition
      this.recognition = null
      rec.onend = null
      rec.onresult = null
      rec.onerror = null
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
    // false = faster single-utterance path on iOS Safari
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => {
      this.starting = false
      if (this.sessionId !== sid || !this.wanted) return
      this.setState('listening')
    }

    rec.onspeechstart = () => {
      this.heardSpeech = true
    }

    rec.onspeechend = () => {
      // If we already have finals, finish immediately — do not wait
      const ready = this.compose('').trim()
      if (ready) this.finishWith(ready)
      else this.bumpSilenceWatch()
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
          this.finals.push(piece)
          gotFinal = true
        } else {
          interim = piece
        }
      }
      this.interim = interim
      const live = this.compose(interim)
      this.callbacks.onInterim?.(live)

      // SPEED: submit the moment Safari marks a final result
      if (gotFinal) {
        this.finishWith(this.compose(''))
        return
      }
      this.bumpSilenceWatch()
    }

    rec.onerror = (event) => {
      this.starting = false
      if (this.sessionId !== sid || this.finishing) return
      if (event.error === 'aborted') return
      const text = this.compose(this.interim).trim()
      if (text && (event.error === 'no-speech' || event.error === 'network')) {
        this.finishWith(text)
        return
      }
      if (event.error === 'no-speech' && !this.heardSpeech) {
        // let onend restart once quickly
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
      const text = this.compose(this.interim).trim()
      if (text) {
        this.finishWith(text)
        return
      }
      if (!this.wanted) return
      this.emptyEnds += 1
      // one fast retry if Safari ended before speech; then stop
      if (this.emptyEnds <= 1) {
        this.restartTimer = setTimeout(() => {
          if (!this.wanted || this.sessionId !== sid) return
          this.bootRecognition()
        }, this.restartDelayMs) as unknown as number
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
      this.restartTimer = setTimeout(() => {
        if (!this.wanted || this.sessionId !== sid) return
        this.bootRecognition()
      }, 120) as unknown as number
      return true
    }
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
    '모드: 고속(최종 인식 즉시 전송)',
  ].join('\n')
  return { recognition, speechSynthesis, secureContext, details }
}
