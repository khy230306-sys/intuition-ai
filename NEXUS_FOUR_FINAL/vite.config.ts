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
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 모바일/터널(loca.lt 등)에서 접속 가능하도록 허용
    allowedHosts: true,
    // 앱(5173)과 같은 호스트로 WebSocket을 열어 모바일/클라우드 포트포워딩에서도 스캐너 연동이 되게 함
    proxy: {
      '/scanner-ws': {
        target: 'ws://127.0.0.1:8765',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scanner-ws/, ''),
      },
    },
  },
})
