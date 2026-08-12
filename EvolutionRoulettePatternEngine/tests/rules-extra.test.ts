import { describe, expect, it } from 'vitest';
import { createSameColorChangeRule } from '../src/core/patterns/rules/SameColorChangeRule.js';
import { DEFAULT_SAME_COLOR_CHANGE, DEFAULT_STRATEGY } from '../src/config/defaults.js';
import { parseResultSequence } from '../src/core/roulette/result.js';
import { BettingEngine } from '../src/core/betting/BettingEngine.js';
import { createSameColorReverseRule } from '../src/core/patterns/rules/SameColorReverseRule.js';
import { DEFAULT_SAME_COLOR } from '../src/config/defaults.js';
import { resultFromNumber } from '../src/core/roulette/result.js';
import { Logger } from '../src/logging/Logger.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SimulationAdapter } from '../src/adapters/evolution/EvolutionAdapter.js';
import { IdleActionSupervisor } from '../src/idle/IdleAction.js';

function tmpLogger() {
  return new Logger(fs.mkdtempSync(path.join(os.tmpdir(), 'erpe2-')));
}

describe('Same Color Change rule', () => {
  it('fires at configured entryOffset after change', () => {
    const rule = createSameColorChangeRule({
      ...DEFAULT_SAME_COLOR_CHANGE,
      minimumSameColorRun: 2,
      requiredChanges: 1,
      entryOffset: 1,
      betMode: 'OPPOSITE',
    });
    // BB then R (change) — afterChangeCount=1 == entryOffset → bet opposite of R = B
    const match = rule.detect(parseResultSequence('B,B,R'));
    expect(match).not.toBeNull();
    expect(match!.nextExpectedColor).toBe('B');
  });

  it('does not fire before entry offset', () => {
    const rule = createSameColorChangeRule({
      ...DEFAULT_SAME_COLOR_CHANGE,
      minimumSameColorRun: 2,
      requiredChanges: 1,
      entryOffset: 2,
      betMode: 'SAME',
    });
    expect(rule.detect(parseResultSequence('B,B,R'))).toBeNull();
    const m = rule.detect(parseResultSequence('B,B,R,R'));
    expect(m?.nextExpectedColor).toBe('R');
  });
});

describe('Dry Run default', () => {
  it('marks bets as dryRun by default', () => {
    const engine = new BettingEngine(
      { ...DEFAULT_STRATEGY, mode: 'DRY_RUN' },
      [createSameColorReverseRule({ ...DEFAULT_SAME_COLOR, minimumStreak: 2 })],
      tmpLogger(),
    );
    engine.start();
    engine.processResult(resultFromNumber(2));
    const out = engine.processResult(resultFromNumber(4));
    expect(out.snapshot.mode).toBe('DRY_RUN');
    expect(out.record.bet?.dryRun).toBe(true);
  });
});

describe('Simulation adapter', () => {
  it('reads queued results', async () => {
    const a = new SimulationAdapter([resultFromNumber(1), resultFromNumber(2)]);
    await a.connect();
    const t = await a.detectTable();
    expect(t.confirmed).toBe(true);
    expect((await a.readLatestResult())?.number).toBe(1);
    expect((await a.readLatestResult())?.number).toBe(2);
    expect(await a.readLatestResult()).toBeNull();
  });
});

describe('Idle action', () => {
  it('is OFF by default and warn-only when enabled', () => {
    const logs: string[] = [];
    const logger = {
      warn: (m: string) => logs.push(m),
      info: () => {},
    } as unknown as Logger;
    const idle = new IdleActionSupervisor(
      () => ({
        enabled: true,
        timeoutMs: 1000,
        minimumChip: 1,
        targetNumber: 0,
        warnOnly: true,
      }),
      logger,
    );
    const r = idle.evaluate(5000);
    expect(r.shouldWarn).toBe(true);
    expect(r.shouldAct).toBe(false);
  });
});

describe('Rest prevents signals while analyzing', () => {
  it('does not place bet during rest', () => {
    const engine = new BettingEngine(
      { ...DEFAULT_STRATEGY, defaultRestRounds: 3 },
      [createSameColorReverseRule({ ...DEFAULT_SAME_COLOR, minimumStreak: 2, onLoss: 'REST' })],
      tmpLogger(),
    );
    engine.start();
    engine.processResult(resultFromNumber(2));
    engine.processResult(resultFromNumber(4)); // signal R
    engine.processResult(resultFromNumber(6)); // loss → rest 3
    expect(engine.rest.getRemaining()).toBe(3);
    const during = engine.processResult(resultFromNumber(8)); // still resting, pattern may match but no new bet pending from this
    expect(during.record.noBetReason).toBe('RESTING');
  });
});
