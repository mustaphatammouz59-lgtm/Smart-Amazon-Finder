import { ApiError } from './api'

/**
 * Rate limiting foundation (Stage 03.2; budgets from API-ARCHITECTURE.md
 * §2 and SECURITY-PLAN.md §6).
 *
 * Backend: Cloudflare's native Workers Rate Limiting bindings
 * (`ratelimits` in wrangler.jsonc) — platform-managed counters, NOT
 * in-memory Worker state, so limits survive isolate churn. Bindings are
 * declared as configuration; the platform provisions them at deploy.
 *
 * HONEST LIMITATION: the native binding counts per Cloudflare location
 * (colo-local counters), so the effective global ceiling is the budget
 * multiplied by the number of locations serving traffic — this is
 * abuse damping, not a strict global quota. A strict global limiter
 * would require a Durable Object per key class (future hardening).
 *
 * Keys: public endpoints key on CF-Connecting-IP — the header set by
 * Cloudflare's edge (client-supplied forwarding headers are ignored;
 * at the edge CF overwrites CF-Connecting-IP with the real client IP).
 * Admin endpoints key on the VERIFIED admin identity (per-admin budget),
 * never on client-supplied data.
 *
 * If a binding is absent (e.g. an environment that has not deployed the
 * config), the check logs and allows the request: rate limiting is
 * availability protection layered UNDER authentication/RBAC, and failing
 * closed here would take the API down for a config omission. The
 * absence is loud in logs, never silent.
 */

export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export const RATE_LIMITS = {
  /** Public search/discovery: 60 requests per minute per IP. */
  search: { binding: 'SEARCH_RATE_LIMITER', periodSeconds: 60 },
  /** Admin writes: 120 requests per minute per verified admin. */
  adminWrite: { binding: 'ADMIN_RATE_LIMITER', periodSeconds: 60 },
} as const

export function clientIpKey(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown-client'
}

export async function enforceRateLimit(
  env: unknown,
  kind: keyof typeof RATE_LIMITS,
  key: string,
): Promise<void> {
  const config = RATE_LIMITS[kind]
  const binding = (env as Record<string, unknown> | null)?.[config.binding] as RateLimiterBinding | undefined
  if (!binding || typeof binding.limit !== 'function') {
    console.error(JSON.stringify({ rateLimit: 'binding-missing', binding: config.binding }))
    return
  }
  const { success } = await binding.limit({ key: `${kind}:${key}` })
  if (!success) {
    throw new ApiError(
      'RATE_LIMITED',
      'Too many requests. Please retry shortly.',
      undefined,
      config.periodSeconds,
    )
  }
}
