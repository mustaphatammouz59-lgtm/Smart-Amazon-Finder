import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { validateDestinationUrl } from '../../app/lib/url-policy'
import { createOffer, updateOffer } from '../../app/lib/db/admin-commerce'
import { getProductOffers } from '../../app/lib/db/offers'
import { validateOffer } from '../../app/lib/offer-validation'
import type { AdminActor } from '../../app/lib/db/admin'

/**
 * Stage 04.2 regression suite — F-04: one centralized outbound URL policy.
 * The audit stored `javascript:alert(1)` through the DAL and watched the
 * public API serve it as a product's destination_url. The policy is now
 * enforced at the API schemas, at the DAL choke point (API + admin page),
 * in offer validation, and again at public exposure time.
 */

const actor: AdminActor = { id: 1, email: 'owner@example.invalid', role: 'owner' }

describe('validateDestinationUrl — accepted shapes', () => {
  const accepted: Array<[string, string]> = [
    ['plain merchant URL', 'https://merchant.example/item/123'],
    ['affiliate tracking parameters', 'https://merchant.example/item?tag=aff-20&ref=xyz&subid=fall-campaign'],
    ['punycode host', 'https://xn--mnchen-3ya.example/item'],
    ['explicit 443 port', 'https://example.com:443/x'],
    ['deep path + fragment', 'https://sub.merchant.example/deep/path?q=1#frag'],
    ['public IPv4 literal', 'https://8.8.8.8/x'],
    ['172.32.x is public (outside 172.16/12)', 'https://172.32.0.1/x'],
  ]
  for (const [name, url] of accepted) {
    it(`accepts: ${name}`, () => {
      expect(validateDestinationUrl(url).ok).toBe(true)
    })
  }
})

describe('validateDestinationUrl — rejected shapes', () => {
  const rejected: Array<[string, string, string]> = [
    ['javascript scheme', 'javascript:alert(1)', 'not_https'],
    ['data scheme', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'not_https'],
    ['file scheme', 'file:///etc/passwd', 'not_https'],
    ['ftp scheme', 'ftp://example.com/x', 'not_https'],
    ['plain http', 'http://example.com/x', 'not_https'],
    ['protocol-relative', '//example.com/x', 'malformed'],
    ['not a URL', 'not a url', 'malformed'],
    ['empty', '', 'malformed'],
    ['embedded credentials', 'https://user:pass@example.com/', 'embedded_credentials'],
    ['embedded username only', 'https://user@example.com/', 'embedded_credentials'],
    ['userinfo smuggling', 'https://example.com:443@evil.example/', 'embedded_credentials'],
    ['localhost', 'https://localhost/x', 'forbidden_host'],
    ['subdomain of localhost', 'https://api.localhost/x', 'forbidden_host'],
    ['loopback IPv4', 'https://127.0.0.1/x', 'forbidden_host'],
    ['private 10/8', 'https://10.0.0.5/x', 'forbidden_host'],
    ['private 172.16/12 low', 'https://172.16.0.9/x', 'forbidden_host'],
    ['private 172.16/12 high', 'https://172.31.255.255/x', 'forbidden_host'],
    ['private 192.168/16', 'https://192.168.1.1/x', 'forbidden_host'],
    ['link-local cloud metadata', 'https://169.254.169.254/latest/meta-data', 'forbidden_host'],
    ['IPv6 loopback', 'https://[::1]/x', 'forbidden_host'],
    ['IPv6 link-local', 'https://[fe80::1]/x', 'forbidden_host'],
    ['IPv6 unique-local', 'https://[fd00::1]/x', 'forbidden_host'],
    ['non-443 port', 'https://example.com:8443/x', 'forbidden_port'],
    ['port 80 on https', 'https://example.com:80/x', 'forbidden_port'],
  ]
  for (const [name, url, reason] of rejected) {
    it(`rejects: ${name}`, () => {
      expect(validateDestinationUrl(url)).toEqual({ ok: false, reason })
    })
  }
})

