# AIZIO Navigation v2 — Architecture

**Version:** 1.16.0  
**Scope:** Preview only — production (`jarvis-app.shipstatic.com`) unchanged.

## What AIZIO provides (in-app)

| Layer | Implementation |
| --- | --- |
| UI | `src/navigationV2/ui/NavigationScreen.ts` — search, candidates, route preview, turn-by-turn sheet |
| Intent | `navigationIntent.ts` — place vs chat vs context commands |
| Context | `navigationContext.ts` — short-lived session (candidates, mode, route, step) |
| Controller | `navigationController.ts` — chat/voice entry; **never** auto-opens external maps |
| Map | MapLibre GL JS via `mapController.ts` |
| Search | `placeSearchService.ts` + Preview Korea catalog |
| Routing | `routingService.ts` — OSRM adapter + approximate fallback |
| Privacy | `navigationPrivacy.ts` + diag snapshot without coordinates |

HOME v2 **길안내** opens the internal Navigation view via **hash routing** (`#navigation`, optional `?q=`), never pathname `/navigation` (ShipStatic + `base:'./'` asset break / 404). Legacy deep links `?nav=1` / `?view=navigation` still work and are rewritten to `#navigation`.

## External map apps (secondary only)

Legacy builders in `src/navigation/` remain for:

- Settings → 「다른 지도에서 열기」 defaults
- Navigation screen 「다른 지도에서 열기」
- Explicit user utterances naming 카카오맵 / T맵 / 네이버 / Apple / Google

They are **not** the default path for 「역삼동으로 안내해줘」.

## Providers (env-swappable)

| Concern | Env keys | Preview default |
| --- | --- | --- |
| Map tiles / style | `VITE_AIZIO_MAP_STYLE_URL` | OpenFreeMap dark style |
| Attribution | `VITE_AIZIO_MAP_ATTRIBUTION` | OSM · OpenFreeMap |
| Place search | `VITE_AIZIO_PLACE_SEARCH_PROVIDER`, `VITE_AIZIO_PLACE_SEARCH_URL` | Local Korea catalog (remote off by default) |
| Routing | `VITE_AIZIO_ROUTING_PROVIDER`, `VITE_AIZIO_ROUTING_URL` | public OSRM when reachable, else approximate |

See `AIZIO_NAVIGATION_V2_PROVIDER_SETUP.md`.

## Supported now (Preview)

- Short place queries → 3–10 candidates (catalog)
- Nearby category search (pharmacy, parking, …) with radius expand in catalog
- Candidate select + context («두 번째», «자동차로»)
- Driving / walking / cycling route geometry
- In-app route line + guidance UI + Web Speech cues
- Off-route detect + recalculate hook
- Chat place cards + «지도에서 보기»
- AI failure messages separated from nav errors

## Not supported / not claimed

- Live national Korean POI search (catalog only unless remote provider configured)
- Real-time traffic
- Transit routing as a first-class mode
- Background GPS with screen fully off (PWA limitation — document only)
- Real-device moving turn-by-turn verification (pending)

## Module map

```
src/navigationV2/
  types.ts
  navigationIntent.ts
  navigationContext.ts
  navigationController.ts
  placeSearchService.ts
  koreaPlaceCatalog.ts
  routingService.ts
  geolocationService.ts
  mapController.ts
  navigationStorage.ts
  navigationPrivacy.ts
  ui/NavigationScreen.ts
```

Legacy v1 external handoff: `src/navigation/` (kept, checkpointed — not deleted).
