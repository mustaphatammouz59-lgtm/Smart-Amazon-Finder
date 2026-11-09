import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { evaluatePriceDisplay, isPriceFresh, parsePriceTimestamp } from '../../app/lib/price-policy'
import { applyPricePolicy } from '../../app/lib/db/offers'
import { priceDisplayReason, validateOffer } from '../../app/lib/offer-validation'
import { searchProducts } from '../../app/lib/db/search'

/**
 * Stage 04.2 regression suite — ONE shared price policy (F-02/F-06/F-07/F-08).
 *
 * The audit found the freshness/sign/currency rules implemented three
 * times (public display, admin explanation, SQL search filter) and
 * disagreeing: future timestamps counted as fresh forever in all three;
 * the JS paths parsed ISO-Z/offset values to NaN via `Date.parse(x + 'Z')`
 * while SQLite parsed them fine. All surfaces now delegate to
 * app/lib/price-policy.ts; the SQL filter mirrors it and is pinned here.
 *
 * JS boundary assertions use a fixed injected clock and exact integer
 * arithmetic. The JS/SQL agreement assertions keep a ±60 s margin around
 * the 24 h boundary, because SQL compares julianday() floats against the
 * database clock — exact-boundary float equality is not a property the
 * SQL engine guarantees (and never was, before this stage either).
 */

const NOW = Date.UTC(2026, 10, 9, 12, 0, 0) // 2026-11-09T12:00:00Z
const HOUR = 3_600_000
const DAY = 24 * HOUR

const sqliteFormat = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ')

function row(overrides: Partial<Parameters<typeof evaluatePriceDisplay>[0]> = {}) {
  return {
    current_price_cents: 2500,
    price_observed_at: sqliteFormat(NOW - HOUR),
    licence_status: 'licensed',
    validation_status: 'passed',
    currency: 'USD',
    ...overrides,
  }
}

describe('shared price policy — freshness boundaries (F-02)', () => {
  const cases: Array<[string, string | null, string]> = [
    ['exactly 24h old is still fresh (inclusive boundary)', sqliteFormat(NOW - DAY), 'displayable'],
    ['24h + 1s old is stale', sqliteFormat(NOW - DAY - 1000), 'stale'],
    ['1s in the future is NOT fresh', sqliteFormat(NOW + 1000), 'future_timestamp'],
    ['1h in the future is NOT fresh', sqliteFormat(NOW + HOUR), 'future_timestamp'],
    ['30 days in the future is NOT fresh', sqliteFormat(NOW + 30 * DAY), 'future_timestamp'],
    ['observed exactly now is fresh', sqliteFormat(NOW), 'displayable'],
    ['missing timestamp', null, 'invalid_timestamp'],
    ['garbage timestamp', 'not-a-date', 'invalid_timestamp'],
    ['ISO 8601 with Z, 1h old (F-08: previously NaN)', '2026-11-09T11:00:00Z', 'displayable'],
    ['ISO 8601 with +02:00 offset (= 11:00Z)', '2026-11-09T13:00:00+02:00', 'displayable'],
    ['ISO 8601 with -05:00 offset (= 11:00Z)', '2026-11-09T06:00:00-05:00', 'displayable'],
    ['space form with offset (= 11:00Z)', '2026-11-09 13:00:00+02:00', 'displayable'],
    ['no-seconds form, 1h old', '2026-11-09 11:00', 'displayable'],
    ['ISO-Z 25h old is stale', '2026-11-08T11:00:00Z', 'stale'],
    ['ISO-Z 1h in the future is NOT fresh', '2026-11-09T13:00:00Z', 'future_timestamp'],
  ]
  for (const [name, observed, reason] of cases) {
    it(name, () => {
      const r = row({ price_observed_at: observed })
      expect(evaluatePriceDisplay(r, NOW).reason).toBe(reason)
      // The admin explanation must agree with the public decision, always.
      expect(priceDisplayReason(r, NOW)).toBe(reason)
      // And the public view exposes the price exactly when displayable.
      const view = applyPricePolicy({ merchant_slug: 'm', merchant_name: 'M', destination_url: 'https://m.example/x', availability_state: 'in_stock', ...r }, NOW)
      expect(view.price_cents).toBe(reason === 'displayable' ? 2500 : null)
    })
  }
})

