/** Procedural SFX via Web Audio — no copyrighted samples. */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04, when = 0): void {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = gain
  o.connect(g)
  g.connect(c.destination)
  const t = c.currentTime + when
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export type QuestSfx =
  | 'swap'
  | 'match'
  | 'cascade'
  | 'critical'
  | 'skill'
  | 'damage'
  | 'heal'
  | 'victory'
  | 'defeat'
  | 'boss'
  | 'ui'

export function playQuestSfx(kind: QuestSfx, enabled = true): void {
  if (!enabled) return
  try {
    void ac()?.resume()
    switch (kind) {
      case 'swap':
        beep(320, 0.05, 'triangle', 0.03)
        break
      case 'match':
        beep(520, 0.07, 'sine', 0.045)
        beep(780, 0.08, 'sine', 0.03, 0.04)
        break
      case 'cascade':
        beep(600, 0.05, 'sine', 0.035)
        beep(860, 0.06, 'sine', 0.03, 0.05)
        beep(1100, 0.07, 'sine', 0.025, 0.1)
        break
      case 'critical':
        beep(240, 0.1, 'sawtooth', 0.04)
        beep(480, 0.12, 'square', 0.03, 0.05)
        break
      case 'skill':
        beep(180, 0.15, 'sine', 0.05)
        beep(360, 0.18, 'triangle', 0.04, 0.08)
        break
      case 'damage':
        beep(120, 0.1, 'sawtooth', 0.045)
        break
      case 'heal':
        beep(440, 0.1, 'sine', 0.04)
        beep(660, 0.12, 'sine', 0.03, 0.06)
        break
      case 'victory':
        ;[523, 659, 784, 1046].forEach((f, i) => beep(f, 0.14, 'sine', 0.04, i * 0.1))
        break
      case 'defeat':
        beep(200, 0.2, 'triangle', 0.04)
        beep(140, 0.28, 'sine', 0.035, 0.12)
        break
      case 'boss':
        beep(90, 0.25, 'sawtooth', 0.05)
        beep(140, 0.2, 'square', 0.03, 0.1)
        break
      case 'ui':
        beep(700, 0.04, 'sine', 0.025)
        break
    }
  } catch {
    /* ignore */
  }
}

export function haptic(pattern: number | number[] = 12, enabled = true): void {
  if (!enabled) return
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
