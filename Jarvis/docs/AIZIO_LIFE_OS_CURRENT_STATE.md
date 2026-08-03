# AIZIO Life OS — Current State (pre-work)

**Checkpoint commit:** `020a65dd63ae0ff5580d4246e0224dbab52d00e5` → actual `020a65dd63ae0ff5580d4246e0224dbab52d00e6`  
**Branch:** `cursor/aizio-life-os-6b16` (from `main`)  
**App version before work:** `1.13.7`  
**ZIP backup:** `/tmp/cursor/artifacts/aizio-life-os-checkpoint-20260803-073404.zip`

## Baseline verification (pre-change)

| Check | Result |
| --- | --- |
| Unit tests | 228 passed / 44 files |
| `tsc --noEmit` | pass |
| Production build | pass |
| Main bundle | `index-D2TrPKE_.js` ≈ **647,946** bytes |

## Architecture snapshot

- **Entry:** `src/main.ts` (PWA SPA, view-based routing — not React Router)
- **Brain:** `src/brain.ts` → `processCoreBrain` (`src/core-brain/`) then legacy handlers
- **Skills:** static registry `src/core-brain/skillRegistry.ts` + lazy adapters
- **AI providers:** `src/ai-providers/` (OpenRouter / Gemini / Groq / OpenAI / custom)
- **Storage:** **localStorage only** (no app IndexedDB). Workbox may use idb for SW caches only.
- **Family sync:** MQTT / Trystero P2P (`familySync.ts`, `friendsSync.ts`) — local + optional peer
- **i18n:** `src/i18n/` ko/en/ja/vi/zh
- **Feature flags:** none prior to Life OS
- **Project skill:** stub `available: false`
- **Deploy:** `npm run deploy:web` → fixed URL `https://jarvis-app.shipstatic.com`

## Existing life-related keys (preserve)

`jarvis_relationships_v1`, `jarvis_smart_reminders_v1`, `jarvis_memory_v1`, `jarvis_reminders_v1`, shopping/expenses/habits/journal, settings, hybrid AI, music session, family/friends rooms.

## Gaps vs Life OS vision

No DNA / goals / idea bank / AI meeting / timeline / routines / emergency mode / skill store / health-finance-travel-learning skill shells. Life tab is local checklists only.

## Policy for this work

- Additive modules under `src/life-os/`
- Wire via Core Brain skills — do not rewrite existing home/menus/providers
- Feature flags for each domain
- Production deploy requires explicit user approval for this Life OS change set
