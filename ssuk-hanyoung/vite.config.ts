import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages: /intuition-ai/ssuk-hanyoung/
  base: process.env.GH_PAGES === '1' ? '/intuition-ai/ssuk-hanyoung/' : '/',
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
