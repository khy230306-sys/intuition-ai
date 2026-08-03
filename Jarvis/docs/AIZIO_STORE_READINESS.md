# AIZIO Store Readiness Scorecard

**App:** AIZIO (아이지오)  
**Version:** 1.15.0  
**Live PWA:** https://jarvis-app.shipstatic.com  
**Stack:** Vite PWA · localStorage · Web Push client (chat only) · guest local `userId` foundation  
**Recorded:** 2026-08-03

> Honest status only. Store submission is **not** complete. Packaging (IPA / AAB) is **not** done.

---

## Status legend

| Label | Meaning |
|-------|---------|
| **Ready** | Implemented and usable for PWA release path |
| **Partial** | Works with known gaps / device-dependent |
| **Missing** | Not implemented or not packagable yet |
| **User-only** | Requires owner accounts, keys, OS approval, or human action |

---

## Overall scorecard

| Area | Status | Notes |
|------|--------|-------|
| Product name / branding | **Ready** | Official EN: AIZIO · KO: 아이지오 |
| Live PWA URL (HTTPS) | **Ready** | https://jarvis-app.shipstatic.com |
| Core chat + voice funnel | **Ready** | Text/voice → Core Brain (device STT/TTS **Partial**) |
| Hybrid AI providers | **Ready** | User keys in Settings; stay on device |
| localStorage data model | **Ready** | Notes, todos, reminders (open-app), Life OS local |
| Guest local `userId` | **Partial** | Foundation only — **no login, no cloud account sync** |
| Chat Web Push (family/friends) | **Partial** | Client VAPID + SW; OS/browser dependent |
| Personal reminder push (앱 종료) | **Missing** | Needs push server + schedule — **not done** |
| Cloud backup / multi-device sync | **Missing** | Export/import local only; no cloud account |
| Privacy policy (store-grade URL) | **Partial** | In-app / docs privacy notes exist; store-hosted policy page = **User-only** |
| Support URL / contact | **User-only** | Owner must publish |
| App Store Connect listing + IPA | **Missing** | Metadata draft only — packaging **NOT done** |
| Google Play listing + AAB | **Missing** | Metadata draft only — packaging **NOT done** |
| TestFlight | **User-only** | Needs Apple Developer account |
| Play internal testing | **User-only** | Needs Google Play Console account |
| Screenshots / preview video | **Missing** | Shot list drafted; assets not captured |
| Age rating questionnaire | **Partial** | Draft guidance in metadata docs |
| Ads SDK | **Ready** (N/A) | No ads |
| In-app purchases / billing | **Ready** (N/A) | No IAP; user pays providers separately |
| Real-device master test | **Partial** | Matrix ready — fill Actual on hardware |
| Production deploy gate | **User-only** | Deploy requires **user approval** |

---

## PWA vs native store packaging

| Path | Status | Checklist |
|------|--------|-----------|
| Install from Safari / Chrome (홈 화면에 추가) | **Ready** | Live URL works as PWA |
| Capacitor / WKWebView / TWA wrapper | **Missing** | Not in repo as shippable store binary |
| Signed IPA upload | **Missing** | **User-only** Apple account + packaging |
| Signed AAB upload | **Missing** | **User-only** Play account + packaging |
| Store review submission | **Missing** | Do **not** claim submitted / approved |

---

## Feature honesty (store-facing claims)

| Claim | Allowed? | Reality |
|-------|----------|---------|
| “Personal AI assistant on your phone” | Yes (with limits) | PWA + local skills |
| “Works offline for notes / games / local data” | Yes | Network needed for AI, quotes, P2P |
| “Closed-app personal reminders always notify” | **No** | Open-app timers only; closed push **Missing** |
| “Syncs your account across devices” | **No** | No cloud account sync |
| “Push for family/friends chat” | Careful | Client exists; not guaranteed on all OS states |
| “Available on App Store / Play” | **No** until listed | Packaging & submission **not done** |

---

## Blockers before any store submit

1. [ ] Choose packaging path (Capacitor / TWA / other) — currently **Missing**
2. [ ] Apple Developer Program + App Store Connect — **User-only**
3. [ ] Google Play Console — **User-only**
4. [ ] Privacy Policy URL + Support URL — **User-only**
5. [ ] Screenshots per platform size — **Missing**
6. [ ] Complete `AIZIO_REAL_DEVICE_MASTER_TEST.md` on iPhone + Android — **Partial**
7. [ ] Decide whether to ship **without** closed-app personal push (honest copy) or build push server first
8. [ ] Production deploy of the build under test — **requires user approval**

---

## Related docs

- `AIZIO_PRIVACY_CHECKLIST.md`
- `AIZIO_APP_STORE_METADATA.md`
- `AIZIO_GOOGLE_PLAY_METADATA.md`
- `AIZIO_RELEASE_CHECKLIST.md`
- `AIZIO_REAL_DEVICE_MASTER_TEST.md`
- `AIZIO_API_KEY_USER_GUIDE.md`
- `AIZIO_FULL_CURRENT_STATE.md`
- `AIZIO_PUSH_NOTIFICATION_ARCHITECTURE.md`
