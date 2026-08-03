/** Tiny Web Audio SFX for arcade — no assets, muted-safe. */

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.08,
  slideTo?: number,
): void {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noiseBurst(dur: number, gain = 0.05, filterFreq = 1200): void {
  const ac = audio()
  if (!ac) return
  const n = Math.floor(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, n, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = ac.createBufferSource()
  src.buffer = buf
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = 0.8
  const g = ac.createGain()
  const t0 = ac.currentTime
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(ac.destination)
  src.start(t0)
}

/** Jump / flap */
export function sfxJump(): void {
  tone(280, 0.12, 'square', 0.07, 520)
  noiseBurst(0.06, 0.03, 1800)
}

/** Soft whoosh (air) */
export function sfxWhoosh(): void {
  noiseBurst(0.14, 0.035, 900)
  tone(180, 0.1, 'sine', 0.03, 90)
}

/** Land / thump */
export function sfxLand(): void {
  tone(110, 0.08, 'triangle', 0.06, 55)
  noiseBurst(0.05, 0.04, 400)
}

/** Obstacle clear / score tick */
export function sfxScore(): void {
  tone(660, 0.07, 'sine', 0.05)
  tone(880, 0.09, 'sine', 0.04)
}

/** Level up chime */
export function sfxLevel(): void {
  tone(523, 0.08, 'sine', 0.05)
  setTimeout(() => tone(659, 0.08, 'sine', 0.05), 70)
  setTimeout(() => tone(784, 0.12, 'sine', 0.055), 140)
}

/** Death / crash */
export function sfxDeath(): void {
  noiseBurst(0.22, 0.07, 600)
  tone(220, 0.28, 'sawtooth', 0.06, 40)
}

/** Resume audio after first gesture (iOS) */
export function sfxUnlock(): void {
  audio()
}
