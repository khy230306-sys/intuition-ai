import { randomUUID } from 'node:crypto';
import type { RouletteColor, RouletteResult } from '../types.js';
import { numberToColor, parseColorToken } from './colors.js';

let roundCounter = 0;

export function createRoundId(prefix = 'rnd'): string {
  roundCounter += 1;
  return `${prefix}-${Date.now()}-${roundCounter}-${randomUUID().slice(0, 8)}`;
}

export function resultFromNumber(
  number: number,
  opts: Partial<Pick<RouletteResult, 'roundId' | 'timestamp' | 'source'>> = {},
): RouletteResult {
  return {
    roundId: opts.roundId ?? createRoundId(),
    number,
    color: numberToColor(number),
    timestamp: opts.timestamp ?? Date.now(),
    source: opts.source ?? 'manual',
  };
}

export function resultFromColor(
  color: RouletteColor,
  opts: Partial<Pick<RouletteResult, 'roundId' | 'timestamp' | 'source' | 'number'>> = {},
): RouletteResult {
  const number =
    opts.number ??
    (color === 'Z' ? 0 : color === 'R' ? 1 : 2);
  return {
    roundId: opts.roundId ?? createRoundId(),
    number,
    color,
    timestamp: opts.timestamp ?? Date.now(),
    source: opts.source ?? 'manual',
  };
}

/**
 * Parse mixed input: "R,R,B,0,31" or "1,7,3,20" or "R R B Z".
 * Numbers 0-36 map via European color table.
 */
export function parseResultSequence(input: string): RouletteResult[] {
  const tokens = input
    .split(/[,\s|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return tokens.map((token, i) => {
    const upper = token.toUpperCase();
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      return resultFromNumber(n, {
        source: 'simulation',
        timestamp: Date.now() + i,
      });
    }
    const color = parseColorToken(upper);
    return resultFromColor(color, {
      source: 'simulation',
      timestamp: Date.now() + i,
    });
  });
}

export function formatResultShort(r: RouletteResult): string {
  return `${r.number}${r.color}`;
}

export function formatColorOnly(r: RouletteResult): string {
  return r.color;
}
