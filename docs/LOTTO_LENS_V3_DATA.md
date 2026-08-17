# LottoLens 3.0 Data

## Source

- Primary: bundled `lotto-analyzer/src/data/draws.json` (compact rows `[round, date, n1..n6, bonus]`)
- Refresh script: `npm run fetch-data` (dhlottery, build-time)
- Runtime network fetch for draws: **not configured** (offline-first / CACHED ONLY)

## Provider

```ts
interface LottoDataProvider {
  getDraw(drawNumber: number): Promise<LottoDraw>
  getLatestDraw(): Promise<LottoDraw>
  getDrawRange(from: number, to: number): Promise<LottoDraw[]>
}
```

`BundledLottoProvider` implements this + `getAllDraws()` / `getDatasetVersion()`.

## Validation (hard reject)

- Exactly 6 main numbers
- Range 1–45, unique
- Bonus 1–45, not in mains
- Valid drawNumber / drawDate

Invalid draws never enter engines.

## Entities

Draw · NumberStatistic · Combination · UserTicket · Strategy · EnginePrediction · EnginePerformance

## Persistence

localStorage keys `lottolens.v3.*` — tickets, strategies, favorites, constraints, immutable prediction snapshots. Export/import JSON. No telemetry of ticket numbers.

## Errors / empty

- Network/cache miss messaging via `emptyDataMessage`
- No silent fake draws