describe('shared price policy — sign and currency (F-06/F-07)', () => {
  it('zero price is no_price on every surface', () => {
    const r = row({ current_price_cents: 0 })
    expect(evaluatePriceDisplay(r, NOW)).toEqual({ displayable: false, reason: 'no_price' })
    expect(priceDisplayReason(r, NOW)).toBe('no_price')
  })
  it('negative price never displays', () => {
    const r = row({ current_price_cents: -500 })
    expect(evaluatePriceDisplay(r, NOW)).toEqual({ displayable: false, reason: 'invalid_price' })
    expect(priceDisplayReason(r, NOW)).toBe('invalid_price')
  })
  it('invalid currencies never display', () => {
    for (const currency of ['usd', 'USDD', 'U$D', 'EU', 'US', '']) {
      expect(evaluatePriceDisplay(row({ currency }), NOW).reason, currency).toBe('invalid_currency')
    }
    expect(evaluatePriceDisplay(row({ currency: 'EUR' }), NOW).reason).toBe('displayable')
  })
  it('licence and validation gates still apply', () => {
    expect(evaluatePriceDisplay(row({ licence_status: 'restricted' }), NOW).reason).toBe('unlicensed')
    expect(evaluatePriceDisplay(row({ validation_status: 'pending' }), NOW).reason).toBe('unvalidated')
  })
})

describe('JS policy and SQL julianday agree (F-08)', () => {
  const { raw } = freshCatalogDb()
  const sqlFresh = (value: string): boolean => {
    const r = raw
      .prepare(
        `SELECT CASE WHEN julianday(?) IS NULL THEN NULL
                     ELSE (julianday(?) - julianday(?)) * 86400000 END AS age_ms`,
      )
      .get(value, sqliteFormat(NOW), value) as { age_ms: number | null }
    return r.age_ms !== null && r.age_ms >= 0 && r.age_ms <= DAY
  }
  const samples: Array<[string, string]> = [
    ['canonical, 1h old', sqliteFormat(NOW - HOUR)],
    ['canonical, 23h old', sqliteFormat(NOW - 23 * HOUR)],
    ['canonical, 25h old', sqliteFormat(NOW - 25 * HOUR)],
    ['canonical, 1h future', sqliteFormat(NOW + HOUR)],
    ['ISO Z', '2026-11-09T11:00:00Z'],
    ['ISO +02:00', '2026-11-09T13:00:00+02:00'],
    ['ISO -05:00', '2026-11-09T06:00:00-05:00'],
    ['space + offset', '2026-11-09 13:00:00+02:00'],
    ['space + Z', '2026-11-09 11:00:00Z'],
    ['no seconds', '2026-11-09 11:00'],
    ['garbage', 'not-a-date'],
    ['month 13', '2026-13-01 00:00:00'],
    ['day 32', '2026-11-32 10:00:00'],
    ['day 00', '2026-11-00 10:00:00'],
    ['minute 60', '2026-11-09 12:60:00'],
    ['colon-less offset', '2026-11-09T11:00:00+0200'],
    ['feb 30 (arithmetic roll in both engines)', '2026-02-30 10:00:00'],
    ['padded with spaces', ' 2026-11-09 11:00:00 '],
    ['hour 24 (rolls to next day = future)', '2026-11-09 24:00:00'],
  ]
  for (const [name, value] of samples) {
    it(name, () => {
      expect(isPriceFresh(value, NOW), `JS=${isPriceFresh(value, NOW)} SQL=${sqlFresh(value)}`).toBe(sqlFresh(value))
    })
  }
  it('the parser handles the canonical round-trip exactly', () => {
    expect(parsePriceTimestamp(sqliteFormat(NOW))).toBe(NOW)
    expect(parsePriceTimestamp('2026-11-09T13:00:00+02:00')).toBe(Date.UTC(2026, 10, 9, 11, 0, 0))
  })
})

