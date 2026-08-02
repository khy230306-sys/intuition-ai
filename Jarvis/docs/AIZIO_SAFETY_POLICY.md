# AIZIO Core Brain — Safety Policy

## Levels

| Level | Examples | Behavior |
|-------|----------|----------|
| **1** | chat, translate, music search/play prep, list notes/todos/calendar, navigate, help | Execute immediately |
| **2** | create note/todo, open settings, external app open (existing actions) | Allowed under current app policies |
| **3** | payment, transfers, password/API key handling, mass delete, auto orders | **Blocked** — never auto-run |

Level-3 patterns are matched in `safetyPolicy.ts` (`결제`, `송금`, `비밀번호`, …).

## UI / URL rules

- Only allowlisted `UiAction` types
- `OPEN_EXTERNAL_URL` hosts must pass `isAllowedExternalUrl` (YouTube, Google, Spotify, Apple Music, deploy host, …)
- No arbitrary script execution

## Honesty

Unavailable Skills return `status: unavailable` and clear Korean/English copy — never “추가했습니다” when nothing was stored.
