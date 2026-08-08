import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
})