describe('SQL search price filter uses the same policy (F-02/F-06/F-07)', () => {
  async function setup() {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw.prepare("SELECT id FROM merchants WHERE slug = 'devmerchant'").get() as { id: number }
    const insert = (observed: string, currency = 'USD', price = 1000) =>
      raw
        .prepare(
          `INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents,
                               price_observed_at, licence_status, validation_status)
           VALUES (?, ?, 'https://merchant.example/item', ?, ?, ?, 'licensed', 'passed')`,
        )
        .run(product.id, merchant.id, currency, price, observed)
    const searchWithPriceCap = async () =>
      (await searchProducts(db, { priceMaxCents: 999_999, includeFixtures: true })).items.map((i) => i.slug)
    return { insert, searchWithPriceCap }
  }

  it('a future observation never matches a price filter', async () => {
    const { insert, searchWithPriceCap } = await setup()
    insert(sqliteFormat(Date.now() + HOUR))
    expect(await searchWithPriceCap()).not.toContain('dev-fixture-desk-riser')
  })
  it('an ISO-Z stored observation (legacy shape) matches while fresh', async () => {
    const { insert, searchWithPriceCap } = await setup()
    insert(new Date(Date.now() - HOUR).toISOString())
    expect(await searchWithPriceCap()).toContain('dev-fixture-desk-riser')
  })
  it('an invalid currency never matches, even when licensed and fresh', async () => {
    const { insert, searchWithPriceCap } = await setup()
    insert(sqliteFormat(Date.now() - HOUR), 'U$D')
    expect(await searchWithPriceCap()).not.toContain('dev-fixture-desk-riser')
  })
  it('a zero price never matches', async () => {
    const { insert, searchWithPriceCap } = await setup()
    insert(sqliteFormat(Date.now() - HOUR), 'USD', 0)
    expect(await searchWithPriceCap()).not.toContain('dev-fixture-desk-riser')
  })
})

describe('offer validation shares the policy (F-02/F-06/F-07)', () => {
  async function seededOffer(overrides: Record<string, unknown>) {
    const { db, raw } = freshCatalogDb()
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw.prepare("SELECT id FROM merchants WHERE slug = 'devmerchant'").get() as { id: number }
    const base: Record<string, unknown> = {
      destination_url: 'https://merchant.example/item',
      currency: 'USD',
      current_price_cents: 1500,
      price_observed_at: sqliteFormat(Date.now() - HOUR),
      licence_status: 'licensed',
      ...overrides,
    }
    const cols = Object.keys(base)
    const seeded = raw
      .prepare(
        `INSERT INTO offers (product_id, merchant_id, ${cols.join(', ')}) VALUES (?, ?, ${cols.map(() => '?').join(', ')}) RETURNING id`,
      )
      .get(product.id, merchant.id, ...cols.map((c) => base[c])) as { id: number }
    return { db, id: seeded.id }
  }

  it('flags a future observation as an error', async () => {
    const { db, id } = await seededOffer({ price_observed_at: sqliteFormat(Date.now() + HOUR) })
    const v = await validateOffer(db, id)
    expect(v?.status).toBe('failed')
    expect(v?.issues.some((i) => i.code === 'price_observed_in_future')).toBe(true)
  })
  it('flags an unparseable observation as an error', async () => {
    const { db, id } = await seededOffer({ price_observed_at: 'yesterday-ish' })
    const v = await validateOffer(db, id)
    expect(v?.issues.some((i) => i.code === 'price_observed_at_invalid')).toBe(true)
  })
  it('flags a zero price as an error', async () => {
    const { db, id } = await seededOffer({ current_price_cents: 0 })
    const v = await validateOffer(db, id)
    expect(v?.issues.some((i) => i.code === 'zero_price')).toBe(true)
  })
  it('flags an invalid currency as an error', async () => {
    const { db, id } = await seededOffer({ currency: 'U$D' })
    const v = await validateOffer(db, id)
    expect(v?.issues.some((i) => i.code === 'invalid_currency')).toBe(true)
  })
})
