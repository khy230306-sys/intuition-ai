# Translation provider setup

## Current (wired)

| Provider | Where | Auth |
|----------|--------|------|
| Offline phrase dict + cache | `src/offlineDict.ts` | none |
| MyMemory | `src/translate.ts` `translateOnline` | public endpoint, rate-limited |

No OpenAI key is required for room message translation.

## Future adapters (not connected)

- Dedicated DeepL / Google Cloud Translate via **server proxy** (do not put secret keys in `VITE_` / client bundle)
- Can plug into `globalChat/translationService.ts` behind the same `translateChatMessage` interface

## User action required

- None for basic MyMemory/offline path
- For paid APIs: add server-side proxy + keys (user must supply keys; never commit them)
