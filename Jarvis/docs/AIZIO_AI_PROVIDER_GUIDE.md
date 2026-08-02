# AIZIO Hybrid AI Provider Guide

AIZIO (`아이지오`) uses a **Hybrid AI Provider System** so the app is not locked to one paid API.

## Three layers

1. **Local** — notes, todos, calendar, reminders, relationships, settings, music local commands (no API key)
2. **Free AI** — OpenRouter / Gemini / Groq (your own free-tier keys; limits apply)
3. **Paid AI** — OpenAI / custom OpenAI-compatible (only when you choose)

## What is an API key?

A secret string from an AI provider that proves the request is yours.  
AIZIO stores keys **only on your device**. Do not share keys. Operator keys are never bundled into the app.

## Free vs paid

| Provider | Category | Notes |
|----------|----------|--------|
| OpenRouter | Free-start | Default model `openrouter/free` (limits apply) |
| Gemini | Free-start | Google AI Studio key; quota changes over time |
| Groq | Free-start | Fast OpenAI-compatible API |
| OpenAI | Paid usage | ChatGPT Plus ≠ API billing |
| Custom | Usually paid | Your own base URL |

Free tiers are **not unlimited**. Limits change with provider policy.

## How to connect

1. Open **설정 → AI 연결 (Hybrid Provider)**
2. Pick a provider → open signup link → create key
3. Paste key → choose model → **설정 저장**
4. Optional: **연결 테스트**

### Signup pages

- OpenRouter: https://openrouter.ai/keys
- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys
- OpenAI: https://platform.openai.com/api-keys

## Modes

- **자동 선택** — free providers in order: OpenRouter → Gemini → Groq
- **특정 Provider 고정** — only the chosen provider
- **유료 자동 폴백** — off by default; must be enabled explicitly

## Without AI

You can still use schedules, reminders, family memory, notes, todos, projects, and settings.
