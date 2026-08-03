# AIZIO Release Checklist

**App:** AIZIO (아이지오) v1.15.0  
**Live URL:** https://jarvis-app.shipstatic.com  
**Stack:** Vite PWA · localStorage · Web Push (chat client) · guest local userId  

> Gates before calling a build “releasable.”  
> **Production deploy requires user approval** — do not run `npm run deploy:web` (or equivalent) without explicit owner OK.

---

## 0. Hard rules (do not skip)

| Rule | Status gate |
|------|-------------|
| No fake “submitted to App Store / Play” | Packaging **NOT done** |
| No claim “closed-app personal push done” | **Missing** (needs server) |
| No claim “cloud account sync” | **Missing** |
| Production deploy | **User approval required** |
| TestFlight / Play internal | **User-only** (Apple / Google developer accounts) |

---

## 1. Pre-release engineering

| # | Gate | Pass? | Notes |
|---|------|-------|-------|
| 1.1 | `package.json` version = intended release (e.g. 1.15.0) | [ ] | |
| 1.2 | `npm test` green | [ ] | |
| 1.3 | `npm run build` green | [ ] | |
| 1.4 | Version badge / UI shows correct version | [ ] | |
| 1.5 | No secrets in git / bundle (API keys, `.ship-api-key` not published) | [ ] | |
| 1.6 | Service worker + `push-handler.js` present in build | [ ] | |
| 1.7 | PWA manifest name **AIZIO**, icons 192/512 | [ ] | |
| 1.8 | Backup export strips API keys | [ ] | |
| 1.9 | Hybrid AI: paid auto-fallback default **off** | [ ] | |
| 1.10 | Honest empty states for unavailable skills | [ ] | |

---

## 2. Product honesty review

| # | Claim check | Pass? |
|---|-------------|-------|
| 2.1 | README / store drafts do not invent store approval | [ ] |
| 2.2 | Personal reminder closed-app = not finished | [ ] |
| 2.3 | Guest userId ≠ logged-in cloud sync | [ ] |
| 2.4 | Music = external open, not fake playback confirm | [ ] |
| 2.5 | Chat push described as Partial / OS-dependent | [ ] |

---

## 3. Privacy & legal (owner)

| # | Gate | Pass? | Owner |
|---|------|-------|-------|
| 3.1 | Privacy Policy URL live | [ ] | User-only |
| 3.2 | Support / contact path | [ ] | User-only |
| 3.3 | `AIZIO_PRIVACY_CHECKLIST.md` signed | [ ] | |
| 3.4 | Permissions copy matches mic / notify / camera / location | [ ] | |

---

## 4. Device QA

| # | Gate | Pass? | Ref |
|---|------|-------|-----|
| 4.1 | iPhone Safari + home-screen matrix filled | [ ] | `AIZIO_REAL_DEVICE_MASTER_TEST.md` |
| 4.2 | Android Chrome + home-screen matrix filled | [ ] | same |
| 4.3 | Critical fails triaged (P0 blockers listed) | [ ] | |
| 4.4 | Cloud Agent gaps labeled “실기기 미확인” where untested | [ ] | |

---

## 5. Deploy gate (PWA)

| # | Gate | Pass? | Notes |
|---|------|-------|-------|
| 5.1 | **User explicitly approves production deploy** | [ ] | **Required** |
| 5.2 | Deploy target confirmed: `https://jarvis-app.shipstatic.com` | [ ] | Not random anon URL |
| 5.3 | Post-deploy smoke: open URL, version badge, SW update path | [ ] | |
| 5.4 | ShipStatic snapshot hygiene (free plan limits) understood | [ ] | |

```text
Blocked without approval:
  npm run deploy:web
```

---

## 6. Store packaging gate (optional track)

| # | Gate | Status |
|---|------|--------|
| 6.1 | iOS metadata draft reviewed | See `AIZIO_APP_STORE_METADATA.md` |
| 6.2 | Play metadata + AAB notes reviewed | See `AIZIO_GOOGLE_PLAY_METADATA.md` |
| 6.3 | IPA / AAB built & signed | **NOT done** until owner packages |
| 6.4 | TestFlight upload | **User-only** — Apple Developer |
| 6.5 | Play internal testing | **User-only** — Play Console |
| 6.6 | Store submit | Only after 6.3–6.5 — **not claimed** |

---

## 7. Rollback / incident

| # | Plan | Ready? |
|---|------|--------|
| 7.1 | Know previous good ShipStatic snapshot / commit | [ ] |
| 7.2 | Users can clear site data / reinstall PWA | [ ] |
| 7.3 | Compromised AI key → revoke guide (`AIZIO_API_KEY_USER_GUIDE.md`) | [ ] |

---

## Sign-off

| Role | Name | Date | Approve prod deploy? (Y/N) |
|------|------|------|----------------------------|
| Engineer | | | |
| Product owner | | | **Must be Y to deploy** |

---

## Quick link index

| Doc | Purpose |
|-----|---------|
| `AIZIO_STORE_READINESS.md` | Scorecard |
| `AIZIO_PRIVACY_CHECKLIST.md` | Privacy / ads / payments |
| `AIZIO_API_KEY_USER_GUIDE.md` | User key entry |
| `AIZIO_APP_STORE_METADATA.md` | iOS listing draft |
| `AIZIO_GOOGLE_PLAY_METADATA.md` | Play listing + AAB notes |
| `AIZIO_REAL_DEVICE_MASTER_TEST.md` | Hardware matrix |
| `AIZIO_FULL_CURRENT_STATE.md` | Feature inventory |
| `AIZIO_PUSH_NOTIFICATION_ARCHITECTURE.md` | Push honesty |
