import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  preview: {
    host: true,
    allowedHosts: true,
  },
  server: {
    host: true,
    allowedHosts: true,
  },
})
