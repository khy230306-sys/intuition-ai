# AIZIO Preview deploy notes

**Does not change:** https://jarvis-app.shipstatic.com

## Fixed Preview URL (always)

| Field | Value |
| --- | --- |
| REVIEW_URL (fixed) | https://light-lab.shipstatic.com |
| Production | https://jarvis-app.shipstatic.com (untouched by `deploy:preview`) |

`npm run deploy:preview` uploads a new snapshot, then **repoints** `light-lab.shipstatic.com` to it — the public Preview address never changes.

> ShipStatic rejects deployment-ID hostnames (e.g. `light-lab-92m8bq7.shipstatic.com`) as platform domains. That bookmark is a one-shot snapshot; in-app **앱 업데이트** on that host migrates to `https://light-lab.shipstatic.com` in one shot.

## Commands

```bash
cd Jarvis
# optional push server bake-in
PUSH_SERVER_URL=https://<your-render>.onrender.com npm run deploy:preview
```

**Forbidden for this task:** `npm run deploy:web` (production) unless the owner explicitly approves.

## Feature flags on Preview

- Default HOME = v2
- 길안내 → **AIZIO internal Navigation v2** (MapLibre)
- External maps only via secondary 「다른 지도에서 열기」
- Place search = local Korea catalog unless remote URL configured
