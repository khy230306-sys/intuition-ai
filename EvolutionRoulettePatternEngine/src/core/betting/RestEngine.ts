export class RestEngine {
  private remaining = 0;

  constructor(private defaultRounds = 3) {}

  getDefaultRounds(): number {
    return this.defaultRounds;
  }

  setDefaultRounds(n: number): void {
    if (n < 0 || n > 30) throw new Error('rest rounds must be 0..30');
    this.defaultRounds = n;
  }

  getRemaining(): number {
    return this.remaining;
  }

  isResting(): boolean {
    return this.remaining > 0;
  }

  startRest(rounds?: number): void {
    const r = rounds ?? this.defaultRounds;
    if (r < 0 || r > 30) throw new Error('rest rounds must be 0..30');
    this.remaining = r;
  }

  /** Call once per new result while resting. Returns true if rest just finished. */
  tick(): boolean {
    if (this.remaining <= 0) return false;
    this.remaining -= 1;
    return this.remaining === 0;
  }

  clear(): void {
    this.remaining = 0;
  }
}
