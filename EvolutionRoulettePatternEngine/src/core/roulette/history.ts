import type { RouletteColor, RouletteResult, ZeroHandling } from '../types.js';

export class RouletteHistory {
  private items: RouletteResult[] = [];

  constructor(private readonly limit = 500) {}

  get length(): number {
    return this.items.length;
  }

  get all(): readonly RouletteResult[] {
    return this.items;
  }

  colors(): RouletteColor[] {
    return this.items.map((r) => r.color);
  }

  /** Colors with optional ZERO handling for pattern matching. */
  patternColors(zeroHandling: ZeroHandling = 'ZERO_BREAKS_PATTERN'): RouletteColor[] {
    if (zeroHandling === 'ZERO_IGNORED') {
      return this.items.filter((r) => r.color !== 'Z').map((r) => r.color);
    }
    return this.colors();
  }

  latest(): RouletteResult | null {
    return this.items.length ? this.items[this.items.length - 1]! : null;
  }

  hasRound(roundId: string): boolean {
    return this.items.some((r) => r.roundId === roundId);
  }

  push(result: RouletteResult): void {
    if (this.hasRound(result.roundId)) {
      throw new Error(`Duplicate roundId: ${result.roundId}`);
    }
    this.items.push(result);
    if (this.items.length > this.limit) {
      this.items = this.items.slice(this.items.length - this.limit);
    }
  }

  /** Snapshot of first `n` results (1-based count) — for no-lookahead simulation. */
  slice(count: number): RouletteResult[] {
    return this.items.slice(0, Math.max(0, count));
  }

  clear(): void {
    this.items = [];
  }

  formatNumberMode(limit = 20): string {
    return this.items
      .slice(-limit)
      .map((r) => `${r.number}${r.color}`)
      .join('  ');
  }

  formatColorMode(limit = 40): string {
    return this.items
      .slice(-limit)
      .map((r) => r.color)
      .join(' ');
  }
}
