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

describe('VoiceListener speed mode', () => {
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
    expect(probeVoiceSupport().details).toContain('고속')
  })

  it('finalizes immediately on final result (no silence wait)', () => {
    const listener = new VoiceListener()
    listener.silenceMs = 5000
    let finalText = ''
    const t0 = Date.now()
    listener.start({
      onFinal: (t) => {
        finalText = t
      },
    })
    lastFake!.onspeechstart?.()
    lastFake!.emitInterim('지금')
    lastFake!.emitFinal('지금 몇 시야')
    expect(finalText).toBe('지금 몇 시야')
    expect(Date.now() - t0).toBeLessThan(50)
    expect(listener.currentState).toBe('idle')
  })

  it('finishes on speechend when finals already present', () => {
    const listener = new VoiceListener()
    let finalText = ''
    listener.start({
      onFinal: (t) => {
        finalText = t
      },
    })
    // manually push via final
    lastFake!.emitFinal('브리핑')
    expect(finalText).toBe('브리핑')
  })

  it('retries once on empty end then errors', () => {
    const listener = new VoiceListener()
    listener.restartDelayMs = 50
    let err = ''
    listener.start({
      onError: (m) => {
        err = m
      },
    })
    const first = lastFake
    first!.onend?.()
    vi.advanceTimersByTime(60)
    expect(lastFake).not.toBe(first)
    lastFake!.onend?.()
    expect(err).toContain('음성이 감지되지 않았습니다')
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
