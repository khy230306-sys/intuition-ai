import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = dirname(fileURLToPath(import.meta.url))
const APP_VERSION = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).version as string

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  plugins: [
    {
      name: 'jarvis-version-html',
      transformIndexHtml(html) {
        return html.replaceAll('%APP_VERSION%', APP_VERSION)
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      // Do NOT precache build-meta / quote-snapshot — stale SW made "업데이트" think it was already latest.
      includeAssets: ['icons/*.png', 'favicon.svg', 'splash.svg'],
      manifest: {
        name: 'AIZIO',
        short_name: 'AIZIO',
        description: '아이지오 AIZIO — iPhone 만능 AI 비서 · 번역 잠금, 음성, 투자, 기억',
        theme_color: '#0b121c',
        background_color: '#0b121c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        lang: 'ko',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Bump when shell routing changes so old SW caches cannot keep a platform 404.
        cacheId: `aizio-shell-${APP_VERSION}`,
        // js/css/html/icons only — never precache build-meta.json (version checks must hit network)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/build-meta.json', '**/quote-snapshot.json', '**/ship.json'],
        navigateFallback: 'index.html',
        // Never treat APIs / map tiles / JSON probes as SPA navigations.
        navigateFallbackDenylist: [
          /^\/api\//,
          /\/build-meta\.json$/i,
          /\/quote-snapshot\.json$/i,
          /\/preview-config\.json$/i,
          /\/ship\.json$/i,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // ShipStatic injects ?_ship=<snapshot>; hard-refresh uses _v/_t/_bid.
        // Do NOT ignore _nocache — version probes rely on a non-ignored param.
        ignoreURLParametersMatching: [
          /^utm_/,
          /^fbclid$/,
          /^_ship$/,
          /^_v$/,
          /^_t$/,
          /^_check$/,
          /^_bid$/,
          /^_update$/,
        ],
        importScripts: ['push-handler.js'],
        runtimeCaching: [
          {
            // Always fetch live version / build id from the network
            urlPattern: ({ url }) => /\/build-meta\.json$/i.test(url.pathname),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => /\/quote-snapshot\.json$/i.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quote-snapshot',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
          {
            // Prefer fresh HTML so home-screen PWAs pick up new hashed asset URLs
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aizio-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
