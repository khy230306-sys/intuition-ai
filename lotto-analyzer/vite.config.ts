import { defineConfig } from 'vitest/config'

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
  test: {
    globals: false,
    environment: 'node',
  },
})
