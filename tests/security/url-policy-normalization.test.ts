import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { validateDestinationUrl } from '../../app/lib/url-policy'
import { createOffer, type AdminActor } from '../../app/lib/db/admin-commerce'
import { getProductOffers } from '../../app/lib/db/offers'
import { validateOffer } from '../../app/lib/offer-validation'

/**
 * Stage 04.4 regression suite — NF-1 (LOW, Stage 04.3): the destination
 * URL policy's IPv4-mapped-IPv6 branch was dead code. The WHATWG parser
 * serializes `[::ffff:127.0.0.1]` as `[::ffff:7f00:1]`, so the
 * dotted-quad check never matched and mapped loopback / RFC-1918 /
 * cloud-metadata addresses were ACCEPTED. `localhost.` (trailing dot),
 * IPv6 multicast and IPv4-compatible forms slipped through too.
 *
 * The fix classifies the host NUMERICALLY: the literal is parsed into
 * its eight 16-bit groups, and mapped (::ffff:0:0/96) and compatible
 * (::/96) forms are judged by the IPv4 rules on the embedded address.
 * Genuinely public mapped addresses stay allowed. Destination URLs are
 * display/link values only — nothing in this app fetches them
 * server-side — so this is about keeping internal addresses out of
 * public links, not an SSRF claim.
 */

const REJECTED: Array<[string, string]> = [
  // IPv4-mapped IPv6, dotted spelling (parser serializes to hex groups)
  ['mapped loopback (dotted)', 'https://[::ffff:127.0.0.1]/'],
  ['mapped RFC-1918 10/8 (dotted)', 'https://[::ffff:10.0.0.5]/'],
  ['mapped RFC-1918 192.168/16 (dotted)', 'https://[::ffff:192.168.0.1]/'],
  ['mapped RFC-1918 172.16/12 (dotted)', 'https://[::ffff:172.16.5.4]/'],
  ['mapped cloud metadata (dotted)', 'https://[::ffff:169.254.169.254]/'],
  // IPv4-mapped IPv6, hex-group spelling (the parser's own output form)
  ['mapped loopback (hex groups)', 'https://[::ffff:7f00:1]/'],
  ['mapped RFC-1918 (hex groups)', 'https://[::ffff:a00:5]/'],
  ['mapped cloud metadata (hex groups)', 'https://[::ffff:a9fe:a9fe]/'],
  ['mapped loopback (fully expanded)', 'https://[0:0:0:0:0:ffff:127.0.0.1]/'],
  // IPv4-compatible IPv6 (::/96)
  ['compatible loopback (dotted)', 'https://[::127.0.0.1]/'],
  ['compatible loopback (hex groups)', 'https://[::7f00:1]/'],
  ['compatible unspecified', 'https://[::]/'],
  // IPv6 multicast ff00::/8
  ['multicast ff02', 'https://[ff02::1]/'],
  ['multicast ff00', 'https://[ff00::1]/'],
  ['multicast ff05', 'https://[ff05::1]/'],
  // localhost spellings
  ['localhost with trailing dot', 'https://localhost./'],
  ['subdomain of localhost with trailing dot', 'https://foo.localhost./'],
  ['subdomain of localhost', 'https://foo.localhost/'],
  // Preserved rejections the numeric rewrite must not regress
  ['IPv6 loopback', 'https://[::1]/'],
  ['IPv6 link-local', 'https://[fe80::1]/'],
  ['IPv6 unique-local', 'https://[fd00::1]/'],
  ['decimal IPv4 loopback', 'https://2130706433/'],
  ['short IPv4 loopback', 'https://127.1/'],
  ['embedded credentials', 'https://user:pass@merchant.example/'],
  ['non-443 port', 'https://merchant.example:8443/'],
  ['plain http', 'http://merchant.example/'],
]

