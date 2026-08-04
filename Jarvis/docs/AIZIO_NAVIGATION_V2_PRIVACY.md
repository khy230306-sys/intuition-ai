# AIZIO Navigation v2 — Privacy

## Principles

- Current location is **not** uploaded to AIZIO servers for navigation.
- Full trip GPS traces are **not** stored by default.
- Diagnostics export must not include precise lat/lng or full home/work addresses.
- Exact coordinates are not shown unnecessarily in the UI.

## Local storage (device)

| Key | Content |
| --- | --- |
| `aizio.navV2.settings.v1` | travel mode, voice, external map default |
| `aizio.navV2.recent.v1` | recent search queries (max 10) |
| `aizio.navV2.favorites.v1` | favorite places |
| `aizio.navV2.context.v1` | short-lived session context (sessionStorage) |

Settings → 길안내: clear recent / clear all nav v2 local data.

## Diagnostics

`navV2DiagSnapshot()` exports only:

- travelMode, voiceEnabled, recentCount, favoriteCount, externalMapDefault

Helpers: `maskAddress`, `redactCoords`, `accuracyBucket` in `navigationPrivacy.ts`.

## Upstream providers

When remote search/routing is enabled, those providers receive query/coordinates under **their** policies. Prefer self-hosted services for production.
