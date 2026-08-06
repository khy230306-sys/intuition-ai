type ToneKind = 'click' | 'core'

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

    oscillator.type = kind === 'core' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(kind === 'core' ? 220 : 520, now)
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === 'core' ? 440 : 280,
      now + (kind === 'core' ? 0.35 : 0.08),
    )

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(kind === 'core' ? 0.08 : 0.045, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'core' ? 0.45 : 0.12))

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + (kind === 'core' ? 0.5 : 0.14))
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
