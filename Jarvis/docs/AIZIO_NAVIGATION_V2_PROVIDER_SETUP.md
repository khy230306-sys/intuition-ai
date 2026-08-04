# AIZIO Navigation v2 — Provider setup

## Preview (current)

| Service | Default | Notes |
| --- | --- | --- |
| Tiles | `https://tiles.openfreemap.org/styles/dark` | Dev/Preview only — do not treat as unlimited production CDN |
| Place search | Local `koreaPlaceCatalog.ts` | UI labels **로컬 카탈로그** — not live national search |
| Routing | `https://router.project-osrm.org` | Best-effort; falls back to approximate geometry |
| Geocoding remote | Off unless URL set | No keystroke autocomplete against public Nominatim |

## Environment variables

Prefix with `VITE_` for client builds.

```bash
VITE_AIZIO_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/dark
VITE_AIZIO_MAP_ATTRIBUTION=© OpenStreetMap · OpenFreeMap
VITE_AIZIO_PLACE_SEARCH_PROVIDER=catalog   # or remote
VITE_AIZIO_PLACE_SEARCH_URL=               # self-hosted Nominatim/Pelias JSON API
VITE_AIZIO_ROUTING_PROVIDER=osrm           # or approx
VITE_AIZIO_ROUTING_URL=https://router.project-osrm.org
```

## Public service abuse prevention

Place search applies:

- Minimum query length
- 300–500ms debounce (Navigation screen)
- AbortController cancel
- In-memory cache + remote rate gap
- Remote only when `allowRemote` + URL configured (chat path keeps remote off by default)

**Do not** wire public Nominatim to every keystroke.

## Production recommendations

Before promoting beyond Preview:

1. **Tiles:** paid / self-hosted vector tiles (MapLibre-compatible) with proper attribution  
2. **Places:** self-hosted Nominatim or Pelias, or a licensed Korean geocoder  
3. **Routing:** self-hosted Valhalla (preferred) or OSRM — not the public demo server  
4. Confirm ToS, User-Agent, and rate limits for every upstream  

## Failure UX (separated from AI)

- Map tile failure → map area message  
- Place search failure → search-specific copy  
- Routing failure → route-specific copy  

Never: 「현재 AI가 연결되지 않았습니다」 for these paths.
