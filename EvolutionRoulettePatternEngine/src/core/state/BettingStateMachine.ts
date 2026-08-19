import type { EngineState } from '../types.js';

const ALLOWED: Record<EngineState, EngineState[]> = {
  IDLE: ['WAIT_PATTERN', 'STOPPED', 'ERROR'],
  WAIT_PATTERN: ['SIGNAL_READY', 'REST', 'STOPPED', 'ERROR', 'IDLE'],
  SIGNAL_READY: ['BETTING', 'WAIT_PATTERN', 'REST', 'STOPPED', 'ERROR'],
  BETTING: ['WAIT_RESULT', 'STOPPED', 'ERROR'],
  WAIT_RESULT: ['WIN', 'LOSS', 'STOPPED', 'ERROR'],
  WIN: ['WAIT_PATTERN', 'SIGNAL_READY', 'REST', 'STOPPED', 'IDLE'],
  LOSS: ['REST', 'WAIT_PATTERN', 'SIGNAL_READY', 'STOPPED', 'ERROR'],
  REST: ['WAIT_PATTERN', 'REST', 'STOPPED', 'IDLE'],
  STOPPED: ['IDLE', 'WAIT_PATTERN'],
  ERROR: ['IDLE', 'STOPPED', 'WAIT_PATTERN'],
};

export class BettingStateMachine {
  private state: EngineState = 'IDLE';
  private lastError: string | null = null;

  getState(): EngineState {
    return this.state;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  canTransition(to: EngineState): boolean {
    return ALLOWED[this.state].includes(to);
  }

  transition(to: EngineState, reason?: string): EngineState {
    if (!this.canTransition(to)) {
      const msg = `Invalid transition ${this.state} → ${to}${reason ? ` (${reason})` : ''}`;
      this.lastError = msg;
      throw new Error(msg);
    }
    this.state = to;
    if (to === 'ERROR' && reason) this.lastError = reason;
    if (to !== 'ERROR') this.lastError = null;
    return this.state;
  }

  force(to: EngineState): void {
    this.state = to;
  }

  reset(): void {
    this.state = 'IDLE';
    this.lastError = null;
  }
}
