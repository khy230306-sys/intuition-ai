# AIZIO Real Device Master Test

**App:** AIZIO (아이지오) v1.15.0  
**URL:** https://jarvis-app.shipstatic.com  
**Devices:** iPhone Safari (홈 화면 추가) · Android Chrome (홈 화면 추가)

> Cloud Agent cannot fill **Actual**. Leave blank until hardware QA.  
> Closed-app **personal** push is expected to **fail / not fire** without a push server — mark honestly.  
> TestFlight / Play internal builds are **User-only** (Apple / Google developer accounts) and are **out of scope** until packaging exists. This matrix is for the **live PWA**.

**Tester:** _______________ **Date:** _______________ **Build/version seen:** _______________

---

## How to use

1. Install/open from the fixed URL only.  
2. For each row: run **Method**, compare to **Expected**, write **Actual**, mark **Pass/Fail**.  
3. Log **Errors** (console / OS dialog). Check **Screenshot?** when visual proof helps.  
4. P0 fails block release; P2 can defer with notes.

**Pass/Fail values:** `P` · `F` · `N/A` · `Blocked`

---

## A. iPhone Safari / Home Screen PWA

| ID | Area | Method | Expected | Actual | Pass/Fail | Errors | Screenshot? |
|----|------|--------|----------|--------|-----------|--------|-------------|
| i-01 | Install | Safari → Share → 홈 화면에 추가 → open icon | Standalone AIZIO; name AIZIO | | | | [ ] |
| i-02 | Version | Open Settings / badge / about | Shows **1.15.0** (or deployed target) | | | | [ ] |
| i-03 | Mic allow | Tap MIC → Allow | STT listening; transcript → chat funnel | | | | [ ] |
| i-04 | Mic deny | Deny mic | Text chat still works; clear deny hint | | | | [ ] |
| i-05 | STT chat | Say 「고마워」 (or local hello) | Reply via local/AI path; no crash | | | | [ ] |
| i-06 | STT reminder | 「오늘 10분 뒤 알려줘」 | Reminder saved; open-app timer path | | | | [ ] |
| i-07 | TTS on | Enable speak → get reply | Audible TTS (or honest unsupported) | | | | [ ] |
| i-08 | TTS off | Disable speak | No unexpected speech | | | | [ ] |
| i-09 | Notif permission | Settings → 알림 권한 | System prompt; Allow/Deny handled | | | | [ ] |
| i-10 | Chat push — app **open** | Peer sends family/friends chat; AIZIO foreground | In-app or banner per design | | | | [ ] |
| i-11 | Chat push — **background** | Home screen; another device sends chat | May notify if subscribed; OS-dependent | | | | [ ] |
| i-12 | Chat push — **closed** | Force-quit PWA; peer sends chat | May or may not deliver on iOS; record truth | | | | [ ] |
| i-13 | Personal rem — **open** | Reminder due while app open | Notification / flash near time | | | | [ ] |
| i-14 | Personal rem — **closed** | Reminder due after force-quit | **Expect miss** without push server | | | | [ ] |
| i-15 | Music external | 「조용한 음악 틀어줘」 + gesture | Opens external app/site; no fake “재생됨” | | | | [ ] |
| i-16 | Keyboard | Focus composer | Input not covered; scroll OK | | | | [ ] |
| i-17 | Safe area | Notch / home indicator | UI not clipped; bottom tabs clear | | | | [ ] |
| i-18 | PWA update | Deployed newer build → Update / 캐시 새로고침 | New version badge after refresh path | | | | [ ] |
| i-19 | Offline | Airplane mode | Notes/todos/games/local OK; AI may fail honestly | | | | [ ] |
| i-20 | Persistence | Add note + reminder + relationship → kill → relaunch | Data still present | | | | [ ] |
| i-21 | API keys | Settings → paste test key → save → test → clear | Masked display; test OK; delete works; **not** in chat | | | | [ ] |
| i-22 | Guest userId | Inspect that app runs without login | Works offline-account-free; **no** cross-device sync | | | | [ ] |

---

## B. Android Chrome / Home Screen PWA

