import type { Config } from '@react-router/dev/config'

export default {
  // Server-side rendering is required by the Stage 00 architecture
  // (SEO-STRATEGY.md §1). SPA mode is NOT supported by the Cloudflare
  // Vite plugin and must never be enabled for this project.
  ssr: true,
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config
