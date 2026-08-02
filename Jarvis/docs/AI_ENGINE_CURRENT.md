# JARVIS iPhone PWA — AI Engine Current State

Checkpoint: `8a0c559` · branch `cursor/iphone-jarvis-6b16` · app `jarvis-iphone@1.9.11`

## Flow

```
composer / MIC onFinal / suggest chip
  → handleUserText (main.ts)
  → pushMsg(user) + saveChat
  → think (brain.ts)
      → local handlers (weather, life, invest, family, translate, stats, …)
      → else if settings.apiKey: callCloudLLM
      → else unknown-command / STT garbage / ticker soft fallback
  → pushMsg(assistant) + optional speakAsync
```

## Cloud provider (actual)

| Item | Value |
|------|--------|
| Provider | OpenAI-compatible Chat Completions |
| Endpoint | `{apiBase}/chat/completions` |
| Default apiBase | `https://api.openai.com/v1` |
| Default model | `gpt-4o-mini` |
| Auth | `Authorization: Bearer {settings.apiKey}` |
| Streaming | No |
| Retries | None |
| Abort/timeout on fetch | None (UI think timeout 12s / 22s with key) |
| History to API | last 14 turns |
| System prompt | inline in `callCloudLLM` + `lifeContextBlock()` |

## API key

- Stored in `localStorage` (`jarvis_settings_v1`), entered in Settings UI
- Not in `VITE_*` env; not hardcoded
- Backup export strips key; import keeps device key
- **Note:** key lives in the client PWA (device-local). No server proxy yet.

## Gaps addressed by AI engine layer

1. No shared AI interface / router / provider adapter
2. No request mode (chat/coding/planning/analysis)
3. Prompt assembled ad-hoc in `callCloudLLM`
4. Context = raw `slice(-14)` only
5. No response validation
6. No fetch-level timeout / retry / cancel
7. Raw API errors shown to users
8. No structured logging that redacts secrets

## Out of scope (preserved)

UI layout, menus, family/friends, arcade, PWA install, SW, deploy URL, storage schema, voice UI.
