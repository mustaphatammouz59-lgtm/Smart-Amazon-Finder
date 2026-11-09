import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      // Route-level suites (Stage 04.2) import route modules, which read
      // their bindings from 'cloudflare:workers'. In tests that module is
      // a local stub (tests/helpers/cloudflare-workers.ts) — no real
      // Cloudflare service is ever contacted by the test run.
      'cloudflare:workers': path.resolve(__dirname, './tests/helpers/cloudflare-workers.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
