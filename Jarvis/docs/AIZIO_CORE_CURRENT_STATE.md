# AIZIO Core Brain — Current State (pre-implementation)

Snapshot before Core Brain work. Checkpoint: `checkpoint/pre-core-brain-1.10.5` @ `4e4d355`.

## Project

| Item | Value |
|------|--------|
| Path | `/workspace/Jarvis` |
| Package | `aizio-iphone@1.10.5` |
| Brand | AIZIO / 아이지오 (`src/brand.ts`) |
| Branch | `cursor/iphone-jarvis-6b16` |
| Entry | `index.html` → `src/main.ts` |
| Deploy | `npm run deploy:web` → https://jarvis-app.shipstatic.com |

## Baseline (pre-work)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | pass |
| `npm test` | 34 files / 170 tests pass |
| `npm run build` | pass |
| lint script | **none** in package.json |

## Existing feature list & entry functions

| Feature | Entry | Notes |
|---------|-------|--------|
| Chat UI + send | `handleUserText` (`main.ts`) | → `think` |
| Voice → text | MIC `onFinal` / `consumeTranscript` → `handleUserText` | same funnel |
| Brain router | `think` (`brain.ts`) | large ordered pipeline |
| AI Engine | `runAiEngine` (`ai/aiEngine.ts`) | via `callCloudLLM` |
| System prompt | `buildSystemPrompt` (`ai/promptBuilder.ts`) | |
| Music | `tryHandleMusicSkill` (`music/musicSkill.ts`) | |
| Translate / interpret | `handleTranslate` (`translateBrain.ts`) | lock until 스톱 |
| Lifestyle recommend | `detectLifestyleRecommend` | food/travel/… |
| Stock recommend | `wantsStockRecommend` / `handleInvest` | |
| Life (todos, memory, shop…) | `handleLife` | |
| Geo / weather / location | `handleGeo`, `replyWeather`, `getLocationReport` | |
| Stats | `handleStats` | |
| Family / friends rooms | inline in `think` | |
| Settings | `loadSettings` / `saveSettings` | `jarvis_settings_v1` |
| Chat history | `jarvis_chat_v1` | |
| i18n | `src/i18n/*` | ko/en/ja/vi/zh |
| PWA / SW | `vite-plugin-pwa` | |

## Reusable modules

- `src/music/*`, `src/translateBrain.ts`, `src/ai/*`
- `src/storage.ts` (memory, reminders, settings — **do not rename keys**)
- `src/actions.ts` (maps/search/openApp)
- `src/lifestyleRecommend.ts`, `src/spokenCommand.ts`
- `BrainReply` shape in `types.ts`

## Duplicate / overlapping command handling

- Music: classifier in music skill + possible AI fallback
- Weather/time: `detectEverydayIntent` early + again in `handleLife`
- Meals: lifestyle food vs `handleLife` mealIdea
- Stock “추천” vs lifestyle (fixed in 1.10.5)

## Core Brain connection point

**Single funnel:** `handleUserText` → **`think`**.

Wire Core Brain at the start of `think` (or as `think` wrapper). Do **not** rewrite `main.ts` chat UI. Voice already shares `handleUserText`.

## Do not modify (risk areas)

- Chat UI / mic / TTS wiring in `main.ts`
- Storage key names / backup schema
- Service worker / PWA install-update flow
- Deploy URL / `deploy-fixed.mjs`
- Family/friends P2P sync internals
- Interpret-mode lock ordering semantics
- Existing music provider safety (no fake streams)

## Not implemented today (must not fake success)

| Capability | Status |
|------------|--------|
| Personal project tracker (“NEXUS”) | **missing** |
| Full personal calendar CRUD | **partial** (family/friends events + holidays only) |
| Dedicated “notes” app | **partial** (memory/journal keys) |
| Image analysis skill | **missing** |
| Payment / OAuth / external messaging automation | **out of scope** |

## Intent handling today

Ordered local regex/handlers inside `think`, then `callCloudLLM` if API key present. No shared Skill Registry yet.
