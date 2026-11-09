import { createAccessVerifier, type AccessConfig } from '../../app/lib/access'

/**
 * Test JWT factory: a real RSA keypair via Web Crypto, real RS256
 * signatures, and a stub JWKS fetcher — the verifier under test runs
 * the exact production code path (only the network fetch is stubbed).
 */

export const TEST_CONFIG: AccessConfig = {
  issuer: 'https://team.example.invalid',
  audience: 'test-audience-tag',
}

interface KeySet {
  kid: string
  privateKey: CryptoKey
  jwk: JsonWebKey
}

const keySets = new Map<string, KeySet>()

export async function getKeySet(kid: string): Promise<KeySet> {
  const existing = keySets.get(kid)
  if (existing) return existing
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  jwk.kid = kid
  jwk.alg = 'RS256'
  jwk.use = 'sig'
  const set: KeySet = { kid, privateKey: pair.privateKey, jwk }
  keySets.set(kid, set)
  return set
}

export function b64url(data: string | ArrayBuffer | Uint8Array): string {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data as ArrayBuffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export interface TokenOptions {
  kid?: string
  alg?: string
  claims?: Record<string, unknown>
  signWith?: KeySet
  omitSignature?: boolean
}

export async function mintToken(options: TokenOptions = {}): Promise<string> {
  const keySet = options.signWith ?? (await getKeySet(options.kid ?? 'key-1'))
  const header = { alg: options.alg ?? 'RS256', kid: options.kid ?? keySet.kid, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: TEST_CONFIG.issuer,
    aud: [TEST_CONFIG.audience],
    email: 'owner@example.invalid',
    sub: 'subject-1',
    iat: now - 60,
    nbf: now - 60,
    exp: now + 3600,
    ...options.claims,
  }
  const head = b64url(JSON.stringify(header))
  const body = b64url(JSON.stringify(claims))
  if (options.omitSignature) return `${head}.${body}.`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keySet.privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  )
  return `${head}.${body}.${b64url(signature)}`
}

/** A JWKS fetcher stub serving the given kids; records its call count. */
export function jwksFetcherFor(kids: string[]): {
  fetcher: (url: string) => Promise<{ keys: JsonWebKey[] }>
  calls: () => number
} {
  let calls = 0
  return {
    calls: () => calls,
    fetcher: async () => {
      calls++
      const keys: JsonWebKey[] = []
      for (const kid of kids) keys.push((await getKeySet(kid)).jwk)
      return { keys }
    },
  }
}

export function verifierWith(kids: string[], now?: () => number) {
  const { fetcher, calls } = jwksFetcherFor(kids)
  return { verifier: createAccessVerifier(TEST_CONFIG, fetcher, now), fetchCalls: calls }
}
