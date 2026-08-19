export interface RuleStatRow {
  ruleId: string;
  ruleName: string;
  signals: number;
  wins: number;
  losses: number;
  winRate: number;
  longestWin: number;
  longestLoss: number;
  currentStreak: number;
  currentStreakType: 'W' | 'L' | 'N';
  maxMartingaleStage: number;
  netUnits: number;
}

export class RuleStatsTracker {
  private map = new Map<string, RuleStatRow>();

  private ensure(ruleId: string, ruleName: string): RuleStatRow {
    let row = this.map.get(ruleId);
    if (!row) {
      row = {
        ruleId,
        ruleName,
        signals: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        longestWin: 0,
        longestLoss: 0,
        currentStreak: 0,
        currentStreakType: 'N',
        maxMartingaleStage: 0,
        netUnits: 0,
      };
      this.map.set(ruleId, row);
    } else if (ruleName) {
      row.ruleName = ruleName;
    }
    return row;
  }

  recordSignal(ruleId: string, ruleName: string): void {
    const row = this.ensure(ruleId, ruleName);
    row.signals += 1;
  }

  recordOutcome(ruleId: string, won: boolean, amount: number, stage: number): void {
    const row = this.ensure(ruleId, ruleId);
    if (won) {
      row.wins += 1;
      row.netUnits += amount;
      if (row.currentStreakType === 'W') row.currentStreak += 1;
      else {
        row.currentStreakType = 'W';
        row.currentStreak = 1;
      }
      row.longestWin = Math.max(row.longestWin, row.currentStreak);
    } else {
      row.losses += 1;
      row.netUnits -= amount;
      if (row.currentStreakType === 'L') row.currentStreak += 1;
      else {
        row.currentStreakType = 'L';
        row.currentStreak = 1;
      }
      row.longestLoss = Math.max(row.longestLoss, row.currentStreak);
    }
    row.maxMartingaleStage = Math.max(row.maxMartingaleStage, stage);
    const total = row.wins + row.losses;
    row.winRate = total ? row.wins / total : 0;
  }

  all(): RuleStatRow[] {
    return [...this.map.values()];
  }

  reset(): void {
    this.map.clear();
  }
}

export class SessionStats {
  totalBets = 0;
  wins = 0;
  losses = 0;
  netUnits = 0;
  maxDrawdown = 0;
  maxLossStreak = 0;
  private peak = 0;
  private lossStreak = 0;
  zeroCount = 0;
  private startedAt = Date.now();

  recordBet(won: boolean, amount: number, _stage: number): void {
    this.totalBets += 1;
    if (won) {
      this.wins += 1;
      this.netUnits += amount;
      this.lossStreak = 0;
    } else {
      this.losses += 1;
      this.netUnits -= amount;
      this.lossStreak += 1;
      this.maxLossStreak = Math.max(this.maxLossStreak, this.lossStreak);
    }
    this.peak = Math.max(this.peak, this.netUnits);
    this.maxDrawdown = Math.max(this.maxDrawdown, this.peak - this.netUnits);
  }

  recordZero(): void {
    this.zeroCount += 1;
  }

  get winRate(): number {
    return this.totalBets ? this.wins / this.totalBets : 0;
  }

  averageBetsPerHour(): number {
    const hours = (Date.now() - this.startedAt) / 3_600_000;
    if (hours <= 0) return this.totalBets;
    return this.totalBets / hours;
  }

  snapshot() {
    return {
      totalBets: this.totalBets,
      wins: this.wins,
      losses: this.losses,
      winRate: this.winRate,
      profitUnits: this.netUnits,
      maxDrawdown: this.maxDrawdown,
      maxLossStreak: this.maxLossStreak,
      averageBetsPerHour: this.averageBetsPerHour(),
      zeroCount: this.zeroCount,
    };
  }

  reset(): void {
    this.totalBets = 0;
    this.wins = 0;
    this.losses = 0;
    this.netUnits = 0;
    this.maxDrawdown = 0;
    this.maxLossStreak = 0;
    this.peak = 0;
    this.lossStreak = 0;
    this.zeroCount = 0;
    this.startedAt = Date.now();
  }
}
