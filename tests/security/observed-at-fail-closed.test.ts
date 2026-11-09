import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import {
  createOffer,
  normalizeObservedAt,
  updateOffer,
  type AdminActor,
} from '../../app/lib/db/admin-commerce'
import { runOfferValidation } from '../../app/lib/offer-validation'
import { evaluatePriceDisplay } from '../../app/lib/price-policy'
import { getProductOffers } from '../../app/lib/db/offers'

/**
 * Stage 04.4 regression suite — NF-3 (INFO, Stage 04.3): the offer write
 * path stored unparseable observation timestamps VERBATIM (with a
 * Date.parse fallback). Some values neither engine should accept — a
 * Julian-day numeric string like '2461000.5' is a valid instant to
 * SQLite's julianday() but unparseable to the shared JS parser — could
 * therefore be counted as fresh by the SQL search filter while the
 * product page hid the same price.
 *
 * The write path now fails closed: checkOfferFields rejects any
 * priceObservedAt the ONE shared strict parser (parsePriceTimestamp)
 * cannot parse, with 'invalid_observed_at', BEFORE any SQL runs — no
 * row is created or modified, and no success audit entry is written.
 * Accepted values are stored in the canonical UTC form.
 */

type Raw = ReturnType<typeof freshCatalogDb>['raw']

function owner(raw: Raw): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

function merchant(raw: Raw, slug: string): number {
  const row = raw
    .prepare('INSERT INTO merchants (slug, name, base_domain) VALUES (?, ?, ?) RETURNING id')
    .get(slug, slug, `${slug}.example`) as { id: number }
  return row.id
}

function lampId(raw: Raw): number {
  const row = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
  return row.id
}

function auditCount(raw: Raw, action: string): number {
  const row = raw.prepare('SELECT COUNT(*) AS n FROM audit_logs WHERE action = ?').get(action) as { n: number }
  return row.n
}

describe('NF-3 normalizeObservedAt — strict parser only, never verbatim', () => {
  it('canonicalizes every accepted format to UTC SQLite form', () => {
    expect(normalizeObservedAt('2026-11-09 12:00:00')).toBe('2026-11-09 12:00:00')
    expect(normalizeObservedAt('2026-11-09T12:00:00.000Z')).toBe('2026-11-09 12:00:00')
    expect(normalizeObservedAt('2026-11-09T14:00:00+02:00')).toBe('2026-11-09 12:00:00')
    expect(normalizeObservedAt('2026-11-09T10:00:00-02:00')).toBe('2026-11-09 12:00:00')
  })
  it('returns null — never the raw value — for anything the shared parser rejects', () => {
    expect(normalizeObservedAt('2461000.5')).toBeNull() // Julian-day numeric string
    expect(normalizeObservedAt('2461000')).toBeNull()
    expect(normalizeObservedAt('not-a-timestamp')).toBeNull()
    expect(normalizeObservedAt('')).toBeNull()
  })
  it('keeps null/undefined as null (link-only semantics)', () => {
    expect(normalizeObservedAt(null)).toBeNull()
    expect(normalizeObservedAt(undefined)).toBeNull()
  })
})

describe('NF-3 createOffer — fail closed on unparseable timestamps', () => {
  const REJECTED: Array<[string, string]> = [
    ['Julian-day numeric string', '2461000.5'],
    ['numeric-looking string', '2461000'],
    ['garbage text', 'not-a-timestamp'],
    ['invalid month', '2026-13-09 12:00:00'],
    ['invalid hour', '2026-11-09 25:00:00'],
    ['colon-less offset', '2026-11-09T12:00:00+0200'],
    ['whitespace-padded', ' 2026-11-09 12:00:00 '],
    ['empty string', ''],
  ]
  let rejIdx = 0
  for (const [name, value] of REJECTED) {
    rejIdx += 1
    const slug = `m-nf3-rej-${rejIdx}`
    it(`rejects ${name}: no row, no success audit`, async () => {
      const { db, raw } = freshCatalogDb()
      const actor = owner(raw)
      const merchantId = merchant(raw, slug)
      const auditsBefore = auditCount(raw, 'offer.create')
      const result = await createOffer(db, actor, {
        productId: lampId(raw),
        merchantId,
        destinationUrl: 'https://nf3.example/item',
        currency: 'USD',
        currentPriceCents: 1000,
        priceObservedAt: value,
        licenceStatus: 'licensed',
      })
      expect(result).toEqual({ conflict: 'invalid_observed_at' })
      const stored = raw.prepare('SELECT id FROM offers WHERE merchant_id = ?').get(merchantId)
      expect(stored).toBeUndefined()
      expect(auditCount(raw, 'offer.create')).toBe(auditsBefore)
    })
  }

  const ACCEPTED: Array<[string, string, string]> = [
    ['ISO UTC', '2026-11-09T12:00:00.000Z', '2026-11-09 12:00:00'],
    ['ISO with +02:00 offset', '2026-11-09T14:00:00+02:00', '2026-11-09 12:00:00'],
    ['ISO with -05:00 offset', '2026-11-09T07:00:00-05:00', '2026-11-09 12:00:00'],
    ['SQLite canonical', '2026-11-09 12:00:00', '2026-11-09 12:00:00'],
  ]
  let accIdx = 0
  for (const [name, value, storedExpected] of ACCEPTED) {
    accIdx += 1
    const slug = `m-nf3-ok-${accIdx}`
    it(`accepts ${name} and stores the canonical form`, async () => {
      const { db, raw } = freshCatalogDb()
      const actor = owner(raw)
      const merchantId = merchant(raw, slug)
      const result = await createOffer(db, actor, {
        productId: lampId(raw),
        merchantId,
        destinationUrl: 'https://nf3.example/item',
        currency: 'USD',
        currentPriceCents: 1000,
        priceObservedAt: value,
        licenceStatus: 'licensed',
      })
      expect('id' in result).toBe(true)
      const stored = raw
        .prepare('SELECT price_observed_at FROM offers WHERE merchant_id = ?')
        .get(merchantId) as { price_observed_at: string }
      expect(stored.price_observed_at).toBe(storedExpected)
    })
  }

  it('a missing timestamp stays null (link-only offer)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const merchantId = merchant(raw, 'm-nf3-null')
    const result = await createOffer(db, actor, {
      productId: lampId(raw),
      merchantId,
      destinationUrl: 'https://nf3.example/item',
      licenceStatus: 'licensed',
    })
    expect('id' in result).toBe(true)
    const stored = raw
      .prepare('SELECT price_observed_at FROM offers WHERE merchant_id = ?')
      .get(merchantId) as { price_observed_at: string | null }
    expect(stored.price_observed_at).toBeNull()
  })
})