| ID | Area | Method | Expected | Actual | Pass/Fail | Errors | Screenshot? |
|----|------|--------|----------|--------|-----------|--------|-------------|
| a-01 | Install | Chrome → Install app / 홈 화면 추가 | Launches standalone AIZIO | | | | [ ] |
| a-02 | Version | Badge / settings | Matches deploy (e.g. 1.15.0) | | | | [ ] |
| a-03 | Mic allow | MIC → Allow | STT works | | | | [ ] |
| a-04 | Mic deny | Deny | Text path OK | | | | [ ] |
| a-05 | STT chat | Voice short chat | Reply; no crash | | | | [ ] |
| a-06 | STT reminder | Voice create reminder | Saved; open-app fire path | | | | [ ] |
| a-07 | TTS on/off | Toggle speak | Matches setting | | | | [ ] |
| a-08 | Notif permission | Android 13+ runtime prompt | Allow/Deny handled | | | | [ ] |
| a-09 | Chat push — **open** | Foreground chat from peer | Shown | | | | [ ] |
| a-10 | Chat push — **background** | App backgrounded | Web Push often works if subscribed | | | | [ ] |
| a-11 | Chat push — **closed** | Swipe away task; peer chat | Record delivery truth | | | | [ ] |
| a-12 | Personal rem — **open** | Due while open | Fires | | | | [ ] |
| a-13 | Personal rem — **closed** | Due while killed | **Expect miss** without server | | | | [ ] |
| a-14 | Music external | Play music command + gesture | External YouTube/app; no fake playing | | | | [ ] |
| a-15 | Keyboard | Composer focus | Not covered by keyboard / nav bar | | | | [ ] |
| a-16 | Safe area | Cutout / gesture bar | No clipped CTAs | | | | [ ] |
| a-17 | PWA update | New SW → update UI / relaunch | Version advances | | | | [ ] |
| a-18 | Offline | Airplane | Local features OK | | | | [ ] |
| a-19 | Persistence | Relaunch after kill | Data persists | | | | [ ] |
| a-20 | API keys | Hybrid settings test | Keys on device; masked; delete OK | | | | [ ] |
| a-21 | Battery / OEM | Optional: aggressive OEM battery saver | Note if push/timers delayed | | | | [ ] |

---

## C. Cross-cutting (either device)

| ID | Area | Method | Expected | Actual | Pass/Fail | Errors | Screenshot? |
|----|------|--------|----------|--------|-----------|--------|-------------|
| x-01 | Fixed URL | Open only jarvis-app.shipstatic.com | Not a random shipstatic snapshot | | | | [ ] |
| x-02 | No key chat | Local skills without AI key | Works; free chat guides to Settings | | | | [ ] |
| x-03 | Bad AI key | Wrong key → test | Invalid key message (not silent paid) | | | | [ ] |
| x-04 | Backup export | Export/share backup | JSON shares; **no raw API keys** | | | | [ ] |
| x-05 | Games offline | Play 지오대시 offline | Runs; scores local | | | | [ ] |
| x-06 | Invest online | Open invest quotes online | Snapshot/Yahoo path; disclaimer OK | | | | [ ] |

---

## Severity guide

| Level | Example | Release impact |
|-------|---------|----------------|
| P0 | Crash on launch, data loss, key shown in chat | Block deploy |
| P1 | Mic broken both platforms, composer covered | Block or waiver |
| P2 | TTS missing on one browser | Document |
| Expected fail | Closed personal push without server | **Not a regression** — document |

---

## Summary

| Platform | Total run | P | F | Blocked | P0 open |
|----------|-----------|---|---|---------|---------|
| iPhone | | | | | |
| Android | | | | | |

**Ship decision:** [ ] Go (PWA) · [ ] Hold · [ ] Go with known limitations listed below

**Known limitations accepted for this release:**

1. Closed-app personal reminder push — **not done**  
2. Cloud account sync — **does not exist**  
3. Store IPA/AAB — **packaging NOT done**  
4. ________________________________

**Prod deploy approved by owner?** [ ] Yes (required) · [ ] No

---

## Out of scope until packaging

| Track | Requirement | Status |
|-------|-------------|--------|
| TestFlight | Apple Developer account + IPA | **User-only** / **NOT done** |
| Play internal testing | Play Console + AAB | **User-only** / **NOT done** |

When binaries exist, clone this matrix and add wrapper-specific rows (Deep links, back button, notification channels).
