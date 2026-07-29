type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
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
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 1.05
  u.pitch = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}

export class VoiceListener {
  private recognition: SpeechRecognitionLike | null = null
  private active = false

  get listening(): boolean {
    return this.active
  }

  start(onText: (text: string, final: boolean) => void, onError?: (msg: string) => void): boolean {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. Safari에서 사용해 주세요.')
      return false
    }
    this.stop()
    const rec = new Ctor()
    rec.lang = 'ko-KR'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      if (!last) return
      onText(last[0].transcript.trim(), last.isFinal)
    }
    rec.onerror = (event) => {
      this.active = false
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        onError?.(event.error === 'not-allowed' ? '마이크 권한이 필요합니다.' : `음성 인식 오류: ${event.error}`)
      }
    }
    rec.onend = () => {
      this.active = false
    }
    this.recognition = rec
    this.active = true
    try {
      rec.start()
      return true
    } catch {
      this.active = false
      onError?.('음성 인식을 시작할 수 없습니다.')
      return false
    }
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {
        /* ignore */
      }
    }
    this.recognition = null
    this.active = false
  }
}
