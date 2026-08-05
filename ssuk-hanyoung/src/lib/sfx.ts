/** Lightweight Web Audio SFX — works offline, no asset files */

import { getSettings } from './store'

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (getSettings().muteSfx) return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function setSfxMuted(_v: boolean) {
  /* mute is read live from store settings */
}

export function isSfxMuted() {
  return getSettings().muteSfx
}

function beep(freq: number, dur = 0.12, type: OscillatorType = 'square', gain = 0.08, slide = 0) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

export const sfx = {
  tap: () => beep(520, 0.08, 'triangle', 0.06),
  pop: () => beep(380, 0.1, 'sine', 0.07, -180),
  win: () => {
    beep(523, 0.1, 'triangle', 0.07)
    setTimeout(() => beep(659, 0.1, 'triangle', 0.07), 90)
    setTimeout(() => beep(784, 0.18, 'triangle', 0.08), 180)
  },
  wrong: () => beep(180, 0.16, 'sawtooth', 0.05, -40),
  horn: () => {
    beep(220, 0.22, 'square', 0.07)
    setTimeout(() => beep(180, 0.28, 'square', 0.07), 80)
  },
  siren: () => {
    const c = ac()
    if (!c) return
    const t0 = c.currentTime
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(680, t0)
    o.frequency.linearRampToValueAtTime(920, t0 + 0.18)
    o.frequency.linearRampToValueAtTime(680, t0 + 0.36)
    g.gain.setValueAtTime(0.05, t0)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4)
    o.connect(g)
    g.connect(c.destination)
    o.start(t0)
    o.stop(t0 + 0.42)
  },
  vroom: () => beep(120, 0.35, 'sawtooth', 0.05, 220),
  drum: () => beep(90, 0.14, 'triangle', 0.1, -30),
  cheer: () => {
    beep(660, 0.08, 'triangle', 0.06)
    setTimeout(() => beep(880, 0.12, 'triangle', 0.07), 70)
  },
  paint: () => beep(740, 0.09, 'sine', 0.05),
  go: () => beep(500, 0.12, 'square', 0.06, 200),
  wait: () => beep(240, 0.1, 'sine', 0.04),
}