describe('F-04 enforcement at the DAL choke point', () => {
  it('createOffer rejects unsafe destinations, bad currencies and non-positive prices', async () => {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw
      .prepare("INSERT INTO merchants (slug, name, base_domain) VALUES ('m-url', 'Url Merchant', 'url.example') RETURNING id")
      .get() as { id: number }
    const base = { productId: product.id, merchantId: merchant.id, destinationUrl: 'https://url.example/item' }
    expect(await createOffer(db, actor, { ...base, destinationUrl: 'javascript:alert(1)' })).toEqual({
      conflict: 'invalid_destination',
    })
    expect(await createOffer(db, actor, { ...base, destinationUrl: 'http://url.example/item' })).toEqual({
      conflict: 'invalid_destination',
    })
    expect(await createOffer(db, actor, { ...base, currency: 'U$D' })).toEqual({ conflict: 'invalid_currency' })
    expect(await createOffer(db, actor, { ...base, currency: 'USDD' })).toEqual({ conflict: 'invalid_currency' })
    expect(await createOffer(db, actor, { ...base, currentPriceCents: 0 })).toEqual({ conflict: 'invalid_price' })
    expect(await createOffer(db, actor, { ...base, currentPriceCents: -5 })).toEqual({ conflict: 'invalid_price' })
    expect(await createOffer(db, actor, { ...base, currentPriceCents: 10.5 })).toEqual({ conflict: 'invalid_price' })
    // Nothing was stored by any of the rejected attempts.
    const count = raw.prepare('SELECT COUNT(*) AS n FROM offers WHERE merchant_id = ?').get(merchant.id) as { n: number }
    expect(count.n).toBe(0)
  })

  it('currency is normalized (trim + uppercase) before storage', async () => {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw
      .prepare("INSERT INTO merchants (slug, name, base_domain) VALUES ('m-cur', 'Cur Merchant', 'cur.example') RETURNING id")
      .get() as { id: number }
    const created = await createOffer(db, actor, {
      productId: product.id,
      merchantId: merchant.id,
      destinationUrl: 'https://cur.example/item',
      currency: ' eur ',
    })
    if (!('id' in created)) throw new Error('create failed')
    const stored = raw.prepare('SELECT currency FROM offers WHERE id = ?').get(created.id) as { currency: string }
    expect(stored.currency).toBe('EUR')
  })

  it('updateOffer rejects an unsafe destination and keeps the stored value', async () => {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw
      .prepare("INSERT INTO merchants (slug, name, base_domain) VALUES ('m-upd', 'Upd Merchant', 'upd.example') RETURNING id")
      .get() as { id: number }
    const created = await createOffer(db, actor, {
      productId: product.id,
      merchantId: merchant.id,
      destinationUrl: 'https://upd.example/item',
    })
    if (!('id' in created)) throw new Error('create failed')
    expect(await updateOffer(db, actor, created.id, { destinationUrl: 'https://127.0.0.1/admin' })).toEqual({
      ok: false,
      reason: 'invalid_destination',
    })
    const stored = raw.prepare('SELECT destination_url FROM offers WHERE id = ?').get(created.id) as {
      destination_url: string
    }
    expect(stored.destination_url).toBe('https://upd.example/item')
  })
})

describe('F-04 public exposure is validation- and policy-gated', () => {
  async function seededOffer(destinationUrl: string, validationStatus: string) {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw
      .prepare("INSERT INTO merchants (slug, name, base_domain) VALUES ('m-exp', 'Exp Merchant', 'exp.example') RETURNING id")
      .get() as { id: number }
    const seeded = raw
      .prepare(
        `INSERT INTO offers (product_id, merchant_id, destination_url, licence_status, validation_status)
         VALUES (?, ?, ?, 'restricted', ?) RETURNING id`,
      )
      .get(product.id, merchant.id, destinationUrl, validationStatus) as { id: number }
    return { db, raw, productId: product.id, offerId: seeded.id }
  }

  it('a stored javascript: URL on a PASSED offer is still never exposed', async () => {
    const { db, productId } = await seededOffer('javascript:alert(1)', 'passed')
    const offers = await getProductOffers(db, productId)
    expect(offers.find((o) => o.merchant_slug === 'm-exp')?.destination_url).toBeNull()
  })
  it('a good URL on a PENDING offer is not exposed', async () => {
    const { db, productId } = await seededOffer('https://exp.example/item', 'pending')
    const offers = await getProductOffers(db, productId)
    expect(offers.find((o) => o.merchant_slug === 'm-exp')?.destination_url).toBeNull()
  })
  it('a good URL on a PASSED offer is exposed', async () => {
    const { db, productId } = await seededOffer('https://exp.example/item', 'passed')
    const offers = await getProductOffers(db, productId)
    expect(offers.find((o) => o.merchant_slug === 'm-exp')?.destination_url).toBe('https://exp.example/item')
  })
  it('validation fails a stored javascript: URL', async () => {
    const { db, offerId } = await seededOffer('javascript:alert(1)', 'pending')
    const v = await validateOffer(db, offerId)
    expect(v?.status).toBe('failed')
    expect(v?.issues.some((i) => i.code === 'invalid_url')).toBe(true)
  })
})
