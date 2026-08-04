# AIZIO API Key User Guide

**App:** AIZIO (아이지오) v1.15.0  
**Settings path:** 하단 탭 **설정** → **AI 연결 (Hybrid Provider)**  
**Live PWA:** https://jarvis-app.shipstatic.com

> Keys stay **on your device** (`localStorage`). AIZIO does **not** ship an operator shared key.  
> **Never paste API keys in the chat box.** Use Settings only.

---

## Why a key?

| Without key | With your key |
|-------------|---------------|
| Notes, todos, open-app reminders, music open, arcade, local skills | Freer / longer AI chat via your chosen provider |
| Weather / quotes when network works | Hybrid auto-fallback across free providers (if configured) |

Free tiers are **not unlimited**. Limits change with each provider’s policy.

---

## Free vs paid (quick map)

| Provider | Free-start? | Notes |
|----------|-------------|-------|
| **OpenRouter** | Yes (limits) | Default model often `openrouter/free` |
| **Gemini** | Yes (limits) | Google AI Studio key; quotas change |
| **Groq** | Yes (limits) | Fast OpenAI-compatible API |
| **OpenAI** | No (usage billing) | **ChatGPT Plus ≠ API billing** |
| **Custom** | Usually paid | Your own OpenAI-compatible base URL |

**유료 자동 폴백** is **off by default**. Paid OpenAI is only used when you enable it / select it.

---

## Where to get keys

| Provider | Signup / keys page |
|----------|--------------------|
| OpenRouter | https://openrouter.ai/keys |
| Gemini | https://aistudio.google.com/apikey |
| Groq | https://console.groq.com/keys |
| OpenAI | https://platform.openai.com/api-keys |

### Checklist — getting a key

- [ ] Create/sign in on the provider site (your own account)
- [ ] Create a new secret key
- [ ] Copy once; store in a password manager if needed
- [ ] Do **not** post the key in chat, Discord, GitHub, screenshots, or backups you share

---

## How to enter keys in AIZIO

1. Open https://jarvis-app.shipstatic.com (or home-screen AIZIO).
2. Tap **설정**.
3. Find **AI 연결 (Hybrid Provider)**.
4. Pick a provider card (OpenRouter / Gemini / Groq / OpenAI / Custom).
5. Optional: open **키 발급 페이지 열기** link from the card.
6. Paste the key into **API Key** (password field).  
   - If a key already exists, leaving the field blank **keeps** the old key.
7. Choose **Model** (or enter a custom model ID).
8. Tap **설정 저장**.
9. Tap **연결 테스트** to verify.
10. Optional: **기본으로 사용** / mode **자동 선택** (free order: OpenRouter → Gemini → Groq).

First-run wizard **「무료 AI로 시작」** jumps to the same Settings area.

### Checklist — entering safely

- [ ] Key entered in **Settings**, never in chat
- [ ] Masked key shown after save (full secret not displayed)
- [ ] Connection test succeeds **or** error is readable (invalid key vs quota)
- [ ] Paid auto-use remains off unless intentionally enabled
- [ ] On a shared phone: delete key before handing device over (**키 삭제**)

---

## Modes (Settings)

| Mode | Behavior |
|------|----------|
| **자동 선택** | Tries free providers in order |
| **특정 Provider 고정** | Only the chosen provider |
| **유료 자동 폴백** | Off by default — must enable explicitly |

---

## Security (honest)

| Protection | Reality |
|------------|---------|
| Keys on device only | Yes — not synced to an AIZIO cloud account (**no cloud account sync**) |
| Obfuscation at rest | Helps casual peek; **not** server-grade vault |
| Backup export | Strips API keys (metadata `hasKey` only) |
| Logs | Secrets redacted |

If a key leaks: **revoke** it on the provider console and create a new one.

### Checklist — if exposed

- [ ] Revoke old key at provider
- [ ] Create new key
- [ ] Paste new key in Settings → save → test
- [ ] Delete old key from password managers / notes

---

## Troubleshooting

| Symptom | Try |
|---------|-----|
| “키 없음” / guides to Settings | Add at least one free provider key |
| Invalid key | Re-copy key; trim spaces; regenerate |
| Rate limit / quota | Wait, switch provider, or check provider dashboard |
| Payment required | Add billing at provider **or** stay on free providers |
| Works on Safari tab but not home screen | Re-open PWA; confirm same origin `jarvis-app.shipstatic.com` |

---

## In-app help shortcuts

Chat / chips:

- `사용설명서`
- `API 키`
- `도움말`

Also see: `AIZIO_AI_PROVIDER_GUIDE.md`, `AIZIO_API_KEY_SECURITY.md`, `AIZIO_FREE_AI_LIMITS.md`.
