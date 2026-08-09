# AIZIO (아이지오) — Claude Code instructions

iPhone PWA personal assistant. Main entry: `src/main.ts`. Stack: Vite + TypeScript + vitest.

## Commands (run from `Jarvis/`)

```bash
npm test                 # vitest
npm run build            # quotes + news + tsc + vite build
npm run deploy:preview   # → https://lightlab-92m8bq7.shipstatic.com
npm run deploy:web       # → https://jarvis-app.shipstatic.com
```

Always ship Preview then Production after an app change (see `DEPLOY_POLICY.md`). Never share random `*.shipstatic.com` snapshot URLs.

## Architecture (high signal)

| Area | Path |
|------|------|
| Chat / SPA shell | `src/main.ts` |
| Hybrid AI (OpenRouter, Gemini, Groq, OpenAI, **Anthropic Claude**, custom) | `src/ai-providers/` |
| Action Agent (travel/hotel/restaurant slots) | `src/actionAgent/` |
| Life OS + **Idea Bank / Claude heart** | `src/life-os/` (`ideas/ideaBrain.ts`) |
| Command router | `src/commandRouter/` |
| Nav / home v2 | `src/navShell/`, `src/homeV2/` |

## Ideas · Claude 심장 (in-app)

- Prefer Anthropic → OpenRouter Claude → other hybrid → local scaffold
- Utterances: `아이디어 발전시켜줘`, `아이디어 만들어줘`, `브레인스토밍`
- Life chip: **Claude 심장**
- Settings: connect **Anthropic Claude** API key

## Conventions

- Korean UI copy for user-facing strings
- Prefer focused diffs; no drive-by refactors
- Feature branches: `cursor/<name>-6b16`
- Bump `package.json` + `src/main.ts` `APP_VERSION` together
- After deploy, commit `public/build-meta.json` sync

## Do not

- Invent fake live hotel/flight bookings when providers are DEMO
- Remount chat while `#draft` is focused (soft-patch briefing instead)
- Use `gh` to create PRs when ManagePullRequest tools exist in cloud agents

## Antigravity / Claude Code GUI

See `docs/AIZIO_CLAUDE_CODE_ANTIGRAVITY.md` — `/init`, Plan Mode, star icon flow.
After `/init`, keep this file; refine rather than wipe project facts above.
