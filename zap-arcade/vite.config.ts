import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages: https://khy230306-sys.github.io/intuition-ai/zap/
  base: process.env.VITE_BASE || '/',
  server: {
    host: true,
    allowedHosts: true,
  },
})
