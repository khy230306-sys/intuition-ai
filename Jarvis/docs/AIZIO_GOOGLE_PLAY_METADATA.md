# AIZIO Google Play Metadata — Draft

**App:** AIZIO (아이지오)  
**Version under doc:** 1.15.0  
**Distribution today:** PWA https://jarvis-app.shipstatic.com  

> **Packaging NOT done.** No AAB/APK upload, no Play listing published.  
> Play Console internal testing requires a **Google Play Console** developer account — **User-only**.

---

## Store listing (draft)

| Field | Draft |
|-------|-------|
| **App name** | AIZIO |
| **Short description** (≤80) | 아이지오 — 말로 쓰는 AI 생활 비서. 키는 기기에만. |
| **Short description (EN)** | AIZIO — voice AI assistant. Your keys stay on device. |
| **Full description** | See EN/KO drafts below |
| **App category** | Productivity |
| **Tags** | AI, assistant, notes, reminders, voice |
| **Contact email** | **User-only** (owner) |
| **Privacy Policy URL** | **User-only** (must host before publish) |
| **External URL** | https://jarvis-app.shipstatic.com |

---

## Full description (EN draft)

AIZIO (아이지오) helps with everyday chat, voice commands, local notes and todos, family/friends spaces, invest helpers, and an offline arcade.

Install today as a Progressive Web App at https://jarvis-app.shipstatic.com — or use a future Android wrapper when packaging is complete.

**Highlights**
- Text & voice assistant funnel
- Hybrid AI: OpenRouter, Gemini, Groq, OpenAI — **your** keys in Settings
- Local-first data (localStorage). **No cloud account sync.**
- Chat Web Push client for family/friends (permission + OS dependent)
- No ads. No Play Billing IAP.

**Limitations (honest)**
- Personal reminders: reliable while the app is open. **Closed-app personal push is not complete** (needs a push server).
- Music opens external YouTube / music apps; in-app “playing” is not faked.
- AI free tiers have quotas; ChatGPT Plus is not the same as OpenAI API billing.

---

## Full description (KO draft)

AIZIO(아이지오)는 일상 대화·음성·로컬 메모/할 일·가족·친구 공간·투자 보조·오프라인 게임을 한곳에서 돕는 비서입니다.

지금은 https://jarvis-app.shipstatic.com PWA로 사용합니다. Play용 AAB 패키징은 **아직 완료되지 않았습니다**.

**특징**
- 텍스트·음성 비서
- Hybrid AI (OpenRouter / Gemini / Groq / OpenAI) — **본인 키**를 설정에 입력
- 데이터는 기기 우선. **클라우드 계정 동기화 없음**
- 가족/친구 채팅 Web Push 클라이언트 (권한·OS에 따름)
- 광고 없음 · Play 인앱결제 없음

**한계**
- 개인 알림: 앱 실행 중 확실. **앱 종료 개인 푸시 미완성**
- 음악은 외부 앱으로 열림
- 무료 AI 한도 있음. ChatGPT Plus ≠ API 결제

---

## Graphics checklist (assets **not** produced)

| Asset | Spec (typical) | Done? |
|-------|----------------|-------|
| App icon | 512×512 | [ ] (reuse PWA 512 as source) |
| Feature graphic | 1024×500 | [ ] |
| Phone screenshots | ≥2 | [ ] Chat, Settings AI, Life, Games |
| 7" / 10" tablet | optional | [ ] |
| Promo video | optional | [ ] |

Shot list aligns with `AIZIO_APP_STORE_METADATA.md`.

---

## Data safety form (draft answers)

| Question | Draft answer |
|----------|--------------|
| Collects user data? | Limited device-local + optional peer chat + optional AI provider traffic |
| Encrypted in transit? | HTTPS for network calls |
| Users can request deletion? | Clear local/site data; no cloud account to delete |
| Data shared with third parties? | Only when user uses AI providers / peers / push services |
| Ads? | No |
| IAP / paid app? | Free; external AI billing optional |

---

## Content rating (draft)

- Questionnaire: mild user-generated chat, web links, no gambling, no violence focus  
- Expect mature guidance around AI chat — confirm in IARC questionnaire before submit  

---

## AAB / packaging notes

| Topic | Status / note |
|-------|----------------|
| Current ship form | Vite PWA + service worker (Workbox) |
| Play **AAB** | **NOT done** — requires wrapper (e.g. TWA / Capacitor) + signing |
| `applicationId` | TBD by owner when packaging |
| Version code / name | Align with `package.json` `1.15.0` when first binary ships |
| Network security | HTTPS only to known hosts; user custom AI base URL is advanced |
| Background restrictions | Do not claim closed personal reminder push until server exists |
| Notification permission (Android 13+) | Runtime; explain chat notifications honestly |
| Digital Asset Links (TWA) | Needed if Trusted Web Activity — **Missing** until chosen |
| Play App Signing | **User-only** in Play Console |
| Internal testing track | **User-only** — needs Play Console account |
| Closed / open testing → Production | After internal sign-off + real-device matrix |

### Packaging owner checklist

- [ ] Create Play Console app listing (draft)
- [ ] Choose TWA vs Capacitor vs other
- [ ] Generate upload key / enroll Play App Signing
- [ ] Build **AAB** (not just PWA zip)
- [ ] Privacy Policy URL attached
- [ ] Data safety form submitted
- [ ] Internal testers invited
- [ ] No store text claiming cloud sync or finished closed-app personal push

---

## Countries / pricing

| Item | Draft |
|------|-------|
| Distribution | All countries owner enables |
| Price | Free |
| Ads | None |
| Billing | None in Play Billing |

---

## Related

- `AIZIO_STORE_READINESS.md`
- `AIZIO_PRIVACY_CHECKLIST.md`
- `AIZIO_RELEASE_CHECKLIST.md`
- `AIZIO_REAL_DEVICE_MASTER_TEST.md`
