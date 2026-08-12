import type { IdleActionConfig } from '../core/types.js';
import type { Logger } from '../logging/Logger.js';

/**
 * Idle Action is intentionally separated from pattern/betting strategy.
 * Default OFF. When enabled with warnOnly, only logs a warning — never auto-bets
 * in environments where site policy may disallow idle chip placement.
 */
export class IdleActionSupervisor {
  constructor(
    private getConfig: () => IdleActionConfig,
    private logger: Logger,
  ) {}

  evaluate(msSinceLastBet: number): { shouldWarn: boolean; shouldAct: boolean; message: string } {
    const cfg = this.getConfig();
    if (!cfg.enabled) {
      return { shouldWarn: false, shouldAct: false, message: 'Idle action OFF' };
    }
    if (msSinceLastBet < cfg.timeoutMs) {
      return { shouldWarn: false, shouldAct: false, message: 'Within idle timeout' };
    }

    const minutes = Math.round(cfg.timeoutMs / 60000);
    const message = `IDLE TIMEOUT ≥${minutes}m — policy action would bet ${cfg.minimumChip} on number ${cfg.targetNumber}. warnOnly=${cfg.warnOnly}`;

    if (cfg.warnOnly) {
      return { shouldWarn: true, shouldAct: false, message };
    }

    // Even when warnOnly=false, we do not auto-execute against live site without explicit adapter support.
    this.logger.warn('Idle action requested but auto-execution is disabled for safety — warning only');
    return { shouldWarn: true, shouldAct: false, message };
  }
}
