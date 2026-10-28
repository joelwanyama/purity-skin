import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    clearMocks: true,
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
})
