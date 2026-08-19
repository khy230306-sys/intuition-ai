import { describe, expect, it } from 'vitest';
import { createFirstBetEntryRule } from '../src/core/patterns/rules/FirstBetEntryRule.js';
import { DEFAULT_FIRST_BET } from '../src/config/defaults.js';
import { parseResultSequence } from '../src/core/roulette/result.js';
import { BettingEngine } from '../src/core/betting/BettingEngine.js';
import { Logger } from '../src/logging/Logger.js';
import { DEFAULT_STRATEGY } from '../src/config/defaults.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resultFromNumber } from '../src/core/roulette/result.js';

describe('Photo 첫 배팅 전용 규칙', () => {
  it('단일 색이면 반대색', () => {
    const rule = createFirstBetEntryRule(DEFAULT_FIRST_BET, () => true);
    // ...5(R) 29(B) — last B is single after R → opposite = R? 
    // Wait: 26B 29B would be streak. 5R 29B: last B, prev R → single → opposite of B = R
    expect(rule.detect(parseResultSequence('R,B'))?.nextExpectedColor).toBe('R');
    expect(rule.detect(parseResultSequence('B,R'))?.nextExpectedColor).toBe('B');
  });

  it('연속 색이면 같은색', () => {
    const rule = createFirstBetEntryRule(DEFAULT_FIRST_BET, () => true);
    // 26B 29B → streak B → same B
    expect(rule.detect(parseResultSequence('B,B'))?.nextExpectedColor).toBe('B');
    expect(rule.detect(parseResultSequence('R,R,R'))?.nextExpectedColor).toBe('R');
  });

  it('첫 배팅이 아니면 동작 안 함', () => {
    const rule = createFirstBetEntryRule(DEFAULT_FIRST_BET, () => false);
    expect(rule.detect(parseResultSequence('B,B'))).toBeNull();
  });

  it('엔진에서 첫 신호 후 firstBetPending 해제', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-'));
    const logger = new Logger(dir);
    let pending = true;
    const rule = createFirstBetEntryRule(DEFAULT_FIRST_BET, () => pending);
    const engine = new BettingEngine(DEFAULT_STRATEGY, [rule], logger);
    // sync pending flag with engine
    const orig = engine.isFirstBetPending.bind(engine);
    // use engine's own flag via re-set rules
    engine.patterns.setRules([
      createFirstBetEntryRule(DEFAULT_FIRST_BET, () => engine.isFirstBetPending()),
    ]);
    engine.start();
    expect(engine.isFirstBetPending()).toBe(true);
    engine.processResult(resultFromNumber(5)); // R
    engine.processResult(resultFromNumber(29)); // B single after R → first bet R
    expect(engine.isFirstBetPending()).toBe(false);
    expect(engine.snapshot().lastSignal?.color).toBe('R');
    void orig;
  });
});
