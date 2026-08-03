# AIZIO App Store Metadata (iOS) — Draft

**App:** AIZIO (아이지오)  
**Version under doc:** 1.15.0  
**Distribution today:** PWA https://jarvis-app.shipstatic.com  

> **Packaging NOT done.** No IPA, no App Store Connect upload, no TestFlight build claimed.  
> TestFlight / App Store require an **Apple Developer Program** account — **User-only**.

---

## Listing fields (draft)

| Field | Draft (EN) | Draft (KO) |
|-------|------------|------------|
| **Name** | AIZIO | AIZIO (아이지오) |
| **Subtitle** (≤30) | Voice AI life assistant | 말로 쓰는 AI 생활 비서 |
| **Promotional text** (optional) | Add your own free AI keys. Local notes & reminders stay on device. | 내 AI 키로 대화. 메모·할 일은 기기에 저장. |
| **Category** | Productivity | 생산성 |
| **Secondary** | Utilities | 유틸리티 |
| **Age rating (draft)** | 12+ | 12세 이상 (설문 확정 필요) |
| **Price** | Free | 무료 |
| **IAP** | None | 없음 |

---

## Description (EN draft)

AIZIO (아이지오) is a personal AI assistant you can install from the web as an app-like experience.

**What you can do**
- Chat by text or voice for everyday help
- Local notes, todos, habits, and open-app reminders
- Family & friends shared spaces (invite code; peer sync when online)
- Invest helpers (quotes, portfolio notes — not financial advice)
- Offline mini-games arcade
- Optional Hybrid AI: connect **your** OpenRouter, Gemini, Groq, or OpenAI keys in Settings

**Honest limits**
- Data stays on your device (localStorage). There is **no cloud account sync**.
- Personal reminders are reliable while the app is open. Closed-app personal push needs a future server and is **not** complete.
- Family/friends chat may use Web Push when permitted; delivery depends on iOS / Safari.
- Music opens external apps/sites — AIZIO does not fake “now playing.”

**Privacy**
- API keys are entered in Settings only and stay on device.
- No ads. No in-app purchases. Provider AI usage is billed by the provider you choose.

---

## Description (KO draft)

AIZIO(아이지오)는 말로 쓰는 일상 AI 비서입니다. 웹에서 홈 화면에 추가해 앱처럼 사용할 수 있습니다.

**할 수 있는 일**
- 텍스트·음성 대화
- 기기 안의 메모·할 일·습관·앱이 열려 있을 때 알림
- 가족/친구 공간 (초대 코드, 온라인 시 P2P 동기화)
- 투자 보조 (시세·기록 — 투자 조언 아님)
- 오프라인 미니게임
- 설정에서 **본인** OpenRouter / Gemini / Groq / OpenAI 키 연결

**솔직한 한계**
- 데이터는 기기 localStorage. **클라우드 계정 동기화 없음**.
- 개인 알림은 앱이 열려 있을 때 확실. **앱 종료 후 개인 푸시는 미완성**.
- 채팅 Web Push는 권한·OS에 따라 다를 수 있음.
- 음악은 외부 앱/사이트로 열림 (가짜 “재생됨” 표시 없음).

**개인정보**
- API 키는 설정에만 입력, 기기에 보관.
- 광고 없음, 인앱결제 없음. AI 사용료는 각 제공사 정책.

---

## Keywords (draft, comma-separated, ≤100 chars total when trimmed)

```
AI,assistant,voice,reminder,notes,productivity,PWA,chat,translator,아이지오
```

Refine to App Store Connect 100-character keyword field rules before submit.

---

## What’s New (1.15.0 draft)

- Life OS local foundations (DNA, goals, ideas, projects) on device  
- Guest local userId foundation (no login yet)  
- Hybrid AI provider settings polish  
- Honest push architecture docs (chat client vs personal closed push)

---

## Screenshots — shot list (assets **not** captured)

| # | Scene | Orientation | Needed |
|---|-------|-------------|--------|
| 1 | Chat home + brand | 6.7" / 6.5" / 5.5" | [ ] |
| 2 | Voice / MIC composer | same sizes | [ ] |
| 3 | Settings → AI 연결 (masked key) | | [ ] |
| 4 | Life / todos | | [ ] |
| 5 | Family or friends space | | [ ] |
| 6 | Invest quotes | | [ ] |
| 7 | Arcade / 지오대시 | | [ ] |
| 8 | Dark atmospheric UI (safe area) | | [ ] |

**Do not** overlay fake “Synced to cloud” or “Push always works offline” badges.

---

## App Privacy answers (draft map)

| Type | Linked to user? | Used for tracking? | Notes |
|------|-----------------|--------------------|-------|
| Contact Info | No account | No | Optional display name local |
| User Content | Local / peer chat | No | Not AIZIO cloud |
| Identifiers | Guest local IDs | No | Foundation only |
| Usage Data | No analytics SDK claimed | No | |
| Diagnostics | Optional browser only | No | |

Update when packaging wraps the PWA.

---

## Packaging status

| Step | Status |
|------|--------|
| Metadata draft (this file) | **Draft** |
| Xcode / Capacitor project shippable | **NOT done** |
| Icons / launch screen for App Store | PWA icons exist; store set **NOT done** |
| Archive → Upload → TestFlight | **User-only** (Apple Developer) |
| Submit for Review | **NOT done** — do not claim |

### Owner checklist

- [ ] Apple Developer enrollment
- [ ] Privacy Policy URL + Support URL live
- [ ] Screenshots exported at required sizes
- [ ] Age questionnaire completed
- [ ] Copy reviewed for no overclaim (sync / closed personal push)
- [ ] Binary packaging path chosen and built
