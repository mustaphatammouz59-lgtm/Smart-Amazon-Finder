import { ApiError } from './api'

/**
 * Cloudflare Access JWT verification (Stage 03.2 — closes audit blocker B-1).
 *
 * The admin guard NEVER trusts `Cf-Access-Authenticated-User-Email` on its
 * own. Identity is derived exclusively from a `Cf-Access-Jwt-Assertion`
 * whose RS256 signature verifies against the Access team's JWKS, with the
 * exact configured issuer and audience, and valid exp/nbf claims.
 *
 * Configuration comes only from server-side Worker vars (never from the
 * request): ACCESS_TEAM_DOMAIN (the issuer, e.g.
 * "https://example.cloudflareaccess.com") and ACCESS_AUD (the Access
 * application's audience tag). If either is unset, verification fails
 * closed: the admin API is simply unreachable.
 *
 * Implementation: Web Crypto only (Workers-compatible). The JWKS URL is
 * built from the configured issuer — arbitrary URLs are never accepted.
 * Keys are cached briefly; an unknown `kid` triggers one refresh, which
 * is what makes Access key rotation work without a redeploy.
 */

export interface AccessConfig {
  issuer: string
  audience: string
}

export function accessConfigFromEnv(env: unknown): AccessConfig | null {
  const record = env as Record<string, unknown> | null
  const issuer = record?.ACCESS_TEAM_DOMAIN
  const audience = record?.ACCESS_AUD
  if (typeof issuer !== 'string' || typeof audience !== 'string') return null
  // Stage 04.2 (F-17 minors): the loopback allowance is an EXACT host
  // check — the old prefix test also matched 'http://127.0.0.1.evil.com'.
  let issuerUrl: URL
  try {
    issuerUrl = new URL(issuer)
  } catch {
    return null
  }
  const isHttps = issuerUrl.protocol === 'https:'
  const isLoopbackDev =
    issuerUrl.protocol === 'http:' &&
    (issuerUrl.hostname === '127.0.0.1' || issuerUrl.hostname === 'localhost')
  if (!isHttps && !isLoopbackDev) return null
  if (issuer.endsWith('/') || audience.length === 0) return null
  return { issuer, audience }
}

interface AccessJwk extends JsonWebKey {
  kid?: string
}

type JwksFetcher = (url: string) => Promise<{ keys: AccessJwk[] }>

const defaultFetcher: JwksFetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
  return (await res.json()) as { keys: AccessJwk[] }
}

function base64UrlDecode(segment: string): Uint8Array {
  const b64 = segment.replaceAll('-', '+').replaceAll('_', '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeJsonSegment(segment: string): Record<string, unknown> {
  const text = new TextDecoder().decode(base64UrlDecode(segment))
  const parsed = JSON.parse(text) as unknown
  if (typeof parsed !== 'object' || parsed === null) throw new Error('segment is not an object')
  return parsed as Record<string, unknown>
}

export interface AccessVerifier {
  /** Returns the verified identity claims or throws ApiError(401). */
  verify(token: string): Promise<{ email: string; subject: string | null }>
}

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000

export function createAccessVerifier(
  config: AccessConfig,
  fetcher: JwksFetcher = defaultFetcher,
  now: () => number = Date.now,
): AccessVerifier {
  const jwksUrl = `${config.issuer}/cdn-cgi/access/certs`
  let cache: { keys: Map<string, CryptoKey>; fetchedAt: number } | null = null

  async function loadKeys(force: boolean): Promise<Map<string, CryptoKey>> {
    if (!force && cache && now() - cache.fetchedAt < JWKS_CACHE_TTL_MS) return cache.keys
    const jwks = await fetcher(jwksUrl)
    const keys = new Map<string, CryptoKey>()
    for (const jwk of jwks.keys ?? []) {
      if (jwk.kty !== 'RSA' || typeof jwk.kid !== 'string') continue
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      )
      keys.set(jwk.kid, key)
    }
    cache = { keys, fetchedAt: now() }
    return keys
  }

  function unauthenticated(reason: string): ApiError {
    // Reason is for server logs only; the client gets a generic message.
    console.error(JSON.stringify({ accessVerification: 'rejected', reason }))
    return new ApiError('UNAUTHENTICATED', 'Admin authentication is required.')
  }

  return {
    async verify(token: string) {
      try {
        const parts = token.split('.')
        if (parts.length !== 3) throw unauthenticated('malformed-token')
        const [headerSeg, payloadSeg, signatureSeg] = parts
        const header = decodeJsonSegment(headerSeg)
        // Algorithm pinning: RS256 only — no 'none', no HMAC confusion.
        if (header.alg !== 'RS256') throw unauthenticated('unsupported-alg')
        const kid = header.kid
        if (typeof kid !== 'string' || kid.length === 0) throw unauthenticated('missing-kid')

        let keys = await loadKeys(false)
        let key = keys.get(kid)
        if (!key) {
          // Unknown kid: exactly one refresh (key rotation), then fail.
          keys = await loadKeys(true)
          key = keys.get(kid)
          if (!key) throw unauthenticated('unknown-kid')
        }
        const signed = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
        const signature = base64UrlDecode(signatureSeg)
        const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature as BufferSource, signed)
        if (!valid) throw unauthenticated('bad-signature')

        const claims = decodeJsonSegment(payloadSeg)
        if (claims.iss !== config.issuer) throw unauthenticated('wrong-issuer')
        const aud = claims.aud
        const audiences = Array.isArray(aud) ? aud : [aud]
        if (!audiences.includes(config.audience)) throw unauthenticated('wrong-audience')
        const nowSeconds = Math.floor(now() / 1000)
        if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) throw unauthenticated('expired')
        if (typeof claims.nbf === 'number' && claims.nbf > nowSeconds) throw unauthenticated('not-yet-valid')
        if (typeof claims.email !== 'string' || claims.email.length === 0)
          throw unauthenticated('missing-email')
        return {
          email: claims.email.toLowerCase(),
          subject: typeof claims.sub === 'string' ? claims.sub : null,
        }
      } catch (error) {
        if (error instanceof ApiError) throw error
        // Any other failure (JWKS unreachable, decode errors, crypto
        // errors) fails CLOSED with the same generic 401.
        throw unauthenticated('verification-failed')
      }
    },
  }
}

/**
 * Process-level verifier cache: one verifier (and one JWKS cache) per
 * Access configuration, reused across requests in the same isolate.
 * This caches KEYS only — never verification results or identities.
 */
const verifierCache = new Map<string, AccessVerifier>()
export function verifierFor(config: AccessConfig): AccessVerifier {
  const cacheKey = `${config.issuer}|${config.audience}`
  let verifier = verifierCache.get(cacheKey)
  if (!verifier) {
    verifier = createAccessVerifier(config)
    verifierCache.set(cacheKey, verifier)
  }
  return verifier
}
