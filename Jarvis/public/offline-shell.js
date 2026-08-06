/* global self, caches */
/**
 * Offline shell helpers loaded via Workbox importScripts (after push-handler.js).
 * Message API for shell verification. Navigation fallback is handled by Workbox
 * navigateFallback + clientsClaim; we intentionally do NOT add a second fetch
 * respondWith (avoids “RespondWith already called” races).
 */
;(function () {
  async function matchIndex() {
    var keys = await caches.keys()
    var candidates = ['index.html', './index.html', '/index.html', 'offline.html', './offline.html']
    for (var i = 0; i < keys.length; i++) {
      var cache = await caches.open(keys[i])
      for (var j = 0; j < candidates.length; j++) {
        var hit = await cache.match(candidates[j], { ignoreSearch: true })
        if (hit) return hit
      }
      try {
        var abs = await cache.match(new URL('index.html', self.registration.scope).href, {
          ignoreSearch: true,
        })
        if (abs) return abs
      } catch (e) {
        /* ignore */
      }
    }
    return null
  }

  async function verifyShell() {
    var index = await matchIndex()
    var keys = await caches.keys()
    return {
      ok: Boolean(index),
      cacheCount: keys.length,
      hasIndex: Boolean(index),
      scope: (self.registration && self.registration.scope) || '',
      at: new Date().toISOString(),
    }
  }

  self.addEventListener('message', function (event) {
    var data = event.data
    if (!data || data.type !== 'aizio-offline') return
    var port = event.ports && event.ports[0]
    var reply = function (payload) {
      try {
        if (port) port.postMessage(payload)
        else if (event.source) event.source.postMessage(payload)
      } catch (e) {
        /* ignore */
      }
    }
    if (data.action === 'verify-shell') {
      event.waitUntil(
        verifyShell().then(function (result) {
          reply({ type: 'aizio-offline', action: 'verify-shell-result', result: result })
        }),
      )
      return
    }
    if (data.action === 'skip-waiting') {
      self.skipWaiting()
      reply({ type: 'aizio-offline', action: 'skip-waiting-done' })
    }
  })
})()
