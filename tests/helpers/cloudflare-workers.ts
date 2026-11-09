/**
 * Test stub for the `cloudflare:workers` module (aliased in
 * vitest.config.ts for the whole test run). Route modules import
 * `import { env } from 'cloudflare:workers'`; in tests that binding is
 * this mutable object, which each suite populates with the sqlite D1
 * adapter, the local JWKS coordinates, rate-limiter stubs and an
 * in-memory R2 bucket. Nothing here touches a real Cloudflare service.
 */
export const env: Record<string, unknown> = {}

/** Replace the stub env contents (called per suite/test setup). */
export function setStubEnv(values: Record<string, unknown>): void {
  for (const key of Object.keys(env)) delete env[key]
  Object.assign(env, values)
}

/** A rate-limiter binding stub whose verdict a test can flip. */
export function rateLimiterStub(state: { success: boolean }): {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
  keys: string[]
} {
  const keys: string[] = []
  return {
    keys,
    limit: async (options: { key: string }) => {
      keys.push(options.key)
      return { success: state.success }
    },
  }
}

/** In-memory R2 bucket stub covering the surface app/lib/media.ts uses. */
export function memoryR2Bucket(): {
  objects: Map<string, { body: Uint8Array; contentType?: string }>
  put: (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>
  get: (key: string) => Promise<{ body: Uint8Array; httpMetadata?: { contentType?: string }; size: number } | null>
  delete: (key: string) => Promise<void>
} {
  const objects = new Map<string, { body: Uint8Array; contentType?: string }>()
  return {
    objects,
    put: async (key, value, options) => {
      objects.set(key, { body: value, contentType: options?.httpMetadata?.contentType })
      return { key, size: value.byteLength }
    },
    get: async (key) => {
      const hit = objects.get(key)
      if (!hit) return null
      return { body: hit.body, httpMetadata: { contentType: hit.contentType }, size: hit.body.byteLength }
    },
    delete: async (key) => {
      objects.delete(key)
    },
  }
}
