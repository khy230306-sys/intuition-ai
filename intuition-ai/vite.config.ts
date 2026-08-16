import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5175,
  },
  preview: {
    host: '0.0.0.0',
    port: 4175,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
