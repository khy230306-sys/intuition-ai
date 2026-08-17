# LottoLens 3.0 Architecture

## Goal

LottoLens 3.0 turns the existing Vite + Capacitor SPA into a mobile lottery **data lab**: real 6/45 history → independent engines → council → master → generator → backtest → personal tickets.

## Stack

| Layer | Choice |
|-------|--------|
| UI | Vanilla TypeScript SPA (`src/lotto/ui/app.ts`) |
| Legacy | Classic analyzer (`src/legacy/classicApp.ts`) via tab |
| Build | Vite 7 + TypeScript ~5.9 strict |
| Native | Capacitor 8 iOS (`com.aizio.lottolens`) |
| Data | Bundled `src/data/draws.json` + `BundledLottoProvider` |
| Persistence | localStorage (`lottolens.v3.*`), local-first |

## Pipeline

```
Data Layer (provider + validate)
    ↓
Feature Extraction (numberStats)
    ↓
Individual Engines (no cross-imports)
    ↓
Engine Council (vote classification)
    ↓
Master Engine (normalized weighted blend)
    ↓
Combination Generator + DNA + Coverage + Diversity
    ↓
Validation / Backtest / UI
```

## Key directories

```
src/lotto/
  data/ domain/ features/ math/
  engines/{trend,delay,cycle,pair,triple,network,structure,
           repeat,ending,gap,contrarian,random,monteCarlo,master}/
  council/ generator/ coverage/ dna/ similarity/
  backtest/ strategy/ performance/ reports/ persistence/
  workers/ ui/
```

## Extensibility

To add a new idea:

1. Implement `AnalysisEngine` under `engines/<name>/`
2. Register in `engines/index.ts` → participates in Council
3. Add weight in Master / Strategy presets
4. Backtest + Strategy Arena compare vs Random Baseline
5. After real draws, evaluate via `performance/`

## UI navigation

HOME · AI LAB · NUMBERS · GENERATOR · BACKTEST · MY LOTTO · RESEARCH · 클래식

Bottom tab bar; Research hosts relation map, strategy builder, reports, evolution.

## Non-goals / language

Analysis scores are **not** win predictions. UI copy and disclaimers reinforce statistical framing only.
