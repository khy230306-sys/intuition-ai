type ToneKind = 'click' | 'core' | 'sync' | 'resultPerfect' | 'resultMiss'

let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!audioContext) {
    audioContext = new AudioCtx()
  }
  return audioContext
}

async function ensureResumed(ctx: AudioContext) {
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

function playTone(kind: ToneKind) {
  const ctx = getContext()
  if (!ctx) return

  void ensureResumed(ctx).then(() => {
    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    if (kind === 'core') {
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(220, now)
      oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.35)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.5)
      return
    }

    if (kind === 'sync') {
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(660, now)
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.2)
      return
    }

    if (kind === 'resultPerfect') {
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(392, now)
      oscillator.frequency.exponentialRampToValueAtTime(784, now + 0.28)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.42)
      return
    }

    if (kind === 'resultMiss') {
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(180, now)
      oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.22)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
      return
    }

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(520, now)
    oscillator.frequency.exponentialRampToValueAtTime(280, now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.14)
  })
}

export function playClickSound(enabled: boolean) {
  if (!enabled) return
  playTone('click')
}

export function playCoreSound(enabled: boolean) {
  if (!enabled) return
  playTone('core')
}

export function playSyncSound(enabled: boolean) {
  if (!enabled) return
  playTone('sync')
}

export function playResultSound(enabled: boolean, perfectLike: boolean) {
  if (!enabled) return
  playTone(perfectLike ? 'resultPerfect' : 'resultMiss')
}
