import fs from 'node:fs';
import path from 'node:path';
import type {
  AlternatingRuleConfig,
  CustomPatternDefinition,
  RepeatingBlockRuleConfig,
  SameColorChangeRuleConfig,
  SameColorRuleConfig,
  StrategyConfig,
} from '../core/types.js';
import {
  DEFAULT_ALTERNATING,
  DEFAULT_REPEATING_BLOCK,
  DEFAULT_SAME_COLOR,
  DEFAULT_SAME_COLOR_CHANGE,
  DEFAULT_STRATEGY,
} from '../config/defaults.js';

export interface AppConfigFile {
  strategy: StrategyConfig;
  sameColor: SameColorRuleConfig;
  sameColorChange: SameColorChangeRuleConfig;
  alternating: AlternatingRuleConfig;
  repeatingBlock: RepeatingBlockRuleConfig;
  customPatterns: CustomPatternDefinition[];
}

export function defaultAppConfig(): AppConfigFile {
  return {
    strategy: structuredClone(DEFAULT_STRATEGY),
    sameColor: structuredClone(DEFAULT_SAME_COLOR),
    sameColorChange: structuredClone(DEFAULT_SAME_COLOR_CHANGE),
    alternating: structuredClone(DEFAULT_ALTERNATING),
    repeatingBlock: structuredClone(DEFAULT_REPEATING_BLOCK),
    customPatterns: [],
  };
}

export class ConfigStore {
  private config: AppConfigFile;

  constructor(private filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath)) {
      this.config = { ...defaultAppConfig(), ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
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
      customPatterns: partial.customPatterns ?? this.config.customPatterns,
    };
    // deep merge nested strategy bits
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
