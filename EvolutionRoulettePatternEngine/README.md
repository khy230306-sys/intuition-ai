# Evolution Roulette Pattern Engine V1

Pattern detection → betting state machine → martingale → rest → replay → site adapter.

**This is not a guaranteed-profit system.** European Roulette RED/BLACK is disadvantaged by ZERO; martingale does not improve expected value. The program is a tool for pattern detection, execution, statistics, backtesting, and risk management.

## Quick start

```bash
cd EvolutionRoulettePatternEngine
npm install
npm test
npm run dev
```

Open http://127.0.0.1:8787

Default login: `admin` / `admin123` (change after first login)

Default mode: **DRY_RUN** (no real chip clicks)

## Architecture

```
src/
 ├─ core/
 │   ├─ roulette/     colors, history, result
 │   ├─ patterns/     PatternEngine, rules/, Pattern Builder rules
 │   ├─ betting/      BettingEngine, MartingaleEngine, RestEngine
 │   ├─ state/        BettingStateMachine
 │   ├─ session/      ReplaySimulator (no look-ahead)
 │   └─ stats/
 ├─ adapters/evolution/
 ├─ auth/
 ├─ admin/ (via API + UI)
 ├─ ui/public/
 └─ server/
```

## Built-in Pattern Rules (V1)

1. **Same Color / Reverse** — configurable min streak 2–10, bet opposite on/off
2. **Same Color → Change → Entry** — configurable run / changes / entryOffset / betMode
3. **Alternating** — RBRB / BRBR, optional continue-until-loss
4. **Repeating Block** — detects historical block reappearance
5. **Custom Pattern Builder** — JSON patterns, unlimited count, hot-reload

Photo patterns not fully visible (remaining of the “24 figures”) are **not hard-coded**. Add them via Pattern Builder when you have confirmation.

## Tests

```bash
npm test
```

Includes: color map, ZERO, history, same-color, alternating, repeating block, pattern builder, martingale, rest, duplicate round, no-lookahead, replay, state machine.

## Portable / Windows

```bash
npm run build
npm run package:portable
```

Output:

- `dist-portable/RoulettePatternEngine/` — portable folder
- `dist-portable/RoulettePatternEngine-portable.zip`
- `RoulettePatternEngine.exe` when `pkg` cross-build succeeds; otherwise `start.bat` + Node.js 20+

## Evolution adapter

Uses Playwright against **your** logged-in Chrome session (CDP). No CAPTCHA/2FA/detection bypass.

## Disclaimer

House edge exists. Use at your own risk. Obey local laws and site terms.
