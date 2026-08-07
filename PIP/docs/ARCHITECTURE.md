# PIP Architecture

## Separation

- `src/game/*`: pure engine (no React)
- `src/hooks/usePipGame.ts`: state machine orchestration / timers
- `src/components/*`: presentation only

## Shoe lifecycle

1. `createDeck()` → 50 cards
2. `shuffleCopy()` via `crypto.getRandomValues`
3. Split: Hidden 6 + Playing 44 (frozen order)
4. 22 rounds consume pairs from playing cursor
5. Reveal hidden, then new shoe

## Phase machine

`SHOE_INIT → BETTING_OPEN → BETTING_LOCK → CARD_A_REVEAL → CARD_B_REVEAL → RESULT → SETTLEMENT → NEXT_ROUND|SHOE_COMPLETE → HIDDEN_REVEAL → NEW_SHOE`

## Fairness

- Order is fixed at shoe creation
- No mid-shoe reshuffle
- No result rewriting based on player choice
- Dev integrity panel only in development
