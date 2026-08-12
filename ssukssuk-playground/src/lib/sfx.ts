/** Lightweight Web Audio SFX — no external sample dependency. */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function beep(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur)
}

export const sfx = {
  tap() {
    beep(520, 0.06, 'triangle', 0.05)
  },
  snap() {
    beep(340, 0.08, 'square', 0.04)
    beep(620, 0.1, 'sine', 0.05)
  },
  paint() {
    beep(440, 0.05, 'sine', 0.04)
    beep(660, 0.08, 'triangle', 0.05)
  },
  drive() {
    beep(180, 0.12, 'sawtooth', 0.03)
  },
  siren() {
    const c = ac()
    if (!c) return
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(680, c.currentTime)
    o.frequency.linearRampToValueAtTime(980, c.currentTime + 0.18)
    o.frequency.linearRampToValueAtTime(680, c.currentTime + 0.36)
    g.gain.value = 0.05
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g)
    g.connect(c.destination)
    o.start()
    o.stop(c.currentTime + 0.4)
  },
  win() {
    beep(523, 0.1, 'sine', 0.06)
    setTimeout(() => beep(659, 0.1, 'sine', 0.06), 90)
    setTimeout(() => beep(784, 0.16, 'triangle', 0.07), 180)
  },
  whoosh() {
    beep(240, 0.1, 'triangle', 0.03)
  },
}
