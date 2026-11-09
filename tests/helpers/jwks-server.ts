import { createServer, type Server } from 'node:http'

/**
 * Route-test JWKS server (Stage 04.2): a REAL local HTTP server on
 * 127.0.0.1 with an ephemeral RS256 keypair, so route-level tests exercise
 * the production Access verifier end to end — real JWTs, real JWKS fetch
 * over HTTP — with zero production credentials and zero external calls.
 * The audience is a fixed test string; the issuer carries the ephemeral
 * port, which also isolates the verifier cache per suite.
 */

export const TEST_AUDIENCE = 'stage042-route-test-audience'

export interface JwksServer {
  issuer: string
  audience: string
  start: () => Promise<void>
  stop: () => Promise<void>
  mint: (email: string, overrides?: Record<string, unknown>) => Promise<string>
}

function b64url(data: string | ArrayBuffer | Uint8Array): string {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data as ArrayBuffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export async function createJwksServer(): Promise<JwksServer> {
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
  jwk.kid = 'route-test-key'
  jwk.alg = 'RS256'
  jwk.use = 'sig'

  let server: Server | null = null
  let issuer = ''

  return {
    get issuer() {
      return issuer
    },
    audience: TEST_AUDIENCE,
    start: async () => {
      server = createServer((req, res) => {
        if (req.url === '/cdn-cgi/access/certs') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ keys: [jwk] }))
        } else {
          res.writeHead(404)
          res.end()
        }
      })
      await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      issuer = `http://127.0.0.1:${port}`
    },
    stop: async () => {
      await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
      server = null
    },
    mint: async (email, overrides = {}) => {
      const now = Math.floor(Date.now() / 1000)
      const header = { alg: 'RS256', kid: 'route-test-key', typ: 'JWT' }
      const claims = {
        iss: issuer,
        aud: [TEST_AUDIENCE],
        email,
        sub: `route-test-${email}`,
        iat: now - 60,
        nbf: now - 60,
        exp: now + 3600,
        ...overrides,
      }
      const head = b64url(JSON.stringify(header))
      const body = b64url(JSON.stringify(claims))
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        pair.privateKey,
        new TextEncoder().encode(`${head}.${body}`),
      )
      return `${head}.${body}.${b64url(signature)}`
    },
  }
}
