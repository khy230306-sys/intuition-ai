import type { MartingaleConfig } from '../types.js';

export class MartingaleEngine {
  private stage = 1;

  constructor(private config: MartingaleConfig) {
    this.validate();
  }

  private validate(): void {
    if (this.config.baseBet <= 0) throw new Error('baseBet must be > 0');
    if (this.config.multiplier <= 1) throw new Error('multiplier must be > 1');
    if (this.config.maxStage < 1) throw new Error('maxStage must be >= 1');
  }

  updateConfig(config: Partial<MartingaleConfig>): void {
    this.config = { ...this.config, ...config };
    this.validate();
    if (this.stage > this.config.maxStage) this.stage = this.config.maxStage;
  }

  getConfig(): MartingaleConfig {
    return { ...this.config };
  }

  getStage(): number {
    return this.stage;
  }

  setStage(stage: number): void {
    if (stage < 1) throw new Error('stage must be >= 1');
    this.stage = stage;
  }

  /** Amount for current stage: baseBet * multiplier^(stage-1) */
  currentAmount(): number {
    return this.amountForStage(this.stage);
  }

  amountForStage(stage: number): number {
    return this.config.baseBet * Math.pow(this.config.multiplier, stage - 1);
  }

  /** Full ladder for UI/docs (not hardcoded amounts). */
  ladder(): number[] {
    return Array.from({ length: this.config.maxStage }, (_, i) => this.amountForStage(i + 1));
  }

  onWin(): void {
    this.stage = 1;
  }

  /**
   * Increase stage after loss.
   * @returns false if max stage exceeded (STOP)
   */
  onLoss(): { ok: boolean; stage: number; stopped: boolean } {
    if (this.stage >= this.config.maxStage) {
      return { ok: false, stage: this.stage, stopped: true };
    }
    this.stage += 1;
    return { ok: true, stage: this.stage, stopped: false };
  }

  reset(): void {
    this.stage = 1;
  }

  isMaxExceededAfterLoss(): boolean {
    return this.stage >= this.config.maxStage;
  }
}
