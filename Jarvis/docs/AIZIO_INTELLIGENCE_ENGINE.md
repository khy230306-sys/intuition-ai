# AIZIO Intelligence Engine (AIE)

## Role

AIE is the **top-level orchestrator** above Core Brain. It does **not** replace:

- Core Brain
- Intent Router
- Skill Registry
- AI Provider Router
- Music / Schedule / Reminders / Family / DNA / Goals / Projects / Ideas / Timeline / Routine / Navigation / Life OS / Provider / existing UI

## Request flow

```
User text
  → AIE prepare (decision + action plan + optional context)
  → multi-task? sequential think(segment) 
  → else Core Brain processCoreBrain
  → else legacy think pipeline
  → AIE enrich (opt-in recommendations)
```

## Modules (`src/aie/`)

| Module | File | Job |
|--------|------|-----|
| Context Engine | `contextEngine.ts` | Single `AieContext` snapshot |
| Decision Engine | `decisionEngine.ts` | STEP1–9 focus |
| Action Planner | `actionPlanner.ts` | Split multi-intent utterances |
| Recommendation | `recommendationEngine.ts` | Proactive candidates |
| Learning | `learningEngine.ts` | Ignore / boost / forgotten DNA |
| Daily Brief | `dailyBrief.ts` | Morning / “브리핑” composition |
| Orchestrator | `orchestrator.ts` | prepare / enrich |

## Absolute rules

1. Preserve existing call paths.
2. Lazy context + 30s cache + debounce.
3. Recommendations default **OFF** (`proactiveSuggestionsEnabled`).
4. Never invent weather, prices, or commute ETA.
5. Emergency = panel / dial intent only.

## Version

`AIE_VERSION` in `src/aie/index.ts`.
