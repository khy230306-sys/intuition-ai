import { describe, expect, it } from 'vitest';
import { PatternEngine } from '../src/core/patterns/PatternEngine.js';
import { createSameColorReverseRule } from '../src/core/patterns/rules/SameColorReverseRule.js';
import { createSameColorChangeRule } from '../src/core/patterns/rules/SameColorChangeRule.js';
import { createAlternatingRule } from '../src/core/patterns/rules/AlternatingRule.js';
import { createCustomSequenceRule } from '../src/core/patterns/rules/CustomSequenceRule.js';
import { createSuppressSequenceRule } from '../src/core/patterns/rules/SuppressSequenceRule.js';
import { parseResultSequence } from '../src/core/roulette/result.js';
import {
  DEFAULT_ALTERNATING,
  DEFAULT_SAME_COLOR,
  DEFAULT_SAME_COLOR_CHANGE,
  PHOTO_CUSTOM_PATTERNS,
  PHOTO_SUPPRESS_PATTERNS,
} from '../src/config/defaults.js';
import { defaultAppConfig } from '../src/storage/ConfigStore.js';
import { buildRulesFromConfig } from '../src/app/Orchestrator.js';
import { ConfigStore } from '../src/storage/ConfigStore.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Photo checklist — confirmed rules', () => {
  it('ZERO while betting R/B is a loss (color table)', () => {
    // covered elsewhere; assert mapping used by photos ("흰"=black UI)
    expect(parseResultSequence('0')[0]!.color).toBe('Z');
  });

  it('Photo #1 RRR → opposite BLACK', () => {
    const rule = createSameColorReverseRule(DEFAULT_SAME_COLOR);
    expect(rule.detect(parseResultSequence('R,R,R'))?.nextExpectedColor).toBe('B');
    expect(rule.detect(parseResultSequence('B,B,B'))?.nextExpectedColor).toBe('R');
  });

  it('Photo #1 RBR / BRB → opposite (alternating min 3)', () => {
    const rule = createAlternatingRule(DEFAULT_ALTERNATING);
    expect(rule.detect(parseResultSequence('R,B,R'))?.nextExpectedColor).toBe('B');
    expect(rule.detect(parseResultSequence('B,R,B'))?.nextExpectedColor).toBe('R');
  });

  it('Photo #2: streak 2+ then 2nd of changed color (SAME)', () => {
    const rule = createSameColorChangeRule(DEFAULT_SAME_COLOR_CHANGE);
    // RRR then B (1st of new) → signal B for 2nd
    expect(rule.detect(parseResultSequence('R,R,R,B'))?.nextExpectedColor).toBe('B');
    expect(rule.detect(parseResultSequence('B,B,B,R'))?.nextExpectedColor).toBe('R');
    // only 1 of new color before entry — not yet after 2nd observed
    expect(rule.detect(parseResultSequence('R,R,R'))).toBeNull();
  });

  it('Photo #3: 1 2 2 2 1 → bet 2 (both color mappings)', () => {
    const rbbbr = createCustomSequenceRule(PHOTO_CUSTOM_PATTERNS[0]!);
    const brrrb = createCustomSequenceRule(PHOTO_CUSTOM_PATTERNS[1]!);
    expect(rbbbr.detect(parseResultSequence('R,B,B,B,R'))?.nextExpectedColor).toBe('B');
    expect(brrrb.detect(parseResultSequence('B,R,R,R,B'))?.nextExpectedColor).toBe('R');
  });

  it('Photo 1212 alternating continues until loss', () => {
    expect(DEFAULT_ALTERNATING.continueUntilLoss).toBe(true);
    expect(DEFAULT_ALTERNATING.onWin).toBe('CONTINUE');
    expect(DEFAULT_ALTERNATING.onLoss).toBe('REST');
    expect(DEFAULT_ALTERNATING.restRoundsAfterLoss).toBe(3);
  });

  it('Photo: 13번 흘려보내기 — suppress NO BET', () => {
    const rule = createSuppressSequenceRule(PHOTO_SUPPRESS_PATTERNS[0]!);
    const hist = parseResultSequence('R,R,B,B,R,B,R,B,B,R,R,R');
    const match = rule.detect(hist);
    expect(match).not.toBeNull();
    expect(rule.determineBet(match!)).toBeNull();

    const eng = new PatternEngine([
      createSameColorReverseRule(DEFAULT_SAME_COLOR),
      createAlternatingRule(DEFAULT_ALTERNATING),
      rule,
    ]);
    const d = eng.evaluate(hist);
    expect(d.betColor).toBeNull();
    expect(d.reason).toBe('NO_BET_SUPPRESS_WAIT');
  });

  it('Loss rest default is 3', () => {
    expect(DEFAULT_SAME_COLOR.restRoundsAfterLoss).toBe(3);
    expect(DEFAULT_SAME_COLOR_CHANGE.restRoundsAfterLoss).toBe(3);
    expect(DEFAULT_ALTERNATING.restRoundsAfterLoss).toBe(3);
  });

  it('Idle anti-kick defaults: 8 min, target 0, OFF + warnOnly', () => {
    const s = defaultAppConfig().strategy.idleAction;
    expect(s.timeoutMs).toBe(8 * 60 * 1000);
    expect(s.targetNumber).toBe(0);
    expect(s.enabled).toBe(false);
    expect(s.warnOnly).toBe(true);
  });

  it('Seeded config builds photo rules', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'erpe-cfg-'));
    const store = new ConfigStore(path.join(dir, 'app.json'));
    const rules = buildRulesFromConfig(store);
    expect(rules.some((r) => r.id.startsWith('photo-'))).toBe(true);
    expect(rules.some((r) => r.id.includes('suppress'))).toBe(true);
  });
});
