# AIZIO Offline-First Architecture

## Problem

With mobile data and Wi-Fi both off, opening the installed AIZIO home-screen icon showed Safari’s **“페이지를 열 수 없음”**. Local features (calendar, todos, notes, offline phrase translation) never got a chance to run because the **app shell itself did not load**.

### Root causes

1. **Service worker unregister on update/refresh** — `clearAppCaches()` previously called `registration.unregister()`. After an update while online, going offline left the PWA with **no controlling SW**, so Safari had nothing to serve.
2. **Relative `start_url` / `scope` (`./`)** — less reliable for iOS standalone relaunch than absolute `/` + `/?source=pwa`.
3. **Conflicting navigate `NetworkFirst` runtime route** — competed with Workbox `NavigationRoute` / `navigateFallback` and did not guarantee a precached `index.html` when the runtime page cache was cold.
4. **No offline readiness UI** — users could not tell whether the shell was actually cached.

## Solution (v1.21.0)

| Layer | Behavior |
| --- | --- |
| Precache | Workbox `globPatterns` for js/css/html/icons/svg/woff2/webmanifest; `cacheId: aizio-shell-<version>` |
| Navigation | `navigateFallback: index.html` + denylist (API, JSON probes, assets, map hosts) |
| SW extras | `importScripts: push-handler.js, offline-shell.js` (push preserved; shell verify via `postMessage`) |
| Update path | Cache Storage cleared **without** unregistering SW (unregister only on stuck recovery) |
| Manifest | `id`, `start_url: /?source=pwa`, `scope: /`, maskable icons |
| Client | Network probe (`build-meta` health), offline strip, settings → 오프라인 사용, outbox, language-pack registry |
| Warm | Client `warmAppShell()` supplements precache after `onOfflineReady` / online |

## Request routing

- **Document navigation** → cached `index.html` (Workbox NavigationRoute)
- **JS/CSS/icons** → precache / cache-first assets
- **`build-meta.json`** → NetworkOnly (never stale version lie)
- **Map tiles / `.pbf`** → NetworkOnly (no bulk offline tile store)
- **Push** → unchanged `push-handler.js`

## Local data

Existing stores (settings, chat, life OS, family/friends, offlineDict cache) remain on-device. Outbox (`aizio.offline.outbox.v1`) records offline mutations with idempotency keys and drains on reconnect.

## Offline translation

- **Built-in phrase packs** (ko↔en/vi/ja/zh/…) via `offlineDict` — real offline
- **Neural language-pack engine** — UI shows “엔진 준비 필요”; **no fake translations**

## Security

Cache Storage must not hold API keys, VAPID private keys, auth tokens, or full contact dumps. Diagnostics remain redacted.
