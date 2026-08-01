let ctx: AudioContext | null = null

function ac() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function unlockAudio() {
  const c = ac()
  if (c.state === 'suspended') void c.resume()
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.07, when = 0) {
  const c = ac()
  const t0 = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

export function sfxSlide() {
  tone(380, 0.04, 'triangle', 0.045)
  tone(520, 0.05, 'triangle', 0.035, 0.03)
}
export function sfxWin() {
  tone(523, 0.08, 'triangle', 0.05)
  tone(659, 0.1, 'triangle', 0.05, 0.08)
  tone(784, 0.16, 'triangle', 0.05, 0.16)
}
export function sfxUndo() {
  tone(300, 0.05, 'sine', 0.04)
}
export function sfxDeny() {
  tone(140, 0.08, 'sawtooth', 0.03)
}
export function vibrate(p: number | number[] = 8) {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* ignore */
  }
}
