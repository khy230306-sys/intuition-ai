# AIZIO Life OS Architecture

**Status:** 기반 구현 완료 (v1.14.0) · 기존 앱 보존

## Placement

- Code: `src/life-os/**`
- Core Brain skill: `src/core-brain/skills/lifeOSSkillAdapter.ts` (lazy chunk)
- Flags: `aizio_life_flags_v1`
- Schema marker: `aizio_life_schema_v1`
- Storage: **localStorage** envelopes (app does not use IndexedDB for domain data)

## Principles

- Additive modules only — no rewrite of home/menus/Core Brain/providers
- Feature flags per domain
- Sensitive data blocked by `privacyPolicy.ts`
- No fake “connected” claims for GitHub / realtime family server / marketplace uploads

## World context

`lifeContext.buildLifeWorldContext()` merges DNA snippet + goal next actions + urgent project **only when data exists**.
