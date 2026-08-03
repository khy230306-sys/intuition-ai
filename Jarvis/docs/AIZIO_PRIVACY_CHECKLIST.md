# AIZIO Privacy Checklist

**App:** AIZIO (아이지오) v1.15.0  
**Live PWA:** https://jarvis-app.shipstatic.com  
**Audience:** Store review + internal release gates

> Local-first PWA. No operator cloud account sync. No ads. No in-app payments.  
> Closed-app **personal** push is **not** complete (needs server). Chat Web Push is client-side only.

---

## 1. Data inventory

| Data | Where stored | Leaves device? | Notes |
|------|--------------|----------------|-------|
| Chat history, notes, todos, habits, expenses | `localStorage` | No (unless user exports) | Device-local |
| Smart reminders | `localStorage` + in-page timers | No schedule cloud | Fire while app/document alive |
| Relationships / family-friends room data | local + P2P when online | Peers only (MQTT/WebRTC) | No AIZIO account server |
| AI provider API keys | Device (`localStorage`, obfuscated) | Sent only to **user-chosen** provider APIs | Never paste in chat |
| Guest `userId` / `deviceId` | local foundation | No cloud login | Sync across devices = **Missing** |
| Push subscription (chat) | Browser Push Service | Endpoint keys for Web Push | Chat channel only |
| Life OS DNA / goals / health logs | local | No | Consent map for sensitive domains |
| Backup JSON | User-chosen share/download | User exports | API keys stripped from export |

---

## 2. Permissions checklist

| Permission | Why | Required? | Store disclosure tip |
|------------|-----|-----------|----------------------|
| Microphone | Voice STT | Optional | “음성 입력용. 거부해도 텍스트 사용 가능” |
| Notifications | Chat push + open-app reminders | Optional | “가족/친구 채팅 알림. 개인 종료 푸시는 미완성” |
| Camera | Invite QR scan | Optional | Friends/family invite only |
| Location | Weather / nearby helpers | Optional | “거부해도 오프라인 계속” |
| Speech recognition / synthesis | STT / TTS | Optional | OS / browser Web Speech |
| Network | AI providers, quotes, P2P, push | Partial offline OK | Disclose third-party AI when user adds keys |

### Checklist

- [ ] Permission prompts happen on **user action** (not cold start spam)
- [ ] Deny paths still allow core local features
- [ ] Store “Data Safety / Privacy Nutrition” answers match this table
- [ ] Do **not** claim always-on location or background mic

---

## 3. Third parties

| Party | When contacted | Data sent |
|-------|----------------|-----------|
| OpenRouter / Gemini / Groq / OpenAI / custom | User configured AI chat | Prompt text + key (user’s) |
| Yahoo / quote sources | Invest quotes when online | Symbol requests |
| MyMemory (etc.) | Translation helpers | Text to translate |
| MQTT / WebRTC peers | Family/friends rooms | Room messages among peers |
| Browser push services (FCM/APNs via browser) | Chat Web Push | Push payload for chat |
| ShipStatic host | App assets | Static hosting only |

### Checklist

- [ ] No hidden analytics SDK claimed without evidence
- [ ] No shared “company AI key” baked into the binary/bundle
- [ ] Listing copy: user AI keys stay on device; usage billed by provider

---

## 4. Data deletion & export

| Action | Status | How |
|--------|--------|-----|
| Clear chat history | **Ready** | Settings / 대화 초기화 |
| Delete per-item notes/reminders/etc. | **Ready** | In-UI delete |
| Delete API key per provider | **Ready** | Settings → 키 삭제 |
| Export backup | **Partial** | Settings backup share/download (secrets stripped) |
| Import backup | **Partial** | Local restore |
| Full “delete my cloud account” | **N/A** | No cloud account |
| Wipe all localStorage in one tap | **Partial / OS** | Browser site data clear / reinstall PWA; confirm UX before store claim |
| Opt out of chat push | **Partial** | OS notification settings + in-app notification toggles |

### Checklist

- [ ] Privacy policy explains: uninstall / clear site data removes local data
- [ ] Export does **not** include raw API keys
- [ ] Do not promise server-side deletion of account data that does not exist

---

## 5. Children / age

| Item | Guidance |
|------|----------|
| Target | General productivity; not designed as a kids app |
| COPPA / kids category | **Do not** market as under-13 |
| Suggested age | **12+** (draft) — review Apple/Google questionnaires for user-generated chat + web links |
| Unsupervised child use | Discourage sharing API keys / payment methods on shared devices |

### Checklist

- [ ] Age rating questionnaire answered honestly (chat, web access, no gambling IAP)
- [ ] No “Made for Kids” / Designed for Families claim unless intentionally rebuilt

---

## 6. Ads

| Item | Status |
|------|--------|
| Ad networks / banners / rewarded ads | **None** |
| Personalized ads ID | **N/A** |

### Checklist

- [ ] Store answers: “No ads”
- [ ] Do not add ad SDKs without updating this checklist

---

## 7. Payments

| Item | Status |
|------|--------|
| Apple IAP / Google Play Billing | **None** |
| Subscription inside AIZIO | **None** |
| User-paid AI APIs | External (OpenRouter, OpenAI, etc.) — user manages billing on provider sites |
| ChatGPT Plus ≠ OpenAI API | Disclose in Settings / user guide |

### Checklist

- [ ] Listing: “Purchases of AI API usage happen outside the app with your own keys”
- [ ] No fake “Premium unlock” UI without real IAP (none today)

---

## 8. Sensitive domains (Life OS)

| Domain | Rule |
|--------|------|
| DNA / health / finance logs | Local; consent map `aizio_life_consent_v1` |
| Medical diagnosis claims | Blocked / softened in policy helpers |
| Passwords, card numbers, API keys in DNA | Forbidden extract patterns |
| Emergency | Panel + dial intent only — **no auto-call** |

### Checklist

- [ ] Store medical/finance claims stay “user-entered logs,” not clinical devices
- [ ] Push bodies avoid sensitive medical/financial detail when push exists

---

## 9. Store privacy artifacts (owner)

| Artifact | Status |
|----------|--------|
| Public Privacy Policy URL | **User-only** — must host before submit |
| Public Terms / Support URL | **User-only** |
| App Privacy (Apple) answers | Fill from §1–§7 |
| Data safety (Play) answers | Fill from §1–§7 |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Product owner | | | |
| Reviewer | | | Confirm no overclaim on sync / closed push |
