# AIZIO Navigation v2 — Real device test plan

**Status:** 실제 이동 검증 대기 (fixed-position / Preview automation only so far)

## Fixed-position checks (Preview)

- [ ] HOME v2 → 길안내 → internal map (no Kakao auto-open)
- [ ] Search `역삼동` → multiple candidates + catalog label
- [ ] Select candidate → route preview (driving / walking)
- [ ] Start guidance UI + speech (if voice enabled)
- [ ] Deny location → distance copy without fake km ranking
- [ ] Chat `역삼동` → place cards, not AI-offline message
- [ ] `두 번째` / `자동차로` context
- [ ] 「다른 지도에서 열기」 only on explicit secondary action
- [ ] Android back / iPhone safe area
- [ ] `/#navigation` deep link (never pathname `/navigation` — ShipStatic 404)
- [ ] `?nav=1` migrates to `/#navigation`

## Moving vehicle / walking checks (required before “complete”)

**Do not mark turn-by-turn complete until these pass on device.**

| Step | iPhone | Android |
| --- | --- | --- |
| Location allow | | |
| Candidate → route | | |
| Guidance while moving | | |
| Next-turn distance updates | | |
| Off-route recalculate | | |
| Background / screen lock behavior (document if unsupported) | | |
| Return to app mid-guidance | | |

## PWA limits

Continuous tracking with the screen fully off is **not** guaranteed in Safari/Chrome PWA. UI must not claim always-on background navigation.

## Result log template

```
Device:
OS / browser:
Preview URL:
Fixed-position: PASS/FAIL
Moving TT: PENDING/PASS/FAIL
Notes:
```
