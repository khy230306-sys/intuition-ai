import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpeechRecognitionLike } from './voice'
import {
  VoiceListener,
  __setRecognitionCtorForTests,
  canListen,
  probeVoiceSupport,
} from './voice'

class FakeRecognition implements SpeechRecognitionLike {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onstart: ((ev?: Event) => void) | null = null
  onresult: SpeechRecognitionLike['onresult'] = null
  onerror: SpeechRecognitionLike['onerror'] = null
  onend: (() => void) | null = null
  onspeechstart: (() => void) | null = null
  onspeechend: (() => void) | null = null
  onaudiostart: (() => void) | null = null
  onaudioend: (() => void) | null = null
  onnomatch: (() => void) | null = null
  started = false

  start(): void {
    this.started = true
    queueMicrotask(() => this.onstart?.(undefined))
  }

  stop(): void {
    this.started = false
    queueMicrotask(() => this.onend?.())
  }

  abort(): void {
    this.started = false
    queueMicrotask(() => this.onend?.())
  }

  emitInterim(text: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: false, length: 1, 0: { transcript: text } },
      },
    })
  }

  emitFinal(text: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: true, length: 1, 0: { transcript: text } },
      },
    })
  }

  emitError(error: string): void {
    this.onerror?.({ error })
  }
}

let lastFake: FakeRecognition | null = null

describe('VoiceListener smoothness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    lastFake = null
    vi.stubGlobal('speechSynthesis', {
      cancel: () => undefined,
      speak: () => undefined,
    })
    __setRecognitionCtorForTests(
      class {
        constructor() {
          lastFake = new FakeRecognition()
          return lastFake
        }
      } as unknown as new () => SpeechRecognitionLike,
    )
  })

  afterEach(() => {
    __setRecognitionCtorForTests(null)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reports recognition capability when ctor injected', () => {
    expect(canListen()).toBe(true)
    expect(probeVoiceSupport().recognition).toBe(true)
  })

  it('streams interim text then auto-finalizes after silence', () => {
    const listener = new VoiceListener()
    listener.silenceMs = 500
    const interims: string[] = []
    let finalText = ''

    const ok = listener.start({
      onInterim: (t) => interims.push(t),
      onFinal: (t) => {
        finalText = t
      },
    })
    expect(ok).toBe(true)
    expect(lastFake).toBeTruthy()

    lastFake!.onspeechstart?.()
    lastFake!.emitInterim('삼성전자')
    lastFake!.emitFinal('삼성전자')
    lastFake!.emitInterim('시세')
    expect(interims.at(-1)).toContain('시세')

    vi.advanceTimersByTime(600)
    expect(finalText).toMatch(/삼성전자/)
    expect(listener.currentState).toBe('idle')
  })

  it('restarts when Safari ends the session early while still wanted', () => {
    const listener = new VoiceListener()
    listener.restartDelayMs = 100
    listener.start({ onInterim: () => undefined })
    const first = lastFake
    expect(first?.started).toBe(true)

    // Safari drops session
    first!.onend?.()
    vi.advanceTimersByTime(150)
    expect(lastFake).not.toBe(first)
    expect(listener.listening).toBe(true)
    listener.stop()
  })

  it('accumulates multiple final segments smoothly', () => {
    const listener = new VoiceListener()
    listener.silenceMs = 400
    let finalText = ''
    listener.start({
      onFinal: (t) => {
        finalText = t
      },
    })
    lastFake!.onspeechstart?.()
    lastFake!.emitFinal('관심종목')
    lastFake!.emitFinal('엔비디아')
    lastFake!.emitFinal('추가')
    vi.advanceTimersByTime(500)
    expect(finalText).toBe('관심종목 엔비디아 추가')
  })

  it('maps not-allowed to Korean guidance', () => {
    const listener = new VoiceListener()
    let err = ''
    listener.start({
      onError: (m) => {
        err = m
      },
    })
    lastFake!.emitError('not-allowed')
    expect(err).toContain('마이크 권한')
  })
})
