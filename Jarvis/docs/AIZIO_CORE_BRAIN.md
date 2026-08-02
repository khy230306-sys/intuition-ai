# AIZIO Core Brain

Central judgment engine for AIZIO (`아이지오`). Classifies natural-language requests, plans Skill execution, and returns a single user-facing reply — without redesigning existing UI, storage, music, translation, or deploy.

## Flow

```
User (text | voice)
  → handleUserText (main.ts)          // unchanged
  → think (brain.ts)
      → processCoreBrain (core-brain)
          → wake strip → intent → entities → plan → safety → skills → compose
      → if fallbackLegacy → existing think pipeline (invest/life/geo/AI…)
  → BrainReply → chat UI / TTS
```

## Module layout

`src/core-brain/` — independent package-style folder. Skill bodies load via dynamic `import()`.

## Connection point

Only `think()` in `brain.ts` was wrapped. Voice already shares `handleUserText` → `think`.

## Fallback policy

`general_chat`, `ask_information`, low-confidence, and failed music/translate attempts return `fallbackLegacy: true` so the pre-Core-Brain handlers remain authoritative.

## Version

Introduced in **1.11.0**. Checkpoint before work: `checkpoint/pre-core-brain-1.10.5`.
