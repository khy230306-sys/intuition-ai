# Translation provider setup

## Current (wired) — waterfall

| Order | Provider | Where | Needs |
|-------|----------|--------|--------|
| 1 | Offline phrase dict + prior cache | `src/offlineDict.ts` | none (airplane OK) |
| 2 | MyMemory | `src/translate.ts` `translateOnline` | network |
| 3 | Hybrid LLM (Gemini / OpenAI / …) | `src/translateHybrid.ts` | API key in settings |
| 4 | Partial offline glue / clear error | — | never invents text |

Successful online/Hybrid hits are cached so the same sentence works offline later.

## User action

- Travel/daily short phrases: work with **no data**
- Free-form sentences: connect **Gemini** (or other Hybrid provider) in settings, or translate once online to seed cache
- Dedicated DeepL / Google Cloud Translate via server proxy remains optional future work
