import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { allowedHosts: ['localhost', '127.0.0.1', '.e2b.app'] },
  plugins: [
    react(),
    // Dev/build uses the Workers config; wrangler.jsonc stays Pages-only.
    cloudflare({ configPath: 'wrangler.dev.jsonc', viteEnvironment: { name: 'worker' } }),
  ],
  environments: {
    worker: { build: { sourcemap: true } },
  },
})
