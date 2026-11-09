import { describe, expect, it } from 'vitest'
import { createAccessVerifier } from '../app/lib/access'
import { TEST_CONFIG, getKeySet, jwksFetcherFor, mintToken, verifierWith } from './helpers/jwt'

/**
 * Access JWT verification suite (Stage 03.2). Real RSA keys, real RS256
 * signatures, production verifier code — only the JWKS HTTP fetch is
 * stubbed. Every rejection must be a 401 UNAUTHENTICATED ApiError.
 */
describe('Access JWT verification', () => {
  it('accepts a valid token and derives identity from claims', async () => {
    const { verifier } = verifierWith(['key-1'])
    const token = await mintToken()
    const identity = await verifier.verify(token)
    expect(identity.email).toBe('owner@example.invalid')
    expect(identity.subject).toBe('subject-1')
  })

  it('accepts aud as a plain string as well as an array', async () => {
    const { verifier } = verifierWith(['key-1'])
    const token = await mintToken({ claims: { aud: TEST_CONFIG.audience } })
    await expect(verifier.verify(token)).resolves.toMatchObject({ email: 'owner@example.invalid' })
  })

  it('rejects malformed tokens', async () => {
    const { verifier } = verifierWith(['key-1'])
    await expect(verifier.verify('not-a-jwt')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(verifier.verify('a.b')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(verifier.verify('!!!.@@@.###')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(verifier.verify('')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects a token signed by a different key (invalid signature)', async () => {
    const { verifier } = verifierWith(['key-1'])
    const attacker = await getKeySet('key-attacker')
    // Header claims kid=key-1 but the signature is the attacker's.
    const token = await mintToken({ kid: 'key-1', signWith: attacker })
    await expect(verifier.verify(token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects a tampered payload', async () => {
    const { verifier } = verifierWith(['key-1'])
    const token = await mintToken()
    const [head, , sig] = token.split('.')
    const forgedClaims = Buffer.from(
      JSON.stringify({
        iss: TEST_CONFIG.issuer,
        aud: [TEST_CONFIG.audience],
        email: 'attacker@example.invalid',
        exp: 9999999999,
      }),
    ).toString('base64url')
    await expect(verifier.verify(`${head}.${forgedClaims}.${sig}`)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })

  it('rejects expired and not-yet-valid tokens', async () => {
    const { verifier } = verifierWith(['key-1'])
    const now = Math.floor(Date.now() / 1000)
    await expect(verifier.verify(await mintToken({ claims: { exp: now - 10 } }))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    await expect(verifier.verify(await mintToken({ claims: { nbf: now + 3600 } }))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })

  it('rejects wrong issuer and wrong audience', async () => {
    const { verifier } = verifierWith(['key-1'])
    await expect(
      verifier.verify(await mintToken({ claims: { iss: 'https://evil.example.com' } })),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(
      verifier.verify(await mintToken({ claims: { aud: ['some-other-app'] } })),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects unsupported algorithms (none / HS256 confusion)', async () => {
    const { verifier } = verifierWith(['key-1'])
    await expect(
      verifier.verify(await mintToken({ alg: 'none', omitSignature: true })),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(verifier.verify(await mintToken({ alg: 'HS256' }))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })

  it('rejects an unknown signing key after exactly one refresh', async () => {
    const { fetcher, calls } = jwksFetcherFor(['key-1'])
    const verifier = createAccessVerifier(TEST_CONFIG, fetcher)
    const token = await mintToken({ kid: 'key-unknown', signWith: await getKeySet('key-unknown') })
    await expect(verifier.verify(token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(calls()).toBe(2) // initial load + one rotation refresh, no more
  })

  it('handles key rotation: a token from the new key verifies after refresh', async () => {
    let servedKids = ['key-1']
    let calls = 0
    const fetcher = async () => {
      calls++
      const keys: JsonWebKey[] = []
      for (const kid of servedKids) keys.push((await getKeySet(kid)).jwk)
      return { keys }
    }
    const verifier = createAccessVerifier(TEST_CONFIG, fetcher)
    await verifier.verify(await mintToken({ kid: 'key-1' })) // warm cache with old key
    servedKids = ['key-2'] // Access rotates: JWKS now serves only the new key
    const rotated = await mintToken({ kid: 'key-2', signWith: await getKeySet('key-2') })
    await expect(verifier.verify(rotated)).resolves.toMatchObject({ email: 'owner@example.invalid' })
    expect(calls).toBe(2)
  })

  it('caches JWKS keys across verifications', async () => {
    const { verifier, fetchCalls } = verifierWith(['key-1'])
    await verifier.verify(await mintToken())
    await verifier.verify(await mintToken())
    expect(fetchCalls()).toBe(1)
  })

  it('fails closed when the JWKS cannot be retrieved', async () => {
    const verifier = createAccessVerifier(TEST_CONFIG, async () => {
      throw new Error('network down')
    })
    await expect(verifier.verify(await mintToken())).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects a token with no email claim', async () => {
    const { verifier } = verifierWith(['key-1'])
    await expect(verifier.verify(await mintToken({ claims: { email: undefined } }))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })
})
