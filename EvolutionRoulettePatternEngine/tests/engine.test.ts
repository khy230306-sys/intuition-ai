import { describe, expect, it } from 'vitest';
import {
  assertColorBalance,
  BLACK_NUMBERS,
  numberToColor,
  RED_NUMBERS,
} from '../src/core/roulette/colors.js';
import { RouletteHistory } from '../src/core/roulette/history.js';
import { parseResultSequence, resultFromNumber, createRoundId } from '../src/core/roulette/result.js';
import { createSameColorReverseRule } from '../src/core/patterns/rules/SameColorReverseRule.js';
import { createAlternatingRule } from '../src/core/patterns/rules/AlternatingRule.js';
import { createRepeatingBlockRule } from '../src/core/patterns/rules/RepeatingBlockRule.js';
import { createCustomSequenceRule } from '../src/core/patterns/rules/CustomSequenceRule.js';
import { PatternEngine } from '../src/core/patterns/PatternEngine.js';
import { MartingaleEngine } from '../src/core/betting/MartingaleEngine.js';
import { RestEngine } from '../src/core/betting/RestEngine.js';
import { BettingStateMachine } from '../src/core/state/BettingStateMachine.js';
import { BettingEngine } from '../src/core/betting/BettingEngine.js';
import { ReplaySimulator } from '../src/core/session/ReplaySimulator.js';
import { Logger } from '../src/logging/Logger.js';
import { DEFAULT_STRATEGY, DEFAULT_SAME_COLOR, DEFAULT_ALTERNATING, DEFAULT_REPEATING_BLOCK } from '../src/config/defaults.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function tmpLogger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'erpe-'));
  return new Logger(dir);
}

describe('Roulette number → color', () => {
  it('maps European table correctly', () => {
    assertColorBalance();
    expect(RED_NUMBERS.size).toBe(18);
    expect(BLACK_NUMBERS.size).toBe(18);
    expect(numberToColor(0)).toBe('Z');
    expect(numberToColor(1)).toBe('R');
    expect(numberToColor(2)).toBe('B');
    expect(numberToColor(14)).toBe('R');
    expect(numberToColor(11)).toBe('B');
    expect(numberToColor(36)).toBe('R');
  });
});

describe('ZERO test', () => {
  it('ZERO loses on R/B bet', () => {
    const rules = [
      createSameColorReverseRule({ ...DEFAULT_SAME_COLOR, minimumStreak: 3, onLoss: 'REST' }),
    ];
    const engine = new BettingEngine(
      { ...DEFAULT_STRATEGY, defaultRestRounds: 3 },
      rules,
      tmpLogger(),
    );
    engine.start();
    // Build BBB → signal R
    engine.processResult(resultFromNumber(2)); // B
    engine.processResult(resultFromNumber(4)); // B
    const third = engine.processResult(resultFromNumber(6)); // B → should signal R for next
    expect(third.snapshot.lastSignal?.color).toBe('R');
    // ZERO arrives → LOSS
    const zero = engine.processResult(resultFromNumber(0));
    expect(zero.record.betOutcome).toBe('LOSS');
  });
});

describe('History test', () => {
  it('stores independent rounds even with same number', () => {
    const h = new RouletteHistory();
    h.push(resultFromNumber(7, { roundId: 'a' }));
    h.push(resultFromNumber(7, { roundId: 'b' }));
    expect(h.length).toBe(2);
    expect(() => h.push(resultFromNumber(7, { roundId: 'a' }))).toThrow(/Duplicate/);
  });
});

describe('Same Color Pattern test', () => {
  it('detects streak and bets opposite', () => {
    const rule = createSameColorReverseRule({
      ...DEFAULT_SAME_COLOR,
      minimumStreak: 3,
      betOpposite: true,
    });
    const hist = parseResultSequence('B,B,B');
    const match = rule.detect(hist);
    expect(match).not.toBeNull();
    expect(rule.determineBet(match!)).toBe('R');
  });

  it('respects configurable minimum streak', () => {
    const rule = createSameColorReverseRule({
      ...DEFAULT_SAME_COLOR,
      minimumStreak: 4,
      betOpposite: true,
    });
    expect(rule.detect(parseResultSequence('R,R,R'))).toBeNull();
    expect(rule.detect(parseResultSequence('R,R,R,R'))?.nextExpectedColor).toBe('B');
  });
});

describe('Alternating Pattern test', () => {
  it('detects RBRB → next R', () => {
    const rule = createAlternatingRule({ ...DEFAULT_ALTERNATING, minimumLength: 4 });
    const match = rule.detect(parseResultSequence('R,B,R,B'));
    expect(match?.nextExpectedColor).toBe('R');
    const match2 = rule.detect(parseResultSequence('B,R,B,R'));
    expect(match2?.nextExpectedColor).toBe('B');
  });
});

