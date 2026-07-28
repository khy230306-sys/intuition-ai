import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// NEXUS FOUR FINAL PWA + 앱 기본 설정
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      // dist 빌드에서 service worker를 생성/주입하기 위해 manifest와 기본 precache만 사용합니다.
      // (정교한 offline fallback은 dist 산출물 기준으로 서비스 워커 캐시 정책으로 동작)
      manifest: {
        name: 'NEXUS FOUR FINAL',
        short_name: 'NEXUS FOUR',
        description: '바카라 결과 수집/분석 + 멀티 엔진 성과 비교 + 마틴 시스템',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
          },
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
          },
        ],
      },
    }),
  ],
})
