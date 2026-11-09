// Admin commerce — Stage 04 §9: merchants, affiliate programs, offers with
// the price-display policy, and read-only staging sources.
import { describe, expect, it } from 'vitest'
import type { AdminActor } from '../app/lib/db/admin'
import {
  buildSampleLink,
  createMerchant,
  createOffer,
  createProgram,
  deleteMerchant,
  deleteOffer,
  deleteProgram,
  getAdminOffer,
  getProgram,
  listAdminOffers,
  listMerchants,
  listSources,
  getSource,
  updateProgram,
} from '../app/lib/db/admin-commerce'
import { runOfferValidation, validateOffer } from '../app/lib/offer-validation'
import { freshCatalogDb } from './helpers/sqlite-d1'

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

async function idBySlug(db: D1Database, table: string, slug: string): Promise<number> {
  const row = await db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).bind(slug).first<{ id: number }>()
  if (!row) throw new Error(`${table} ${slug} missing`)
  return row.id
}

describe('merchants and programs', () => {
  it('lists merchants with usage counts and refuses in-use deletion', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const merchants = await listMerchants(db)
    expect(merchants.find((m) => m.slug === 'devmerchant')?.offers_count).toBe(2)
    const merchantId = await idBySlug(db, 'merchants', 'devmerchant')
    const result = await deleteMerchant(db, actor, merchantId)
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'in_use') expect(result.offers_count).toBe(2)
    const created = await createMerchant(db, actor, {
      slug: 'stage04-merchant',
      name: 'Stage04 Merchant',
      baseDomain: 'stage04.example.invalid',
    })
    expect(
      await createMerchant(db, actor, { slug: 'stage04-merchant', name: 'Dupe', baseDomain: 'dupe.example.invalid' }),
    ).toEqual({ conflict: 'slug' })
    if ('id' in created) expect(await deleteMerchant(db, actor, created.id)).toEqual({ ok: true })
  })

  it('builds sample links from templates and audits status changes as high severity', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const merchantId = await idBySlug(db, 'merchants', 'devmerchant')
    const created = await createProgram(db, actor, {
      merchantId,
      name: 'Stage04 Program',
      linkTemplate: 'https://example.invalid/out?dest={destination}',
      trackingParam: 'tag=test-20',
      status: 'inactive',
    })
    if (!('id' in created)) throw new Error('program create failed')
    const program = await getProgram(db, created.id)
    expect(program).not.toBeNull()
    const sample = buildSampleLink(program!, 'https://shop.example/item?a=1')
    expect(sample.ok).toBe(true)
    if (sample.ok) {
      expect(sample.url).toContain(encodeURIComponent('https://shop.example/item?a=1'))
      expect(sample.url).toContain('tag=test-20')
    }
    expect(
      buildSampleLink({ ...program!, link_template: 'https://example.invalid/plain' }, 'https://x.example').ok,
    ).toBe(false)

    expect(await updateProgram(db, actor, created.id, { status: 'active' })).toEqual({ ok: true })
    const audit = await db
      .prepare("SELECT after_json FROM audit_logs WHERE action = 'program.update' AND entity_id = ?")
      .bind(created.id)
      .first<{ after_json: string | null }>()
    expect(audit?.after_json).toContain('"severity":"high"')

    // A program referenced by an offer cannot be deleted.
    const productId = await idBySlug(db, 'products', 'dev-fixture-desk-riser')
    const offer = await createOffer(db, actor, {
      productId,
      merchantId,
      programId: created.id,
      destinationUrl: 'https://example.invalid/riser',
    })
    expect('id' in offer).toBe(true)
    const blocked = await deleteProgram(db, actor, created.id)
    expect(blocked.ok).toBe(false)
  })
})

