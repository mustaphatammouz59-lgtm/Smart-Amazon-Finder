import { describe, expect, it } from 'vitest'
import { stripHtml } from '../../app/lib/sanitize'
import { assertSameOrigin } from '../../app/lib/origin'
import { ApiError } from '../../app/lib/api'

/**
 * Stage 04.2 regression suites — sanitizer (F-09/F-10) and origin guard
 * (F-05).
 *
 * F-09: the old stripper removed everything from a lone `<` to the next
 * `>` (or EOF), eating legitimate text: "supports < 10 kg loads" was
 * stored as "supports".
 * F-10: entities were decoded AFTER stripping, so entity-encoded markup
 * was stored as a literal markup string instead of being stripped.
 * F-05: the origin guard compared hosts only and trusted the
 * client-supplied Host header — an http:// Origin passed against an
 * https:// site.
 */

describe('stripHtml — legitimate text survives (F-09)', () => {
  const cases: Array<[string, string]> = [
    ['supports < 10 kg loads', 'supports < 10 kg loads'],
    ['5 < 10 and 3 > 2', '5 < 10 and 3 > 2'],
    ['made with <3 care', 'made with <3 care'],
    ['a < b', 'a < b'],
    ['temperatures < -10° in winter', 'temperatures < -10° in winter'],
  ]
  for (const [input, expected] of cases) {
    it(JSON.stringify(input), () => {
      expect(stripHtml(input)).toBe(expected)
    })
  }
})

describe('stripHtml — markup is stripped, encoded or not (F-10)', () => {
  const cases: Array<[string, string]> = [
    ['<p>Hello <b>world</b></p>', 'Hello world'],
    ['<img src="x" onerror="alert(1)">Caption', 'Caption'],
    ['&lt;img src=x onerror=alert(1)&gt;', ''],
    ['&lt;script&gt;alert(1)&lt;/script&gt;', 'alert(1)'],
    ['&#60;img src=x&#62;', ''],
    ['&#x3C;b&#x3E;bold', 'bold'],
    ['<!-- hidden comment -->visible', 'visible'],
    ['<a href="https://example.com">link</a>', 'link'],
  ]
  for (const [input, expected] of cases) {
    it(JSON.stringify(input), () => {
      expect(stripHtml(input)).toBe(expected)
    })
  }
  it('decoding happens exactly once (double-encoding stays inert text)', () => {
    expect(stripHtml('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;')
    expect(stripHtml('Fish &amp; Chips')).toBe('Fish & Chips')
  })
  it('bidi override characters are removed (F-17)', () => {
    expect(stripHtml('abc\u202Edef')).toBe('abcdef')
    expect(stripHtml('\u2066hidden\u2069 text')).toBe('hidden text')
  })
})

describe('assertSameOrigin — full-origin comparison (F-05)', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://admin.example.test/api/admin/products', { method: 'POST', headers })

  it('allows a matching https origin', () => {
    expect(() => assertSameOrigin(req({ Origin: 'https://admin.example.test' }))).not.toThrow()
  })
  it('allows a missing Origin (non-browser client; the JWT is the control)', () => {
    expect(() => assertSameOrigin(req({}))).not.toThrow()
  })
  it('REJECTS an http scheme downgrade (the audit case)', () => {
    expect(() => assertSameOrigin(req({ Origin: 'http://admin.example.test' }))).toThrowError(ApiError)
  })
  it('rejects a port mismatch', () => {
    expect(() => assertSameOrigin(req({ Origin: 'https://admin.example.test:8443' }))).toThrowError(ApiError)
  })
  it('rejects a foreign origin', () => {
    expect(() => assertSameOrigin(req({ Origin: 'https://evil.example' }))).toThrowError(ApiError)
  })
  it("rejects the literal 'null' origin", () => {
    expect(() => assertSameOrigin(req({ Origin: 'null' }))).toThrowError(ApiError)
  })
  it('ignores a spoofed Host header — the request URL governs', () => {
    // Origin matches the URL origin; the (untrusted) Host header disagrees.
    expect(() =>
      assertSameOrigin(req({ Origin: 'https://admin.example.test', Host: 'evil.example' })),
    ).not.toThrow()
    // Origin matches only the spoofed Host, not the URL: rejected. The old
    // guard trusted Host and would have allowed this.
    expect(() =>
      assertSameOrigin(req({ Origin: 'https://other.example', Host: 'other.example' })),
    ).toThrowError(ApiError)
  })
})
