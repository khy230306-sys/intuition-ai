/** Tiny Web Audio feedback — no external assets. */

let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function unlockAudio() {
  const c = ac()
  if (c.state === 'suspended') void c.resume()
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
  when = 0,
) {
  const c = ac()
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

export function sfxStart() {
  tone(440, 0.08, 'triangle', 0.06)
  tone(660, 0.1, 'triangle', 0.05, 0.07)
}

export function sfxGo() {
  tone(880, 0.12, 'square', 0.05)
}

export function sfxHit() {
  tone(740, 0.06, 'sine', 0.07)
  tone(980, 0.08, 'sine', 0.05, 0.04)
}

export function sfxPerfect() {
  tone(880, 0.05, 'sine', 0.06)
  tone(1100, 0.06, 'sine', 0.05, 0.05)
  tone(1320, 0.1, 'triangle', 0.05, 0.1)
}

export function sfxMiss() {
  tone(180, 0.18, 'sawtooth', 0.05)
  tone(120, 0.22, 'sawtooth', 0.04, 0.05)
}

export function sfxFever() {
  tone(520, 0.08, 'square', 0.04)
  tone(780, 0.1, 'square', 0.05, 0.07)
  tone(1040, 0.14, 'square', 0.045, 0.14)
}

export function sfxStage() {
  tone(392, 0.08, 'triangle', 0.06)
  tone(523, 0.1, 'triangle', 0.055, 0.08)
  tone(659, 0.14, 'triangle', 0.05, 0.16)
}

export function sfxLevelUp() {
  tone(440, 0.08, 'triangle', 0.06)
  tone(554, 0.08, 'triangle', 0.05, 0.08)
  tone(659, 0.08, 'triangle', 0.05, 0.16)
  tone(880, 0.18, 'triangle', 0.06, 0.24)
}

export function sfxGameOver() {
  tone(320, 0.12, 'triangle', 0.06)
  tone(240, 0.14, 'triangle', 0.05, 0.1)
  tone(160, 0.28, 'triangle', 0.05, 0.2)
}

export function vibrate(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}
