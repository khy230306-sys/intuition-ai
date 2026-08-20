import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5175 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
