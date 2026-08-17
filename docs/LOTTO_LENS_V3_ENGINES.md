# LottoLens 3.0 Engines

All engines implement `AnalysisEngine` and return `numberScores` (0–100 normalized where applicable), `rankedNumbers`, `confidence`, `evidence`, `metadata`. Versions are `1.0.0` unless noted.

## TREND (`trend@1.0.0`)

Rolling appearance rates over windows 5/10/20/30/50/100/300/all. Compares short-term rate vs long-term rate → `trendDelta` / velocity. Distinguishes overheated recent hits from rising momentum.

## DELAY (`delay@1.0.0`)

Current gap, mean/max gap, percentile of current delay vs history, delay/mean ratio. Does **not** blindly boost long gaps; scores statistical position.

## CYCLE (`cycle@1.0.0`)

Per-number inter-appearance interval sequences: mean, median, variance, recent deviation vs historical distribution.

## PAIR (`pair@1.0.0`)

Full 45×45 co-occurrence: expected count, lift, Jaccard, conditional `P(b|a)` / `P(a|b)`.

## TRIPLE (`triple@1.0.0`)

Cached top triple co-occurrences (avoids full brute recompute every call).

## NETWORK (`network@1.0.0`)

Pair graph centrality (degree × average edge weight). UI relation map via `engines/network/graph.ts`.

## STRUCTURE (`structure@1.0.0`)

Odd/even, low/high, decade sections, sum, range, consecutives, endings, primes, gaps — scores numbers by affinity to historically common structures.

## REPEAT (`repeat@1.0.0`)

Carry-over / recent-k repeat rates vs historical distribution (descriptive, not “good/bad”).

## ENDING (`ending@1.0.0`)

Last-digit 0–9 distribution diversity and recent vs long-term mix.

## GAP (`gap@1.0.0`)

Sorted six-number spacing profiles vs historical gap patterns.

## CONTRARIAN (`contrarian@1.0.0`)

Independent fade-of-recent-heat scoring (not a literal invert of TREND).

## RANDOM (`random@1.0.0`)

Unbiased sampling baseline. Seedable. Never removed.

## MONTE CARLO (`monte@1.0.0`)

Large candidate search under scoring/constraints. **Not** a future-draw simulator.

## MASTER (`master@1.0.0`)

Normalizes child scores, weighted blend → master 0–100 with per-engine components.

## Council

Scores → votes: strong_for / for / neutral / against / strong_against. Consensus aggregates vote weights.
