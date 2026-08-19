import type { RouletteColor, RouletteResult, ZeroHandling } from '../types.js';

/** Prepare color stream for pattern matching according to ZERO policy. */
export function prepareColors(
  history: RouletteResult[],
  zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN',
): { colors: RouletteColor[]; indexMap: number[] } {
  const colors: RouletteColor[] = [];
  const indexMap: number[] = [];

  for (let i = 0; i < history.length; i++) {
    const c = history[i]!.color;
    if (c === 'Z') {
      if (zeroHandling === 'ZERO_IGNORED') continue;
      colors.push('Z');
      indexMap.push(i);
    } else {
      colors.push(c);
      indexMap.push(i);
    }
  }
  return { colors, indexMap };
}

export function streakAtEnd(colors: RouletteColor[]): { color: RouletteColor; length: number } | null {
  if (colors.length === 0) return null;
  const color = colors[colors.length - 1]!;
  if (color === 'Z') return { color: 'Z', length: 1 };
  let length = 1;
  for (let i = colors.length - 2; i >= 0; i--) {
    if (colors[i] === color) length += 1;
    else break;
  }
  return { color, length };
}

export function isStrictAlternating(colors: RouletteColor[], minLen: number): boolean {
  if (colors.length < minLen) return false;
  const slice = colors.slice(-minLen);
  if (slice.some((c) => c === 'Z')) return false;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i] === slice[i - 1]) return false;
  }
  return true;
}

export function longestAlternatingSuffix(colors: RouletteColor[]): RouletteColor[] {
  if (colors.length === 0) return [];
  let start = colors.length - 1;
  if (colors[start] === 'Z') return [colors[start]!];
  while (start > 0) {
    const prev = colors[start - 1]!;
    const cur = colors[start]!;
    if (prev === 'Z' || cur === 'Z') break;
    if (prev === cur) break;
    start -= 1;
  }
  return colors.slice(start);
}