describe('offers and the price-display policy', () => {
  it('explains why both fixture prices are hidden', async () => {
    const { db } = freshCatalogDb()
    const { items } = await listAdminOffers(db, {})
    const bySlug = new Map(items.map((o) => [o.product_slug, o]))
    expect(bySlug.get('dev-fixture-usb-hub')?.price_display).toMatchObject({ visible: false, reason: 'unlicensed' })
    expect(bySlug.get('dev-fixture-charging-cable')?.price_display).toMatchObject({
      visible: false,
      reason: 'stale',
    })
  })

  it('walks the full policy ladder for a licensed offer: unvalidated → displayable', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const productId = await idBySlug(db, 'products', 'dev-fixture-desk-riser')
    const merchantId = await idBySlug(db, 'merchants', 'devmerchant')
    const created = await createOffer(db, actor, {
      productId,
      merchantId,
      destinationUrl: 'https://example.invalid/riser',
      currency: 'USD',
      currentPriceCents: 2500,
      priceObservedAt: new Date().toISOString(),
      licenceStatus: 'licensed',
    })
    if (!('id' in created)) throw new Error('offer create failed')
    const pending = await getAdminOffer(db, created.id)
    expect(pending?.price_display).toMatchObject({ visible: false, reason: 'unvalidated' })
    expect((await runOfferValidation(db, actor, created.id)).status).toBe('passed')
    const visible = await getAdminOffer(db, created.id)
    expect(visible?.price_display).toMatchObject({ visible: true, reason: 'displayable', price_cents: 2500 })
  })

  it('rejects hand-typed prices on unlicensed offers at validation time', async () => {
    const { db } = freshCatalogDb()
    const { items } = await listAdminOffers(db, {})
    const hub = items.find((o) => o.product_slug === 'dev-fixture-usb-hub')
    if (!hub) throw new Error('hub offer missing')
    const result = await validateOffer(db, hub.id)
    expect(result?.status).toBe('failed')
    expect(result?.issues.some((i) => i.code === 'price_unlicensed')).toBe(true)
    const actor = await owner(db)
    expect((await runOfferValidation(db, actor, hub.id)).status).toBe('failed')
  })

  it('flags non-https destinations in validation and rejects duplicates', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = await owner(db)
    const productId = await idBySlug(db, 'products', 'dev-fixture-desk-riser')
    const merchantId = await idBySlug(db, 'merchants', 'devmerchant')
    // The API layer rejects non-https URLs with a 400; a row that already
    // exists with one is caught by the validation engine instead. (A
    // different product is used so the duplicate check below stays clean:
    // duplicates are detected per product + merchant + variant.)
    // Stage 04.2: the DAL now ALSO rejects unsafe destinations at write
    // (F-04), so the pre-existing row this test exercises is seeded
    // directly — the only way such a row can exist after the fix. The
    // validation assertion below is unchanged from Stage 04.
    const lampId = await idBySlug(db, 'products', 'dev-fixture-desk-lamp')
    expect(
      await createOffer(db, actor, {
        productId: lampId,
        merchantId,
        destinationUrl: 'http://example.invalid/insecure',
      }),
    ).toEqual({ conflict: 'invalid_destination' })
    const seeded = raw
      .prepare(
        `INSERT INTO offers (product_id, merchant_id, destination_url, licence_status)
         VALUES (?, ?, 'http://example.invalid/insecure', 'restricted') RETURNING id`,
      )
      .get(lampId, merchantId) as { id: number }
    const flagged = await validateOffer(db, seeded.id)
    expect(flagged?.issues.some((i) => i.code === 'invalid_url')).toBe(true)
    const first = await createOffer(db, actor, {
      productId,
      merchantId,
      destinationUrl: 'https://example.invalid/riser',
    })
    expect('id' in first).toBe(true)
    expect(
      await createOffer(db, actor, {
        productId,
        merchantId,
        destinationUrl: 'https://example.invalid/riser',
      }),
    ).toEqual({ conflict: 'duplicate' })
  })

  it('refuses to delete an offer that has price history', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const { items } = await listAdminOffers(db, {})
    const hub = items.find((o) => o.product_slug === 'dev-fixture-usb-hub')
    if (!hub) throw new Error('hub offer missing')
    await db
      .prepare('INSERT INTO price_history (offer_id, price_cents, observed_at, source_id) VALUES (?, ?, ?, ?)')
      .bind(hub.id, 4999, new Date().toISOString(), 'stage04-test')
      .run()
    expect(await deleteOffer(db, actor, hub.id)).toEqual({ ok: false, reason: 'in_use', history: 1 })
    const cable = items.find((o) => o.product_slug === 'dev-fixture-charging-cable')
    if (cable) expect(await deleteOffer(db, actor, cable.id)).toEqual({ ok: true })
  })
})

describe('staging sources (read-only)', () => {
  it('hides payload bodies in lists and reveals them in the detail view', async () => {
    const { db } = freshCatalogDb()
    await db
      .prepare(
        `INSERT INTO source_records (source_id, external_ref, raw_hash, normalised_json, licence_json, validation_status)
         VALUES ('stage04-source', 'ext-1', 'hash-1', '{"name":"Widget"}', '{"basis":"test"}', 'pending')`,
      )
      .run()
    const { items } = await listSources(db, {})
    const listed = items.find((s) => s.source_id === 'stage04-source')
    expect(listed).toBeDefined()
    expect(listed && 'normalised_json' in listed).toBe(false)
    if (!listed) return
    const detail = await getSource(db, listed.id)
    expect(detail?.normalised_json).toBe('{"name":"Widget"}')
    expect(detail?.licence_json).toBe('{"basis":"test"}')
  })
})
