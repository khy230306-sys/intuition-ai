import type { PatternRule } from '../patterns/PatternRule.js';
import { PatternEngine } from '../patterns/PatternEngine.js';
import { MartingaleEngine } from '../betting/MartingaleEngine.js';
import { RestEngine } from '../betting/RestEngine.js';
import { BettingStateMachine } from '../state/BettingStateMachine.js';
import type {
  BetColor,
  BetRequest,
  PatternDecision,
  RouletteResult,
  StrategyConfig,
  ZeroHandling,
} from '../types.js';
import { createRoundId } from '../roulette/result.js';

export interface ReplayStep {
  roundIndex: number; // 1-based
  result: RouletteResult;
  /** Decision made using ONLY results[0..roundIndex-2] (empty for round 1). */
  decisionBeforeResult: PatternDecision;
  betOnThisRound: BetRequest | null;
  outcome: 'WIN' | 'LOSS' | 'NO_BET';
  state: string;
  martingaleStage: number;
  restRemaining: number;
  line: string;
}

/**
 * Strict chronological replay with zero look-ahead bias:
 * For round n, pattern evaluation sees only results[0..n-2].
 */
export class ReplaySimulator {
  constructor(
    private rules: PatternRule[],
    private config: StrategyConfig,
  ) {}

  run(results: RouletteResult[]): ReplayStep[] {
    const engine = new PatternEngine(this.rules);
    const mg = new MartingaleEngine(this.config.martingale);
    const rest = new RestEngine(this.config.defaultRestRounds);
    const sm = new BettingStateMachine();
    sm.force('WAIT_PATTERN');

    const past: RouletteResult[] = [];
    const steps: ReplayStep[] = [];
    let continueColor: { ruleId: string; color: BetColor } | null = null;
    const zeroHandling: ZeroHandling = this.config.zeroHandling;

    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      const roundIndex = i + 1;

      // --- decision uses ONLY past (look-ahead forbidden) ---
      let decision: PatternDecision;
      if (rest.isResting()) {
        decision = { match: null, betColor: null, conflicts: [], reason: 'RESTING' };
      } else if (sm.getState() === 'STOPPED') {
        decision = { match: null, betColor: null, conflicts: [], reason: 'STOPPED' };
      } else if (continueColor) {
        decision = {
          match: {
            ruleId: continueColor.ruleId,
            ruleName: 'continue',
            confidence: 0.9,
            priority: 9999,
            matchedSequence: [],
            startIndex: 0,
            endIndex: Math.max(0, past.length - 1),
            nextExpectedColor: continueColor.color,
          },
          betColor: continueColor.color,
          conflicts: [],
        };
      } else {
        decision = engine.evaluate(past, zeroHandling);
      }

      let bet: BetRequest | null = null;
      let outcome: 'WIN' | 'LOSS' | 'NO_BET' = 'NO_BET';

      if (decision.betColor && decision.match && !rest.isResting() && sm.getState() !== 'STOPPED') {
        bet = {
          roundId: createRoundId('replay-bet'),
          color: decision.betColor,
          amount: mg.currentAmount(),
          martingaleStage: mg.getStage(),
          ruleId: decision.match.ruleId,
          dryRun: true,
        };

        // Settle against THIS result (known only after decision)
        const won = result.color !== 'Z' && result.color === bet.color;
        outcome = won ? 'WIN' : 'LOSS';

        if (won) {
          mg.onWin();
          const rule = engine.getRule(bet.ruleId);
          const action = rule?.onWin ?? 'WAIT_NEW_PATTERN';
          if (action === 'CONTINUE' || action === 'CONTINUE_SAME_PATTERN') {
            continueColor = {
              ruleId: bet.ruleId,
              color: bet.color === 'R' ? 'B' : 'R',
            };
          } else if (action === 'CONTINUE_OPPOSITE') {
            continueColor = {
              ruleId: bet.ruleId,
              color: bet.color === 'R' ? 'B' : 'R',
            };
          } else {
            continueColor = null;
          }
          if (action === 'REST') {
            rest.startRest(rule?.restRoundsAfterLoss ?? this.config.defaultRestRounds);
            sm.force('REST');
          } else {
            sm.force('WAIT_PATTERN');
          }
        } else {
          continueColor = null;
          const r = mg.onLoss();
          if (r.stopped) sm.force('STOPPED');
          else {
            const rule = engine.getRule(bet.ruleId);
            const action = rule?.onLoss ?? 'REST';
            if (action === 'REST') {
              rest.startRest(rule?.restRoundsAfterLoss ?? this.config.defaultRestRounds);
              sm.force('REST');
            } else sm.force('WAIT_PATTERN');
          }
        }
      } else if (rest.isResting()) {
        rest.tick();
        if (!rest.isResting()) sm.force('WAIT_PATTERN');
        else sm.force('REST');
      }

      // Append result AFTER decision — proves no look-ahead
      past.push(result);

      const matchTag = decision.match ? ' PATTERN_MATCH' : '';
      const signal =
        bet != null
          ? `SIGNAL → ${bet.color === 'R' ? 'RED' : 'BLACK'}`
          : decision.reason === 'RESTING'
            ? 'NO_BET RESTING'
            : 'WAIT';
      const outcomeTag = outcome === 'NO_BET' ? '' : ` ${outcome}`;
      const line = `ROUND ${roundIndex} ${result.color}${matchTag} ${signal}${outcomeTag}`;

      steps.push({
        roundIndex,
        result,
        decisionBeforeResult: decision,
        betOnThisRound: bet,
        outcome,
        state: sm.getState(),
        martingaleStage: mg.getStage(),
        restRemaining: rest.getRemaining(),
        line,
      });
    }

    return steps;
  }
}
