# LottoLens 3.0 Backtest

## Look-ahead rule

When evaluating draw **N**, feature/engine inputs may only use draws with `drawNumber < N` (`drawsBefore` + `assertNoLookahead`). Tests fail if future rows leak.

## API

- `runBacktest({ allDraws, strategyMode, fromDraw, toDraw, gamesPerDraw, seed })`
- `walkForward({ folds: [{ trainEnd, validateFrom, validateTo }, ...] })`

## Metrics

- Average matches per game
- Match histogram 0–6
- Best match
- **Random Baseline** average matches (same window/games/seed family)
- Delta = strategy − random
- Approximate 95% CI on match means

## UI

BACKTEST LAB: recent 50/100, walk-forward, Strategy Arena (MASTER/TREND/DELAY/RELATION/CONTRARIAN/RANDOM on identical windows).

## Experimental Evolution

`proposeWeightEvolution` compares validation (+ holdout) deltas. Proposals never auto-apply; user must save a strategy.

## Reproducibility

Same dataset + strategy mode + seed + engine versions → same generator/backtest outputs for RANDOM paths.
