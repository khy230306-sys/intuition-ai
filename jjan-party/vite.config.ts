import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
})
