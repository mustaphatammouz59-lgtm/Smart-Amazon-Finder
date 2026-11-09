import { describe, expect, it } from 'vitest'
import { apiErrorResponse } from '../app/lib/api'
import { clientIpKey, enforceRateLimit } from '../app/lib/rate-limit'

/** Rate-limit foundation (Stage 03.2): budgets, keys, 429 envelope. */
describe('rate limiting', () => {
  const fakeEnv = (allowed: number) => {
    let count = 0
    const keys: string[] = []
    return {
      keys,
      env: {
        SEARCH_RATE_LIMITER: {
          limit: async ({ key }: { key: string }) => {
            keys.push(key)
            count++
            return { success: count <= allowed }
          },
        },
        ADMIN_RATE_LIMITER: {
          limit: async ({ key }: { key: string }) => {
            keys.push(key)
            count++
            return { success: count <= allowed }
          },
        },
      },
    }
  }

  it('allows requests within budget and blocks beyond it with RATE_LIMITED + Retry-After', async () => {
    const { env } = fakeEnv(2)
    await enforceRateLimit(env, 'search', '203.0.113.7')
    await enforceRateLimit(env, 'search', '203.0.113.7')
    const error = await enforceRateLimit(env, 'search', '203.0.113.7').catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'RATE_LIMITED', retryAfter: 60 })
    const res = apiErrorResponse(error)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    const body = (await res.json()) as { error: { code: string; requestId: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(body.error.requestId).toMatch(/^req_/)
  })

  it('keys public limits by CF-Connecting-IP only (spoofed forwarding headers ignored)', () => {
    const req = new Request('https://example.invalid/api/v1/search', {
      headers: { 'CF-Connecting-IP': '203.0.113.7', 'X-Forwarded-For': '198.51.100.99' },
    })
    expect(clientIpKey(req)).toBe('203.0.113.7')
    const bare = new Request('https://example.invalid/api/v1/search', {
      headers: { 'X-Forwarded-For': '198.51.100.99' },
    })
    expect(clientIpKey(bare)).toBe('unknown-client')
  })

  it('keys admin limits by the verified identity, namespaced per kind', async () => {
    const { env, keys } = fakeEnv(10)
    await enforceRateLimit(env, 'adminWrite', 'editor@example.invalid')
    await enforceRateLimit(env, 'search', '203.0.113.7')
    expect(keys).toEqual(['adminWrite:editor@example.invalid', 'search:203.0.113.7'])
  })

  it('logs and allows when the binding is absent (documented fail-open)', async () => {
    await expect(enforceRateLimit({}, 'search', '203.0.113.7')).resolves.toBeUndefined()
    await expect(enforceRateLimit(null, 'adminWrite', 'a@b.c')).resolves.toBeUndefined()
  })
})