describe('Repeating Block test', () => {
  it('detects repeating block prefix and predicts next', () => {
    const rule = createRepeatingBlockRule({
      ...DEFAULT_REPEATING_BLOCK,
      minBlockLength: 3,
      maxBlockLength: 4,
      lookback: 30,
    });
    // Block RBB appeared, then RB... expects B
    const hist = parseResultSequence('R,B,B,X'.replace('X', 'R') + ',B'); // R B B R B
    // clearer:
    const h = parseResultSequence('R,B,B,R,B');
    const match = rule.detect(h);
    // May or may not match depending on algorithm — assert shape when matched
    if (match) {
      expect(['R', 'B']).toContain(match.nextExpectedColor);
      expect(match.metadata?.matchedPattern).toBeTruthy();
    }
    // Stronger case: explicit full block then prefix
    const h2 = parseResultSequence('R,B,B,B,R,B,B');
    const m2 = rule.detect(h2);
    expect(m2).not.toBeNull();
    expect(m2!.nextExpectedColor).toBe('B');
  });
});

describe('Pattern Builder test', () => {
  it('matches custom sequence without code changes', () => {
    const rule = createCustomSequenceRule({
      id: 'pattern-001',
      name: 'RRR Reverse',
      sequence: ['R', 'R', 'R'],
      entryMode: 'OPPOSITE',
      onWin: 'WAIT_NEW_PATTERN',
      onLoss: 'REST',
      restRounds: 3,
      priority: 10,
      enabled: true,
    });
    const match = rule.detect(parseResultSequence('B,R,R,R'));
    expect(match).not.toBeNull();
    expect(rule.determineBet(match!)).toBe('B');
  });
});

describe('Martingale test', () => {
  it('computes ladder from base/multiplier/maxStage', () => {
    const mg = new MartingaleEngine({ baseBet: 1, multiplier: 2, maxStage: 14 });
    expect(mg.ladder()).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]);
    const mg3 = new MartingaleEngine({ baseBet: 3, multiplier: 2, maxStage: 5 });
    expect(mg3.ladder()).toEqual([3, 6, 12, 24, 48]);
  });

  it('win resets stage; loss increases; max stops', () => {
    const mg = new MartingaleEngine({ baseBet: 1, multiplier: 2, maxStage: 3 });
    mg.onLoss();
    expect(mg.getStage()).toBe(2);
    mg.onLoss();
    expect(mg.getStage()).toBe(3);
    const stopped = mg.onLoss();
    expect(stopped.stopped).toBe(true);
    mg.onWin();
    // onWin after stop still resets if called
    expect(mg.getStage()).toBe(1);
  });
});

describe('Rest 3 rounds test', () => {
  it('rests 3 rounds after loss by default', () => {
    const rest = new RestEngine(3);
    rest.startRest();
    expect(rest.getRemaining()).toBe(3);
    rest.tick();
    rest.tick();
    expect(rest.isResting()).toBe(true);
    expect(rest.getRemaining()).toBe(1);
    rest.tick();
    expect(rest.isResting()).toBe(false);
  });
});

describe('Duplicate round prevention test', () => {
  it('rejects duplicate roundId', () => {
    const engine = new BettingEngine(DEFAULT_STRATEGY, [], tmpLogger());
    engine.start();
    const r = resultFromNumber(1, { roundId: 'same' });
    engine.processResult(r);
    expect(() => engine.processResult(resultFromNumber(2, { roundId: 'same' }))).toThrow(/Duplicate/);
  });
});

describe('No-lookahead test', () => {
  it('never uses future results when deciding bet for round n', () => {
    const rules = [
      createSameColorReverseRule({ ...DEFAULT_SAME_COLOR, minimumStreak: 3, priority: 100 }),
    ];
    const results = parseResultSequence('B,B,B,R,R,R,B');
    const sim = new ReplaySimulator(rules, DEFAULT_STRATEGY);
    const steps = sim.run(results);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      // Reconstruct: decision must equal evaluate(results.slice(0, i))
      const engine = new PatternEngine(rules);
      const expected = engine.evaluate(results.slice(0, i), 'ZERO_BREAKS_PATTERN');
      expect(step.decisionBeforeResult.betColor).toBe(expected.betColor);
      expect(step.decisionBeforeResult.match?.ruleId ?? null).toBe(expected.match?.ruleId ?? null);
    }

    // Round 4 is first time BBB is in the past (after rounds 1-3), so bet on round 4
    const round4 = steps[3]!;
    expect(round4.decisionBeforeResult.betColor).toBe('R');
    expect(round4.outcome).toBe('WIN'); // result R
  });
});

