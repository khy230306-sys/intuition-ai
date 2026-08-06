# AIZIO Preview deploy notes

**Does not change:** https://jarvis-app.shipstatic.com

## Fixed Preview URL (always)

| Field | Value |
| --- | --- |
| REVIEW_URL (fixed) | https://lightlab-92m8bq7.shipstatic.com |
| Alias | https://light-lab.shipstatic.com |
| Production | https://jarvis-app.shipstatic.com (untouched by `deploy:preview`) |

`npm run deploy:preview` uploads a new snapshot, then **repoints** both fixed Preview domains to it — the public Preview address never changes.

### Home-screen install

Add the home-screen icon from **https://lightlab-92m8bq7.shipstatic.com** (same origin).  
Then 「앱 업데이트」 clears SW/cache and reloads that same fixed host in one shot.

> ShipStatic rejects deployment-ID hostnames (e.g. `light-lab-92m8bq7.shipstatic.com`) as platform domains.  
> That bookmark is a one-shot snapshot. Use **`lightlab-92m8bq7`** (hyphen after `light` removed) as the fixed Preview.  
> Old hyphenated icons: open the fixed URL in Safari → 홈 화면에 다시 추가 → 이전 아이콘 삭제.

## Commands

```bash
cd Jarvis
# optional push server bake-in
PUSH_SERVER_URL=https://<your-render>.onrender.com npm run deploy:preview
```

**Forbidden for this task:** `npm run deploy:web` (production) unless the owner explicitly approves.
