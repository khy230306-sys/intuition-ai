import type { RouletteColor } from '../types.js';

/** European roulette RED numbers (18). */
export const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/** European roulette BLACK numbers (18). */
export const BLACK_NUMBERS = new Set<number>([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export function numberToColor(n: number): RouletteColor {
  if (!Number.isInteger(n) || n < 0 || n > 36) {
    throw new Error(`Invalid roulette number: ${n}`);
  }
  if (n === 0) return 'Z';
  if (RED_NUMBERS.has(n)) return 'R';
  if (BLACK_NUMBERS.has(n)) return 'B';
  throw new Error(`Unmapped roulette number: ${n}`);
}

export function isRed(n: number): boolean {
  return numberToColor(n) === 'R';
}

export function isBlack(n: number): boolean {
  return numberToColor(n) === 'B';
}

export function isZero(n: number): boolean {
  return n === 0;
}

export function oppositeColor(c: 'R' | 'B'): 'R' | 'B' {
  return c === 'R' ? 'B' : 'R';
}

export function parseColorToken(token: string): RouletteColor {
  const t = token.trim().toUpperCase();
  if (t === 'R' || t === 'RED') return 'R';
  if (t === 'B' || t === 'BLACK') return 'B';
  if (t === 'Z' || t === 'G' || t === 'GREEN' || t === 'ZERO' || t === '0') return 'Z';
  const n = Number(t);
  if (Number.isInteger(n) && n >= 0 && n <= 36) return numberToColor(n);
  throw new Error(`Cannot parse color token: ${token}`);
}

export function assertColorBalance(): void {
  if (RED_NUMBERS.size !== 18) throw new Error('RED must have 18 numbers');
  if (BLACK_NUMBERS.size !== 18) throw new Error('BLACK must have 18 numbers');
  for (let i = 1; i <= 36; i++) {
    const inR = RED_NUMBERS.has(i);
    const inB = BLACK_NUMBERS.has(i);
    if (inR === inB) throw new Error(`Number ${i} must be in exactly one color set`);
  }
}