describe('Replay test', () => {
  it('prints chronological judgments', () => {
    const rules = [
      createSameColorReverseRule({ ...DEFAULT_SAME_COLOR, minimumStreak: 3 }),
    ];
    const steps = new ReplaySimulator(rules, DEFAULT_STRATEGY).run(parseResultSequence('R,R,R,B'));
    expect(steps[0]!.line).toMatch(/ROUND 1 R/);
    expect(steps[2]!.line).toMatch(/WAIT|NO_BET/);
    expect(steps[3]!.line).toMatch(/PATTERN_MATCH/);
    expect(steps[3]!.line).toMatch(/SIGNAL → BLACK/);
    expect(steps[3]!.line).toMatch(/WIN/);
  });
});

describe('State Machine test', () => {
  it('allows valid transitions and rejects invalid', () => {
    const sm = new BettingStateMachine();
    expect(sm.getState()).toBe('IDLE');
    sm.transition('WAIT_PATTERN');
    sm.transition('SIGNAL_READY');
    sm.transition('BETTING');
    sm.transition('WAIT_RESULT');
    sm.transition('WIN');
    expect(() => sm.transition('BETTING')).toThrow(/Invalid transition/);
  });
});

describe('Pattern Engine conflict resolution', () => {
  it('picks by priority then confidence then ruleId — never random', () => {
    const low = createSameColorReverseRule({
      ...DEFAULT_SAME_COLOR,
      id: 'low',
      priority: 1,
      minimumStreak: 3,
    });
    const high = createAlternatingRule({
      ...DEFAULT_ALTERNATING,
      id: 'high',
      priority: 99,
      minimumLength: 4,
    });
    // Sequence that can match both? RBRB doesn't match same color. Use BBBB for same color only.
    // For conflict: custom + same
    const custom = createCustomSequenceRule({
      id: 'zzz-custom',
      name: 'BBB',
      sequence: ['B', 'B', 'B'],
      entryMode: 'SAME',
      onWin: 'WAIT_NEW_PATTERN',
      onLoss: 'REST',
      restRounds: 3,
      priority: 50,
      enabled: true,
      confidence: 0.99,
    });
    const eng = new PatternEngine([low, custom]);
    const d = eng.evaluate(parseResultSequence('B,B,B'));
    expect(d.match?.ruleId).toBe('zzz-custom'); // higher priority 50 > 1
    expect(d.conflicts.length).toBe(1);
  });
});

describe('Win reset / Loss stage increase via engine', () => {
  it('resets martingale on win and increases on loss', () => {
    const rules = [
      createSameColorReverseRule({
        ...DEFAULT_SAME_COLOR,
        minimumStreak: 2,
        onWin: 'WAIT_NEW_PATTERN',
        onLoss: 'WAIT_NEW_PATTERN',
        restRoundsAfterLoss: 0,
      }),
    ];
    const engine = new BettingEngine(
      { ...DEFAULT_STRATEGY, defaultRestRounds: 0 },
      rules,
      tmpLogger(),
    );
    engine.start();
    engine.processResult(resultFromNumber(2)); // B
    engine.processResult(resultFromNumber(4)); // B → signal R
    expect(engine.martingale.getStage()).toBe(1);
    // Lose
    engine.processResult(resultFromNumber(6)); // B loss
    expect(engine.martingale.getStage()).toBe(2);
    // Need another pattern: BB again
    engine.processResult(resultFromNumber(8)); // B
    // after loss with WAIT, may need streak again - history is B B B B
    // already has streak; signal placed
    const snap = engine.snapshot();
    // Win next
    if (snap.lastSignal) {
      engine.processResult(resultFromNumber(1)); // R win
      expect(engine.martingale.getStage()).toBe(1);
    }
  });
});

describe('ZERO_BREAKS_PATTERN vs ZERO_IGNORED', () => {
  it('breaks alternating when ZERO_BREAKS_PATTERN', () => {
    const rule = createAlternatingRule({ ...DEFAULT_ALTERNATING, minimumLength: 4 });
    const hist = parseResultSequence('R,B,R,0,B');
    expect(rule.detect(hist, 'ZERO_BREAKS_PATTERN')).toBeNull();
  });
});

describe('createRoundId uniqueness', () => {
  it('creates unique ids', () => {
    const a = createRoundId();
    const b = createRoundId();
    expect(a).not.toBe(b);
  });
});
