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
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
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
      includeAssets: [
        'icons/*.png',
        'favicon.svg',
        'splash.svg',
        'offline.html',
        'offline-shell.js',
        'push-handler.js',
      ],
      manifest: {
        id: '/?source=pwa',
        name: 'AIZIO',
        short_name: 'AIZIO',
        description: '아이지오 AIZIO — iPhone 만능 AI 비서 · 오프라인 셸, 번역 잠금, 음성, 생활',
        theme_color: '#0b121c',
        background_color: '#0b121c',
        display: 'standalone',
        orientation: 'portrait',
        // Absolute root paths — more reliable for iOS home-screen offline launch than './'
        start_url: '/?source=pwa',
        scope: '/',
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
        cacheId: `aizio-shell-${APP_VERSION}`,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        globIgnores: ['**/build-meta.json', '**/quote-snapshot.json', '**/ship.json'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /\/build-meta\.json$/i,
          /\/quote-snapshot\.json$/i,
          /\/preview-config\.json$/i,
          /\/ship\.json$/i,
          /\/offline-shell\.js$/i,
          /\/push-handler\.js$/i,
          /\.(?:png|jpg|jpeg|gif|webp|svg|js|css|woff2?|json|pbf|mvt)(\?|$)/i,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        ignoreURLParametersMatching: [
          /^utm_/,
          /^fbclid$/,
          /^_ship$/,
          /^_v$/,
          /^_t$/,
          /^_check$/,
          /^_bid$/,
          /^_update$/,
          /^source$/,
          /^_health$/,
        ],
        // push first, then offline navigation last-resort + verify messages
        importScripts: ['push-handler.js', 'offline-shell.js'],
        runtimeCaching: [
          {
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
            // Map tiles / vector — network only, never SPA fallback, no bulk cache
            urlPattern: ({ url }) =>
              /tile|mapbox|openstreetmap|maplibre|protomaps/i.test(url.hostname) ||
              /\.(pbf|mvt)(\?|$)/i.test(url.pathname),
            handler: 'NetworkOnly',
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
