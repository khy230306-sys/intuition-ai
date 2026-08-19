import fs from 'node:fs';
import path from 'node:path';
import type {
  AlternatingRuleConfig,
  CustomPatternDefinition,
  FirstBetRuleConfig,
  RepeatingBlockRuleConfig,
  SameColorChangeRuleConfig,
  SameColorRuleConfig,
  StrategyConfig,
  SuppressPatternDefinition,
} from '../core/types.js';
import {
  DEFAULT_ALTERNATING,
  DEFAULT_FIRST_BET,
  DEFAULT_REPEATING_BLOCK,
  DEFAULT_SAME_COLOR,
  DEFAULT_SAME_COLOR_CHANGE,
  DEFAULT_STRATEGY,
  PHOTO_CUSTOM_PATTERNS,
  PHOTO_SUPPRESS_PATTERNS,
} from '../config/defaults.js';

export interface AppConfigFile {
  strategy: StrategyConfig;
  sameColor: SameColorRuleConfig;
  sameColorChange: SameColorChangeRuleConfig;
  alternating: AlternatingRuleConfig;
  repeatingBlock: RepeatingBlockRuleConfig;
  firstBet: FirstBetRuleConfig;
  customPatterns: CustomPatternDefinition[];
  suppressPatterns: SuppressPatternDefinition[];
}

export function defaultAppConfig(): AppConfigFile {
  return {
    strategy: structuredClone(DEFAULT_STRATEGY),
    sameColor: structuredClone(DEFAULT_SAME_COLOR),
    sameColorChange: structuredClone(DEFAULT_SAME_COLOR_CHANGE),
    alternating: structuredClone(DEFAULT_ALTERNATING),
    repeatingBlock: structuredClone(DEFAULT_REPEATING_BLOCK),
    firstBet: structuredClone(DEFAULT_FIRST_BET),
    customPatterns: structuredClone(PHOTO_CUSTOM_PATTERNS),
    suppressPatterns: structuredClone(PHOTO_SUPPRESS_PATTERNS),
  };
}

function mergeById<T extends { id: string }>(base: T[], incoming: T[] | undefined): T[] {
  if (!incoming) return base;
  const map = new Map<string, T>();
  for (const item of base) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

export class ConfigStore {
  private config: AppConfigFile;

  constructor(private filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AppConfigFile>;
      const defaults = defaultAppConfig();
      this.config = {
        ...defaults,
        ...raw,
        strategy: { ...defaults.strategy, ...(raw.strategy ?? {}) },
        sameColor: { ...defaults.sameColor, ...(raw.sameColor ?? {}) },
        sameColorChange: { ...defaults.sameColorChange, ...(raw.sameColorChange ?? {}) },
        alternating: { ...defaults.alternating, ...(raw.alternating ?? {}) },
        repeatingBlock: { ...defaults.repeatingBlock, ...(raw.repeatingBlock ?? {}) },
        firstBet: { ...defaults.firstBet, ...(raw.firstBet ?? {}) },
        // Seed photo patterns if file has empty/missing lists; merge by id otherwise
        customPatterns:
          !raw.customPatterns || raw.customPatterns.length === 0
            ? defaults.customPatterns
            : mergeById(defaults.customPatterns, raw.customPatterns),
        suppressPatterns:
          !raw.suppressPatterns || raw.suppressPatterns.length === 0
            ? defaults.suppressPatterns
            : mergeById(defaults.suppressPatterns, raw.suppressPatterns),
      };
      if (raw.strategy?.martingale) {
        this.config.strategy.martingale = {
          ...defaults.strategy.martingale,
          ...raw.strategy.martingale,
        };
      }
      if (raw.strategy?.idleAction) {
        this.config.strategy.idleAction = {
          ...defaults.strategy.idleAction,
          ...raw.strategy.idleAction,
        };
      }
      this.save();
    } else {
      this.config = defaultAppConfig();
      this.save();
    }
  }

  get(): AppConfigFile {
    return this.config;
  }

  update(partial: Partial<AppConfigFile>): AppConfigFile {
    this.config = {
      ...this.config,
      ...partial,
      strategy: { ...this.config.strategy, ...(partial.strategy ?? {}) },
      sameColor: { ...this.config.sameColor, ...(partial.sameColor ?? {}) },
      sameColorChange: { ...this.config.sameColorChange, ...(partial.sameColorChange ?? {}) },
      alternating: { ...this.config.alternating, ...(partial.alternating ?? {}) },
      repeatingBlock: { ...this.config.repeatingBlock, ...(partial.repeatingBlock ?? {}) },
      firstBet: { ...this.config.firstBet, ...(partial.firstBet ?? {}) },
      customPatterns: partial.customPatterns ?? this.config.customPatterns,
      suppressPatterns: partial.suppressPatterns ?? this.config.suppressPatterns,
    };
    if (partial.strategy?.martingale) {
      this.config.strategy.martingale = {
        ...this.config.strategy.martingale,
        ...partial.strategy.martingale,
      };
    }
    if (partial.strategy?.idleAction) {
      this.config.strategy.idleAction = {
        ...this.config.strategy.idleAction,
        ...partial.strategy.idleAction,
      };
    }
    this.save();
    return this.config;
  }

  setCustomPatterns(patterns: CustomPatternDefinition[]): void {
    this.config.customPatterns = patterns;
    this.save();
  }

  upsertCustomPattern(pattern: CustomPatternDefinition): void {
    const idx = this.config.customPatterns.findIndex((p) => p.id === pattern.id);
    if (idx >= 0) this.config.customPatterns[idx] = pattern;
    else this.config.customPatterns.push(pattern);
    this.save();
  }

  deleteCustomPattern(id: string): void {
    this.config.customPatterns = this.config.customPatterns.filter((p) => p.id !== id);
    this.save();
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf8');
  }
}
