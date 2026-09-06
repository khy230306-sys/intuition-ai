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
    port: 5180,
  },
  preview: {
    host: '0.0.0.0',
    port: 4180,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  plugins: [
    {
      name: 'campus-version-html',
      transformIndexHtml(html) {
        return html.replaceAll('%APP_VERSION%', APP_VERSION)
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.svg', 'splash.svg'],
      manifest: {
        name: 'AIZIO CAMPUS',
        short_name: 'CAMPUS',
        description: 'AI 대학생활 비서 · 시간표 · 강의노트 · 과제 · 시험 · Quiz',
        theme_color: '#0a1220',
        background_color: '#0a1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        lang: 'ko',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
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
        // Keep build-meta.json out of precache so version probes always hit the network.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/build-meta.json'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Always try network first for document navigations so deploys win over precache.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'campus-html-nav',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 86_400 },
            },
          },
          // Version probe must never be served from Cache Storage.
          {
            urlPattern: /\/build-meta\.json(?:\?.*)?$/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
