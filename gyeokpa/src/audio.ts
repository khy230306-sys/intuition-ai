let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(v: boolean): void {
  muted = v;
}

export function isMuted(): boolean {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  gain = 0.04,
  slide = 0,
): void {
  if (muted) return;
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export const sfx = {
  shot: () => tone(880, 0.05, "square", 0.025, -400),
  hit: () => tone(220, 0.08, "sawtooth", 0.03, -80),
  boom: () => {
    tone(120, 0.22, "sawtooth", 0.05, -80);
    tone(60, 0.28, "triangle", 0.04, -20);
  },
  power: () => {
    tone(440, 0.08, "triangle", 0.035, 220);
    tone(660, 0.12, "triangle", 0.03, 180);
  },
  hurt: () => tone(140, 0.18, "sawtooth", 0.05, -60),
  clear: () => {
    tone(523, 0.1, "triangle", 0.04);
    setTimeout(() => tone(659, 0.1, "triangle", 0.04), 80);
    setTimeout(() => tone(784, 0.16, "triangle", 0.045), 160);
  },
  ui: () => tone(520, 0.05, "triangle", 0.025),
};
