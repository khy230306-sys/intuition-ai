# AIZIO Preview deploy notes

**고정 앱 주소 (항상 이것만 사용):** https://jarvis-app.shipstatic.com

> 다른 `*.shipstatic.com` Preview 스냅샷은 무료 플랜에서 곧 삭제됩니다.  
> 삭제된 주소를 열면 **흰 화면 404 — "The requested path could not be found."** 가 나옵니다.

## Navigation v2 Preview (v1.20.9 · hash routing)

| Field | Value |
| --- | --- |
| REVIEW_URL | https://electric-bead-noe597o.shipstatic.com |
| Version | 1.20.9 |
| HOME v2 (default) | https://electric-bead-noe597o.shipstatic.com |
| 길안내 (hash) | https://electric-bead-noe597o.shipstatic.com/#navigation |
| Legacy home | https://electric-bead-noe597o.shipstatic.com/?home=legacy |
| Production | https://jarvis-app.shipstatic.com (v1.20.8 · SPA rewrites) |

**Dead (do not open):** `infused-whirl-…` · `galactic-neon-…` · `pulsing-bloom-…` · `melded-tide-…` · `baseless-bolt-…` · `charged-point-…` — all return ShipStatic platform 404.

## 404 root cause (fixed in Preview)

1. Expired Preview snapshot URL → platform 404 (white page).
2. Pathname `/navigation` on rewrite-less hosts + Vite `base: './'` → broken assets / 404.

**Fix:** stay on `/` and use `#navigation` (see `src/appRouting/`). `public/ship.json` SPA rewrites included.

## Commands

```bash
cd Jarvis
PUSH_SERVER_URL=https://<your-render>.onrender.com npm run deploy:preview
```

Production promote (needs `SHIP_API_KEY`, user approval):

```bash
cd Jarvis && npm run deploy:web
```

**Share only** https://jarvis-app.shipstatic.com after promote — never random snapshot URLs.