describe('NF-3 updateOffer — rejection is atomic (no partial write, no audit)', () => {
  async function passedOffer(raw: Raw, db: D1Database, actor: AdminActor) {
    const merchantId = merchant(raw, 'm-nf3-upd')
    const created = await createOffer(db, actor, {
      productId: lampId(raw),
      merchantId,
      destinationUrl: 'https://nf3.example/item',
      currency: 'USD',
      currentPriceCents: 1000,
      priceObservedAt: '2026-11-09T12:00:00.000Z',
      licenceStatus: 'licensed',
    })
    if (!('id' in created)) throw new Error('create failed')
    expect((await runOfferValidation(db, actor, created.id))?.status).toBe('passed')
    return created.id
  }

  it('rejects a Julian-day patch and leaves the row AND audit untouched', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const offerId = await passedOffer(raw, db, actor)
    const auditsBefore = auditCount(raw, 'offer.update')
    const result = await updateOffer(db, actor, offerId, { priceObservedAt: '2461000.5' })
    expect(result).toEqual({ ok: false, reason: 'invalid_observed_at' })
    const stored = raw
      .prepare('SELECT price_observed_at, validation_status FROM offers WHERE id = ?')
      .get(offerId) as { price_observed_at: string; validation_status: string }
    expect(stored).toEqual({ price_observed_at: '2026-11-09 12:00:00', validation_status: 'passed' })
    expect(auditCount(raw, 'offer.update')).toBe(auditsBefore)
  })

  it('accepts a valid patch, canonicalizes it, and resets the verdict (F-01 preserved)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const offerId = await passedOffer(raw, db, actor)
    const result = await updateOffer(db, actor, offerId, { priceObservedAt: '2026-11-09T15:30:00+02:00' })
    expect(result).toEqual({ ok: true })
    const stored = raw
      .prepare('SELECT price_observed_at, validation_status FROM offers WHERE id = ?')
      .get(offerId) as { price_observed_at: string; validation_status: string }
    expect(stored).toEqual({ price_observed_at: '2026-11-09 13:30:00', validation_status: 'pending' })
  })
})

describe('NF-3 stored values meet the display policy consistently', () => {
  it('a parseable FUTURE timestamp is stored canonical — and the shared policy still hides it as future', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const merchantId = merchant(raw, 'm-nf3-future')
    const future = new Date(Date.now() + 3_600_000).toISOString()
    const created = await createOffer(db, actor, {
      productId: lampId(raw),
      merchantId,
      destinationUrl: 'https://nf3.example/item',
      currency: 'USD',
      currentPriceCents: 1000,
      priceObservedAt: future,
      licenceStatus: 'licensed',
    })
    if (!('id' in created)) throw new Error('create failed')
    const stored = raw
      .prepare('SELECT current_price_cents, price_observed_at, licence_status, validation_status, currency FROM offers WHERE id = ?')
      .get(created.id) as {
      current_price_cents: number
      price_observed_at: string
      licence_status: string
      validation_status: string
      currency: string
    }
    expect(stored.price_observed_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(evaluatePriceDisplay({ ...stored, validation_status: 'passed' })).toEqual({
      displayable: false,
      reason: 'future_timestamp',
    })
  })

  it('freshness boundary on real stored rows: inside 24h displays, beyond 24h is stale', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const productId = lampId(raw)
    const mk = async (slug: string, ageMs: number) => {
      const merchantId = merchant(raw, slug)
      const created = await createOffer(db, actor, {
        productId,
        merchantId,
        destinationUrl: 'https://nf3.example/item',
        currency: 'USD',
        currentPriceCents: 1000,
        priceObservedAt: new Date(Date.now() - ageMs).toISOString(),
        licenceStatus: 'licensed',
      })
      if (!('id' in created)) throw new Error('create failed')
      expect((await runOfferValidation(db, actor, created.id))?.status).toBe('passed')
      return created.id
    }
    const freshId = await mk('m-nf3-fresh', 24 * 3_600_000 - 60_000) // 23h59m old
    const staleId = await mk('m-nf3-stale', 24 * 3_600_000 + 60_000) // 24h01m old
    const offers = await getProductOffers(db, productId)
    const priceById = new Map(
      offers.map((o) => [o.merchant_name, o.price_cents]),
    )
    expect(priceById.get('m-nf3-fresh')).toBe(1000)
    expect(priceById.get('m-nf3-stale')).toBeNull()
    expect(freshId).not.toBe(staleId)
  })
})
