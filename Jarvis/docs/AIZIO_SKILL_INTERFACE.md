# AIZIO Skill Interface

All Core Brain Skills share one shape (`src/core-brain/types.ts`).

## Registry entry

| Field | Meaning |
|-------|---------|
| `id` | Stable skill id (`music`, `note`, …) |
| `displayName` | User-facing label |
| `supportedIntents` | Intents this skill may receive |
| `available` | Registry flag (false → must not fake success) |
| `timeoutMs` | Per-execution deadline |
| `safetyLevel` | 1–3 (see safety policy) |
| `load()` | Dynamic import of adapter module |

## Runtime module

```ts
{
  isAvailable: () => boolean
  canHandle: (ctx) => boolean
  execute: async (ctx) => SkillResult
}
```

## SkillResult

- `success` / `status`: `completed | partial | unavailable | needs_user_action | failed | cancelled`
- `message`: user-visible text
- `speakText`: shorter TTS line
- `uiActions`: allowlisted UI hints (`OPEN_ROUTE`, `SHOW_MUSIC_PLAYER`, …)
- `brainPatch`: optional fields merged into existing `BrainReply`
- Skills **do not** mutate the DOM; UI applies `BrainReply` / `uiActions`

## Lazy loading

`skillRegistry` stores metadata only. Adapter code loads on first execute via `import('./skills/…')`.