const ACCEPTED: Array<[string, string]> = [
  ['mapped public DNS (dotted)', 'https://[::ffff:8.8.8.8]/'],
  ['mapped public DNS (hex groups)', 'https://[::ffff:808:808]/'],
  ['public IPv6', 'https://[2001:db8::1]/item'],
  ['public IPv6 DNS', 'https://[2606:4700:4700::1111]/'],
  ['public name with trailing dot', 'https://example.com./'],
  ['punycode host', 'https://xn--mnchen-3ya.example/item'],
  ['affiliate tracking parameters', 'https://merchant.example/item?tag=aff-20&ascsubtag=x%20y'],
]

describe('NF-1 validateDestinationUrl — host normalization', () => {
  for (const [name, url] of REJECTED) {
    it(`rejects: ${name}`, () => {
      const result = validateDestinationUrl(url)
      expect(result.ok).toBe(false)
    })
  }
  for (const [name, url] of ACCEPTED) {
    it(`accepts: ${name}`, () => {
      expect(validateDestinationUrl(url)).toMatchObject({ ok: true })
    })
  }
  it('mapped/compatible/localhost rejections carry the forbidden_host reason', () => {
    for (const url of [
      'https://[::ffff:127.0.0.1]/',
      'https://[::ffff:169.254.169.254]/',
      'https://[::127.0.0.1]/',
      'https://[ff02::1]/',
      'https://localhost./',
    ]) {
      expect(validateDestinationUrl(url)).toEqual({ ok: false, reason: 'forbidden_host' })
    }
  })
})

describe('NF-1 enforcement at the DAL and public exposure', () => {
  function merchant(raw: ReturnType<typeof freshCatalogDb>['raw'], slug: string): number {
    const row = raw
      .prepare('INSERT INTO merchants (slug, name, base_domain) VALUES (?, ?, ?) RETURNING id')
      .get(slug, slug, `${slug}.example`) as { id: number }
    return row.id
  }

  it('createOffer rejects a mapped-loopback destination and accepts a mapped public one', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = raw
      .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
      .get() as AdminActor
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
    const bad = await createOffer(db, actor, {
      productId: product.id,
      merchantId: merchant(raw, 'm-map-bad'),
      destinationUrl: 'https://[::ffff:127.0.0.1]/admin',
      licenceStatus: 'licensed',
    })
    expect(bad).toEqual({ conflict: 'invalid_destination' })
    const good = await createOffer(db, actor, {
      productId: product.id,
      merchantId: merchant(raw, 'm-map-good'),
      destinationUrl: 'https://[::ffff:8.8.8.8]/item',
      licenceStatus: 'licensed',
    })
    expect('id' in good).toBe(true)
  })

  it('a PASSED offer whose stored URL is a mapped loopback exposes no destination; a mapped public one is exposed', async () => {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
    const seed = (slug: string, url: string) => {
      const m = merchant(raw, slug)
      raw
        .prepare(
          `INSERT INTO offers (product_id, merchant_id, destination_url, currency, licence_status, validation_status)
           VALUES (?, ?, ?, 'USD', 'licensed', 'passed')`,
        )
        .run(product.id, m, url)
    }
    seed('m-seed-bad', 'https://[::ffff:127.0.0.1]/admin')
    seed('m-seed-good', 'https://[::ffff:8.8.8.8]/item')
    const offers = await getProductOffers(db, product.id)
    const byUrl = new Map(offers.map((o) => [o.merchant_name, o.destination_url]))
    expect(byUrl.get('m-seed-bad')).toBeNull()
    expect(byUrl.get('m-seed-good')).toBe('https://[::ffff:8.8.8.8]/item')
  })

  it('offer validation fails a stored mapped-loopback destination', async () => {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
    const m = merchant(raw, 'm-val-bad')
    const row = raw
      .prepare(
        `INSERT INTO offers (product_id, merchant_id, destination_url, currency, licence_status)
         VALUES (?, ?, 'https://[::ffff:10.0.0.5]/', 'USD', 'licensed') RETURNING id`,
      )
      .get(product.id, m) as { id: number }
    const validation = await validateOffer(db, row.id)
    expect(validation?.status).toBe('failed')
    expect(validation?.issues.some((i) => i.code === 'invalid_url' && i.severity === 'error')).toBe(true)
  })
})
