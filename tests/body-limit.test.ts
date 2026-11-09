import { describe, expect, it } from 'vitest'
import { MAX_JSON_BODY_BYTES, readJsonBody } from '../app/lib/api'

/** POST body-size protection (Stage 03.2): 16 KB cap, 413, no truncation. */
describe('readJsonBody size limit', () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request('https://example.invalid/api/v1/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    })

  it('parses a normal JSON body', async () => {
    await expect(readJsonBody(post('{"a":1}'))).resolves.toEqual({ a: 1 })
  })

  it('accepts a body exactly at the limit', async () => {
    const body = `{"pad":"${'x'.repeat(MAX_JSON_BODY_BYTES - 10)}"}`
    expect(new TextEncoder().encode(body).length).toBe(MAX_JSON_BODY_BYTES)
    await expect(readJsonBody(post(body))).resolves.toBeTypeOf('object')
  })

  it('rejects a body one byte over the limit with 413 PAYLOAD_TOO_LARGE', async () => {
    const body = `{"pad":"${'x'.repeat(MAX_JSON_BODY_BYTES - 9)}"}`
    expect(new TextEncoder().encode(body).length).toBe(MAX_JSON_BODY_BYTES + 1)
    await expect(readJsonBody(post(body))).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
  })

  it('rejects early on an oversized declared Content-Length', async () => {
    const req = post('{}', { 'content-length': String(MAX_JSON_BODY_BYTES + 1) })
    await expect(readJsonBody(req)).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
  })

  it('counts bytes, not characters (multi-byte payloads)', async () => {
    const body = `{"pad":"${'é'.repeat(MAX_JSON_BODY_BYTES / 2)}"}` // 2 bytes per char → over the cap
    await expect(readJsonBody(post(body))).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
  })

  it('still returns 400 VALIDATION_FAILED for invalid JSON under the cap', async () => {
    await expect(readJsonBody(post('{oops'))).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})
