# AIZIO Preview deploy notes

**Does not change:** https://jarvis-app.shipstatic.com

## Navigation v2 Preview (this branch)

| Field | Value |
| --- | --- |
| REVIEW_URL | https://spatial-pulse-m3o6tgj.shipstatic.com |
| HOME v2 (default) | https://spatial-pulse-m3o6tgj.shipstatic.com |
| Navigation direct | https://spatial-pulse-m3o6tgj.shipstatic.com/?nav=1 |
| Legacy home | https://spatial-pulse-m3o6tgj.shipstatic.com/?home=legacy |
| 손님관리 | https://spatial-pulse-m3o6tgj.shipstatic.com/?customers=1 |
| Production | https://jarvis-app.shipstatic.com → still `adaptive-echo-t118nxm` (unchanged) |

Previous previews: https://hyper-cluster-i63ofol.shipstatic.com · https://encoded-mesh-r5a5fkf.shipstatic.com · https://infused-whirl-dpn0rm4.shipstatic.com

## Commands

```bash
cd Jarvis
# optional push server bake-in
PUSH_SERVER_URL=https://<your-render>.onrender.com npm run deploy:preview
```

**Forbidden for this task:** `npm run deploy:web` (production).

## Feature flags on Preview

- Default HOME = v2
- 길안내 → **AIZIO internal Navigation v2** (MapLibre)
- External maps only via secondary 「다른 지도에서 열기」
- Place search = local Korea catalog unless remote URL configured
