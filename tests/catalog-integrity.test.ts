import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from './helpers/sqlite-d1'
import { getProductBySlug, listProducts } from '../app/lib/db/catalog'
import { applyPricePolicy } from '../app/lib/db/offers'
import { createProduct, transitionProductStatus, writeAudit } from '../app/lib/db/admin'
import * as adminModule from '../app/lib/db/admin'

/**
 * DATABASE-DESIGN.md §6 integrity rules, executed against real SQLite.
 * Rule 2: public queries can only return published + passed products.
 * Rule 1: prices display only when licensed + inside the 24h window.
 * Rule 4: no product deletion path exists (archive instead).
 */
describe('integrity rule 2 — publication/validation gate', () => {
  it('hides draft and unvalidated products in every mode', async () => {
    const { db } = freshCatalogDb()
    for (const includeFixtures of [false, true]) {
      const { items } = await listProducts(db, { includeFixtures, limit: 60 })
      const slugs = items.map((i) => i.slug)
      expect(slugs).not.toContain('dev-fixture-draft-product')
      expect(slugs).not.toContain('dev-fixture-unvalidated-product')
    }
  })

  it('excludes ALL fixtures unless fixtures are explicitly enabled', async () => {
    const { db } = freshCatalogDb()
    const off = await listProducts(db, { includeFixtures: false, limit: 60 })
    expect(off.items).toHaveLength(0)
    const on = await listProducts(db, { includeFixtures: true, limit: 60 })
    expect(on.items.map((i) => i.slug).sort()).toEqual([
      'dev-fixture-charging-cable',
      'dev-fixture-desk-lamp',
      'dev-fixture-desk-riser',
      'dev-fixture-usb-hub',
    ])
  })

  it('returns null detail for gated products', async () => {
    const { db } = freshCatalogDb()
    expect(await getProductBySlug(db, 'dev-fixture-draft-product', true)).toBeNull()
    expect(await getProductBySlug(db, 'dev-fixture-unvalidated-product', true)).toBeNull()
    expect(await getProductBySlug(db, 'dev-fixture-usb-hub', false)).toBeNull()
  })
})

describe('integrity rule 1 — price display policy', () => {
  const base = {
    merchant_slug: 'm',
    merchant_name: 'M',
    destination_url: 'https://example.invalid',
    currency: 'USD',
    current_price_cents: 4999,
    availability_state: 'in_stock',
    validation_status: 'passed',
  }
  const now = Date.parse('2026-11-08T12:00:00Z')

  it('shows a licensed, fresh price with its timestamp', () => {
    const v = applyPricePolicy(
      { ...base, licence_status: 'licensed', price_observed_at: '2026-11-08 06:00:00' },
      now,
    )
    expect(v.price_cents).toBe(4999)
    expect(v.price_observed_at).toBe('2026-11-08 06:00:00')
  })
  it('hides an unlicensed price', () => {
    const v = applyPricePolicy(
      { ...base, licence_status: 'restricted', price_observed_at: '2026-11-08 06:00:00' },
      now,
    )
    expect(v.price_cents).toBeNull()
  })
  it('hides a licensed but stale (>24h) price', () => {
    const v = applyPricePolicy(
      { ...base, licence_status: 'licensed', price_observed_at: '2026-11-06 06:00:00' },
      now,
    )
    expect(v.price_cents).toBeNull()
    expect(v.availability_state).toBeNull()
  })
  it('fixture offers in the database never surface a price', async () => {
    const { db } = freshCatalogDb()
    const hub = await getProductBySlug(db, 'dev-fixture-usb-hub', true)
    expect(hub?.offers[0]?.price_cents).toBeNull()
    const cable = await getProductBySlug(db, 'dev-fixture-charging-cable', true)
    expect(cable?.offers[0]?.price_cents).toBeNull()
  })
})

describe('publication gate + audit (admin DAL)', () => {
  it('refuses to publish an unvalidated product, then publishes + audits', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = { id: 1, email: 'owner@example.invalid', role: 'owner' }
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'editorial-test-item',
      name: 'Editorial Test Item',
    })
    expect('id' in created).toBe(true)
    if (!('id' in created)) throw new Error('unreachable')
    const refused = await transitionProductStatus(db, actor, created.id, 'published')
    expect(refused).toEqual({ ok: false, reason: 'validation_gate' })
    raw.prepare("UPDATE products SET validation_status = 'passed' WHERE id = ?").run(created.id)
    const published = await transitionProductStatus(db, actor, created.id, 'published')
    expect(published).toEqual({ ok: true })
    const audits = raw
      .prepare('SELECT action FROM audit_logs WHERE entity_id = ? ORDER BY id')
      .all(created.id) as { action: string }[]
    expect(audits.map((a) => a.action)).toEqual(['product.create', 'product.publish'])
  })

  it('detects duplicate slugs as conflicts', async () => {
    const { db } = freshCatalogDb()
    const actor = { id: 1, email: 'owner@example.invalid', role: 'owner' }
    const dupe = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'dev-fixture-usb-hub',
      name: 'Dupe',
    })
    expect(dupe).toEqual({ conflict: true })
  })

  it('exposes no product deletion function (rule 4)', () => {
    expect((adminModule as Record<string, unknown>).deleteProduct).toBeUndefined()
    expect(typeof writeAudit).toBe('function')
  })
})
